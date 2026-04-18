/**
 * Triggers Apify Playwright scraper runs to collect Mercari sold listing prices
 * for special editions in the database.
 *
 * Usage:
 *   npx tsx scripts/trigger-mercari-scrape.ts              # price all editions missing mercari data
 *   npx tsx scripts/trigger-mercari-scrape.ts --all        # re-price everything
 *   npx tsx scripts/trigger-mercari-scrape.ts --limit=200  # cap at 200 editions
 *
 * Env vars required: APIFY_API_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const APIFY_TOKEN = process.env.APIFY_API_KEY ?? ''

if (!APIFY_TOKEN) { console.error('APIFY_API_KEY env var required'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const BATCH_SIZE = 100

const ARGS = process.argv.slice(2)
const ALL = ARGS.includes('--all')
const LIMIT = (() => {
  const a = ARGS.find(a => a.startsWith('--limit='))
  return a ? parseInt(a.slice(8)) : null
})()

// Scroll to load lazy items, then extract prices from Mercari search results.
// Mercari renders via React — we wait for the item grid to populate.
// Price format on page: "$XX.XX" (sale price shown first when discounted).
const PAGE_FUNCTION = `async function pageFunction(context) {
  const { page, request, log } = context;

  // Scroll to trigger lazy loading
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(4000);

  // Try known Mercari price selectors
  const priceSelectors = [
    '[data-testid="price"]',
    'p[class*="price"]',
    'span[class*="price"]',
    '[class*="Price"]',
  ];

  let selectorFound = null;
  for (const sel of priceSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      selectorFound = sel;
      break;
    } catch (e) {}
  }

  let items = [];

  if (selectorFound) {
    items = await page.evaluate((sel) => {
      const results = [];
      // Try to get item containers first for title+price pairs
      const containers = document.querySelectorAll(
        '[data-testid="search-item-cell"], [class*="ItemCell"], li[class*="item"]'
      );
      if (containers.length > 0) {
        containers.forEach(el => {
          const titleEl = el.querySelector('[data-testid="item-name"], [class*="name"], [class*="title"]');
          const priceEl = el.querySelector(sel);
          const title = titleEl ? titleEl.textContent.trim() : '';
          // On Mercari, the first price shown is the sale/current price
          const priceText = priceEl ? priceEl.textContent.trim() : '';
          if (priceText) results.push({ title, priceText, condition: '' });
        });
      }
      // Fallback: grab all price elements
      if (results.length === 0) {
        document.querySelectorAll(sel).forEach(el => {
          const priceText = el.textContent.trim();
          if (priceText) results.push({ title: '', priceText, condition: '' });
        });
      }
      return results;
    }, selectorFound);
  }

  // Text fallback — regex for dollar amounts in page body
  if (items.length === 0) {
    const bodyText = await page.evaluate(() => document.body.innerText);
    const priceRegex = /\\$[\\d,]+\\.\\d{2}/g;
    let m;
    while ((m = priceRegex.exec(bodyText)) !== null) {
      items.push({ title: '', priceText: m[0], condition: '' });
    }
    log.warning('Used text fallback, found ' + items.length + ' prices for ' + request.userData.editionId);
  }

  log.info('Found ' + items.length + ' items for ' + request.userData.editionId);
  return { editionId: request.userData.editionId, url: request.url, items };
}`

function buildMercariUrl(query: string): string {
  // status=sold_out filters for completed (sold) listings
  // price_min=15 filters out regular used book noise
  return `https://www.mercari.com/search/?keyword=${encodeURIComponent(query)}&status=sold_out&price_min=15`
}

function buildSearchQuery(editionName: string, authorLastName: string): string {
  const clean = editionName
    .replace(/['"()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  // Append "special edition" to steer Mercari toward collector listings
  return `${clean} ${authorLastName} special edition`.trim()
}

async function triggerApifyRun(startUrls: { url: string; userData: { editionId: string } }[]): Promise<string> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~playwright-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls,
        pageFunction: PAGE_FUNCTION,
        proxyConfiguration: { useApifyProxy: true },
        waitUntil: 'domcontentloaded',
        maxConcurrency: 5,
        navigationTimeoutSecs: 60,
        memoryMbytes: 1024,
      }),
    }
  )
  if (!res.ok) throw new Error(`Apify error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.data.id as string
}

async function run() {
  console.log('Fetching editions from database…')

  let query = supabase
    .from('edition')
    .select('id, edition_name, book:book_id ( title, author )')
    .is('price_override', null)

  if (!ALL) query = (query as any).is('mercari_price_low', null)
  if (LIMIT) query = query.limit(LIMIT)

  const { data: editions, error } = await query
  if (error) { console.error('DB error:', error.message); process.exit(1) }
  if (!editions?.length) { console.log('No editions to price.'); return }

  console.log(`Found ${editions.length} editions to price`)

  const urlList = (editions as unknown as { id: string; edition_name: string; book: { title: string; author: string } | null }[])
    .filter(e => e.edition_name && e.book?.author)
    .map(e => {
      const lastName = e.book!.author.split(' ').pop() ?? e.book!.author
      return {
        url: buildMercariUrl(buildSearchQuery(e.edition_name, lastName)),
        userData: { editionId: e.id },
      }
    })

  console.log(`Built ${urlList.length} Mercari search URLs`)

  const batches: typeof urlList[] = []
  for (let i = 0; i < urlList.length; i += BATCH_SIZE) batches.push(urlList.slice(i, i + BATCH_SIZE))

  console.log(`Triggering ${batches.length} Apify run(s)…\n`)

  const runIds: string[] = []
  for (let i = 0; i < batches.length; i++) {
    console.log(`  Batch ${i + 1}/${batches.length} (${batches[i].length} URLs)…`)
    try {
      const runId = await triggerApifyRun(batches[i])
      runIds.push(runId)
      console.log(`  ✓ Run ID: ${runId}`)
      if (i < batches.length - 1) await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error(`  ✗ Batch ${i + 1} failed:`, err)
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ ${runIds.length} run(s) triggered\n`)
  console.log('Run IDs:\n' + JSON.stringify(runIds, null, 2))
  console.log('\nCheck: https://console.apify.com/actors/runs')
  console.log('\nWhen complete, run:')
  console.log(`  npx tsx scripts/update-mercari-prices.ts --runs=${runIds.join(',')}`)
}

run().catch(console.error)

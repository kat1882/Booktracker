/**
 * Triggers Apify Playwright scraper runs to collect eBay sold listing prices
 * for special editions in the database.
 *
 * Usage:
 *   npx tsx scripts/trigger-ebay-scrape.ts              # price all editions missing prices
 *   npx tsx scripts/trigger-ebay-scrape.ts --all        # re-price everything
 *   npx tsx scripts/trigger-ebay-scrape.ts --limit=200  # cap at 200 editions
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

// Scroll + wait to trigger eBay's lazy-loaded results, then extract prices
// with multiple fallback strategies in case class names have changed
const PAGE_FUNCTION = `async function pageFunction(context) {
  const { page, request, log } = context;

  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(3000);

  const priceSelectors = ['.s-item__price', '[class*="s-item__price"]', '.x-price-primary', 'span[itemprop="price"]'];
  let selectorFound = null;
  for (const sel of priceSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      selectorFound = sel;
      break;
    } catch (e) {}
  }

  if (!selectorFound) {
    const bodyText = await page.evaluate(() => document.body.innerText);
    const prices = [];
    const priceRegex = /\\$[\\d,]+\\.\\d{2}/g;
    let m;
    while ((m = priceRegex.exec(bodyText)) !== null) prices.push(m[0]);
    log.warning('Used text fallback, found ' + prices.length + ' prices for ' + request.userData.editionId);
    return { editionId: request.userData.editionId, url: request.url, items: prices.map(p => ({ title: '', priceText: p, condition: '' })) };
  }

  const items = await page.evaluate((sel) => {
    const results = [];
    const containers = document.querySelectorAll('.s-item, [class*="s-item--"], li[id^="item"]');
    if (containers.length > 0) {
      containers.forEach(el => {
        const title = (el.querySelector('.s-item__title, [class*="s-item__title"]') || {}).textContent || '';
        if (!title.trim() || title.trim() === 'Shop on eBay') return;
        const priceEl = el.querySelector(sel);
        const priceText = priceEl ? priceEl.textContent.trim() : '';
        if (!priceText) return;
        const condition = (el.querySelector('.SECONDARY_INFO, [class*="SECONDARY_INFO"]') || {}).textContent || '';
        results.push({ title: title.trim(), priceText, condition });
      });
    }
    if (results.length === 0) {
      document.querySelectorAll(sel).forEach(el => {
        const priceText = el.textContent.trim();
        if (priceText) results.push({ title: '', priceText, condition: '' });
      });
    }
    return results;
  }, selectorFound);

  log.info('Found ' + items.length + ' items for ' + request.userData.editionId);
  return { editionId: request.userData.editionId, url: request.url, items };
}`

function buildEbayUrl(query: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Complete=1&LH_Sold=1&_ipg=60`
}

function buildSearchQuery(bookTitle: string, sourceName: string): string {
  const cleanTitle = bookTitle.replace(/^(the|a|an)\s+/i, '').slice(0, 50).trim()
  return `${cleanTitle} ${sourceName}`
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
        navigationTimeoutSecs: 45,
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
    .select('id, edition_name, book:book_id ( title ), source:source_id ( name )')
    .not('source_id', 'is', null)

  if (!ALL) query = query.is('estimated_value', null)
  if (LIMIT) query = query.limit(LIMIT)

  const { data: editions, error } = await query
  if (error) { console.error('DB error:', error.message); process.exit(1) }
  if (!editions?.length) { console.log('No editions to price.'); return }

  console.log(`Found ${editions.length} editions to price`)

  const urlList = (editions as unknown as { id: string; edition_name: string; book: { title: string } | null; source: { name: string } | null }[])
    .filter(e => e.book?.title && e.source?.name)
    .map(e => ({
      url: buildEbayUrl(buildSearchQuery(e.book!.title, e.source!.name)),
      userData: { editionId: e.id },
    }))

  console.log(`Built ${urlList.length} eBay search URLs`)

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
}

run().catch(console.error)

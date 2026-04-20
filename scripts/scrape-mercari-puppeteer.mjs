/**
 * Mercari sold-listing price scraper using puppeteer-extra + stealth plugin.
 * Free alternative to Firecrawl — runs locally using a real browser.
 *
 * Usage:
 *   node scripts/scrape-mercari-puppeteer.mjs              # all unpriced sub-box editions
 *   node scripts/scrape-mercari-puppeteer.mjs --all        # re-scrape everything
 *   node scripts/scrape-mercari-puppeteer.mjs --limit=100
 *   node scripts/scrape-mercari-puppeteer.mjs --dry-run
 */

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

puppeteer.use(StealthPlugin())

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ARGS = process.argv.slice(2)
const ALL = ARGS.includes('--all')
const DRY_RUN = ARGS.includes('--dry-run')
const LIMIT = (() => {
  const a = ARGS.find(a => a.startsWith('--limit='))
  return a ? parseInt(a.slice(8)) : 100
})()

const MIN_SALES = 2
const MIN_PRICE = 15
const MAX_PRICE = 1500
const PAGE_WAIT_MS = 6000

function buildMercariUrl(bookTitle, author, sourceName) {
  const rawLastName = (author ?? '').split(' ').pop() ?? ''
  const JUNK_NAMES = new Set(['author', 'unknown', 'various', 'n/a', ''])
  const lastName = JUNK_NAMES.has(rawLastName.toLowerCase()) ? '' : rawLastName

  // Strip trailing standalone "Box" or "Book Box" (space-separated) but not if it's part of the name like "Illumicrate"
  const shortSource = (sourceName ?? '')
    .replace(/\s+(book\s+box|book\s+club)\s*$/i, '')
    .replace(/\s+box\s*$/i, '')
    .trim()

  const query = [
    bookTitle?.slice(0, 60).trim(),
    shortSource,
    lastName,
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  return `https://www.mercari.com/search/?keyword=${encodeURIComponent(query)}&status=sold_out`
}

function parsePrice(text) {
  const cleaned = text.replace(/,/g, '').trim()
  // Two prices jammed together like "$166.36$215.00" — require literal $ between them
  const twoMatch = cleaned.match(/\$?([\d.]+)\$([\d.]+)/)
  if (twoMatch) {
    const a = parseFloat(twoMatch[1])
    const b = parseFloat(twoMatch[2])
    const lower = Math.min(a, b)
    return lower >= MIN_PRICE && lower <= MAX_PRICE ? lower : null
  }
  const match = cleaned.match(/\$?([\d]+\.[\d]{2})/)
  const val = match ? parseFloat(match[1]) : null
  return val && val >= MIN_PRICE && val <= MAX_PRICE ? val : null
}

function extractPrices(text) {
  const prices = []
  const regex = /\$[\d,]+\.[\d]{2}/g
  let m
  while ((m = regex.exec(text)) !== null) {
    const p = parsePrice(m[0])
    if (p !== null) prices.push(p)
  }
  return prices
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function scrapeMercari(browser, url) {
  const page = await browser.newPage()
  try {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, PAGE_WAIT_MS))

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, 1200))
    await new Promise(r => setTimeout(r, 1500))

    const text = await page.evaluate(() => document.body.innerText)
    return text
  } finally {
    await page.close()
  }
}

async function run() {
  console.log('Fetching subscription box editions from database…')

  const { data: editions, error } = await supabase
    .from('edition')
    .select('id, edition_name, book:book_id ( title, author ), source:source_id ( name, type )')
    .is('price_override', null)
    .eq('source.type', 'subscription_box')
    .limit(LIMIT * 5)

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  const subBoxEditions = (editions ?? []).filter(e => e.source?.type === 'subscription_box')
  const toPrice = ALL
    ? subBoxEditions
    : subBoxEditions.filter(e => !e.mercari_price_low)

  const batch = toPrice.slice(0, LIMIT)

  console.log(`Found ${batch.length} editions to price (${subBoxEditions.length} total sub-box editions)\n`)

  if (DRY_RUN) {
    for (const ed of batch.slice(0, 10)) {
      const url = buildMercariUrl(ed.book?.title, ed.book?.author, ed.source?.name)
      console.log(`  [${ed.source?.name}] "${ed.edition_name}" → ${url}`)
    }
    return
  }

  console.log('Launching browser…')
  const browser = await puppeteer.launch({ headless: true })

  let priced = 0, noData = 0, errors = 0

  try {
    for (let i = 0; i < batch.length; i++) {
      const ed = batch[i]
      const url = buildMercariUrl(ed.book?.title, ed.book?.author, ed.source?.name)

      process.stdout.write(`  [${i + 1}/${batch.length}] ${ed.edition_name.slice(0, 50)}… `)

      try {
        const text = await scrapeMercari(browser, url)
        const prices = extractPrices(text)

        if (prices.length < MIN_SALES) {
          console.log(`${prices.length} prices (need ${MIN_SALES})`)
          noData++
        } else {
          const med = median(prices)
          const low = Math.min(...prices)
          const high = Math.max(...prices)

          const { data: existing } = await supabase
            .from('edition')
            .select('ebay_price_low')
            .eq('id', ed.id)
            .maybeSingle()

          const updatePayload = {
            mercari_price_low: Math.round(low * 100) / 100,
            mercari_price_high: Math.round(high * 100) / 100,
            mercari_sold_count: prices.length,
            mercari_updated_at: new Date().toISOString(),
          }

          if (!existing?.ebay_price_low) {
            updatePayload.estimated_value = Math.round(med * 100) / 100
            updatePayload.value_updated_at = new Date().toISOString()
          }

          const { error: updateErr } = await supabase
            .from('edition').update(updatePayload).eq('id', ed.id)

          if (updateErr) {
            console.log(`DB error: ${updateErr.message}`)
            errors++
          } else {
            console.log(`$${med.toFixed(0)} median (${prices.length} sales, $${low.toFixed(0)}–$${high.toFixed(0)})`)
            priced++
          }
        }
      } catch (err) {
        console.log(`error: ${err.message.slice(0, 80)}`)
        errors++
        // Relaunch browser if it crashed
        try { await browser.close() } catch {}
        Object.assign(browser, await puppeteer.launch({ headless: true }))
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ DONE: ${priced} priced, ${noData} insufficient data, ${errors} errors`)
}

run().catch(console.error)

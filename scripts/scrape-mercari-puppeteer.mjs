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
const OFFSET = (() => {
  const a = ARGS.find(a => a.startsWith('--offset='))
  return a ? parseInt(a.slice(9)) : 0
})()
const EDITION_IDS = (() => {
  const a = ARGS.find(a => a.startsWith('--edition-ids='))
  return a ? a.slice(14).split(',').filter(Boolean) : []
})()

const MIN_SALES = 2
const MIN_PRICE = 15
const MAX_PRICE = 1500
const PAGE_WAIT_MS = 6000
const MAX_RECENT_SALES = 10

// Generic words to skip when scanning edition names for brand keywords
const SKIP_WORDS = new Set([
  'edition', 'exclusive', 'special', 'limited', 'signed', 'standard',
  'box', 'book', 'club', 'crate', 'series', 'collection', 'bundle',
  'january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december',
  '2022', '2023', '2024', '2025', '2026', '2027',
  'by', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'for', 'with',
  'call', 'me', 'maybe', // common phrase words that aren't brand names
])

function extractEditionBrand(editionName, sourceName, bookTitle, author) {
  if (!editionName) return null

  // Build covered set from source, title, and all author name parts
  const authorParts = (author ?? '').split(/[\s.]+/).map(w => w.toLowerCase()).filter(Boolean)
  const covered = new Set([
    ...(sourceName ?? '').toLowerCase().split(/\W+/),
    ...(bookTitle ?? '').toLowerCase().split(/\W+/),
    ...authorParts,
  ])

  function scanForBrand(text) {
    const words = text.split(/\s+/)
    for (const word of words) {
      const lower = word.toLowerCase().replace(/[^a-z0-9&]/g, '')
      if (!lower || lower.length < 3) continue
      if (SKIP_WORDS.has(lower)) continue
      if (covered.has(lower)) continue
      if (word[0] === word[0].toUpperCase() && /[A-Z]/.test(word[0])) {
        return word.replace(/[^a-zA-Z0-9&]/g, '')
      }
    }
    return null
  }

  // If the edition name starts with the source name, the source is already the key term
  const shortSrc = (sourceName ?? '').replace(/\s+(book\s+box|book\s+club|box)\s*$/i, '').trim()
  if (shortSrc && editionName.toLowerCase().startsWith(shortSrc.toLowerCase())) return null

  // Priority 1: scan text inside parentheses — brand names like "(Afterlight Exclusive)" live here
  const parenMatch = editionName.match(/\(([^)]+)\)/)
  if (parenMatch) {
    const brand = scanForBrand(parenMatch[1].replace(/['"''""\·]/g, ' '))
    if (brand) return brand
  }

  // Priority 2: scan the full edition name (handles "OwlCrate March 2025 Edition")
  return scanForBrand(editionName.replace(/['"''""\(\)·]/g, ' '))
}

// Junk author values that mean "we don't know the author"
const JUNK_AUTHOR_PATTERNS = [
  /^unknown$/i,
  /^various$/i,
  /^n\/a$/i,
  /^the author$/i,
  /^a .{5,} voice$/i,    // "a stunning new voice", "a powerful new voice"
  /^an? .{5,} debut$/i,  // "a breathtaking debut"
  /^\s*$/,
  /^[a-z]/,              // real names start with a capital letter
]

function resolveAuthorLastName(author, editionName) {
  const isJunk = !author || JUNK_AUTHOR_PATTERNS.some(re => re.test(author.trim()))
  if (!isJunk) {
    const last = author.trim().split(/\s+/).pop() ?? ''
    if (last.length > 1) return last
  }
  // Fall back: parse "by Firstname Lastname" from the edition name.
  // No /i flag — only match properly capitalised words so we don't grab
  // trailing lowercase words like "full box" or "book only".
  const byMatch = editionName?.match(/\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z.'-]+)*)/)
  if (byMatch) {
    const parts = byMatch[1].trim().split(/\s+/)
    return parts[parts.length - 1]
  }
  return ''
}

function buildMercariUrl(bookTitle, author, sourceName, editionName) {
  const lastName = resolveAuthorLastName(author, editionName)

  // Prefer a brand keyword pulled from the edition name (e.g. "Afterlight") over
  // the source name when they differ — edition name is more specific on Mercari
  const editionBrand = extractEditionBrand(editionName, sourceName, bookTitle, author)

  const shortSource = editionBrand ?? (sourceName ?? '')
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

    // Extract prices from individual listing elements in DOM order (most recent first on sold page).
    // Walk all text nodes so we're immune to Mercari's dynamic class names.
    const pricesInOrder = await page.evaluate(() => {
      const priceRe = /^\$[\d,]+\.\d{2}$/

      // Strategy 1: find item cards by looking for a repeated anchor > img + price sibling pattern
      // Each sold listing on Mercari is typically an <a> tag wrapping a card with an image and price
      const cards = Array.from(document.querySelectorAll('a[href*="/item/"]'))
      if (cards.length >= 2) {
        const results = []
        for (const card of cards) {
          // Walk all text nodes within this card looking for a price
          const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
          let node
          while ((node = walker.nextNode())) {
            const t = (node.textContent ?? '').trim()
            if (priceRe.test(t)) { results.push(t); break }
          }
        }
        if (results.length >= 2) return results
      }

      // Strategy 2: walk ALL text nodes in document order, collect prices — preserves recency
      const allPrices = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        const t = (node.textContent ?? '').trim()
        if (priceRe.test(t)) allPrices.push(t)
      }
      return allPrices
    })

    return pricesInOrder
  } finally {
    await page.close()
  }
}

async function run() {
  console.log('Fetching subscription box editions from database…')

  // Fetch sub-box source IDs first so we can do a proper row-level filter
  const { data: sources, error: srcErr } = await supabase
    .from('source')
    .select('id')
    .eq('type', 'subscription_box')

  if (srcErr) { console.error('Source fetch error:', srcErr.message); process.exit(1) }
  const sourceIds = (sources ?? []).map(s => s.id)

  let editions, error
  if (EDITION_IDS.length > 0) {
    // Targeted scrape by ID — bypass all other filters
    ;({ data: editions, error } = await supabase
      .from('edition')
      .select('id, edition_name, mercari_price_low, book:book_id ( title, author ), source:source_id ( name, type )')
      .in('id', EDITION_IDS))
  } else {
    ;({ data: editions, error } = await supabase
      .from('edition')
      .select('id, edition_name, mercari_price_low, book:book_id ( title, author ), source:source_id ( name, type )')
      .is('price_override', null)
      .in('source_id', sourceIds)
      .range(OFFSET, OFFSET + LIMIT * 5 - 1))
  }

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  const subBoxEditions = editions ?? []
  const toPrice = ALL || EDITION_IDS.length > 0
    ? subBoxEditions
    : subBoxEditions.filter(e => !e.mercari_price_low)

  const batch = toPrice.slice(0, LIMIT)

  console.log(`Found ${batch.length} editions to price (${subBoxEditions.length} total sub-box editions)\n`)

  if (DRY_RUN) {
    for (const ed of batch.slice(0, 10)) {
      const url = buildMercariUrl(ed.book?.title, ed.book?.author, ed.source?.name, ed.edition_name)
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
      const url = buildMercariUrl(ed.book?.title, ed.book?.author, ed.source?.name, ed.edition_name)

      process.stdout.write(`  [${i + 1}/${batch.length}] ${ed.edition_name.slice(0, 50)}… `)

      try {
        const rawPrices = await scrapeMercari(browser, url)
        // rawPrices is an ordered array (most recent first) — parse and take up to MAX_RECENT_SALES
        const allParsed = rawPrices.map(t => parsePrice(t)).filter(p => p !== null)
        const prices = allParsed.slice(0, MAX_RECENT_SALES)

        if (prices.length < MIN_SALES) {
          console.log(`${prices.length} prices (need ${MIN_SALES})`)
          noData++
        } else {
          const med = median(prices)
          const low = Math.min(...prices)
          const high = Math.max(...prices)

          const updatePayload = {
            mercari_price_low: Math.round(low * 100) / 100,
            mercari_price_high: Math.round(high * 100) / 100,
            mercari_median: Math.round(med * 100) / 100,
            mercari_sold_count: prices.length,
            mercari_updated_at: new Date().toISOString(),
            estimated_value: Math.round(med * 100) / 100,
            value_updated_at: new Date().toISOString(),
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

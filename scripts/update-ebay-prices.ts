/**
 * Pulls eBay sold listing prices for special editions and stores them in the DB.
 * Run: npx tsx scripts/update-ebay-prices.ts
 *
 * Requires EBAY_APP_ID in .env.local
 * Get one free at: https://developer.ebay.com → My Account → Application Access Keys
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Load from env — set EBAY_APP_ID in .env.local
const EBAY_APP_ID = process.env.EBAY_APP_ID
if (!EBAY_APP_ID) {
  console.error('Missing EBAY_APP_ID — add it to .env.local')
  process.exit(1)
}

interface EbayItem {
  sellingStatus: { convertedCurrentPrice: { __value__: string }[] }[]
}

async function getEbaySoldPrice(query: string): Promise<{
  avg: number | null
  low: number | null
  high: number | null
  count: number
}> {
  try {
    const url = new URL('https://svcs.ebay.com/services/search/FindingService/v1')
    url.searchParams.set('OPERATION-NAME', 'findCompletedItems')
    url.searchParams.set('SERVICE-VERSION', '1.0.0')
    url.searchParams.set('SECURITY-APPNAME', EBAY_APP_ID!)
    url.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON')
    url.searchParams.set('keywords', query)
    url.searchParams.set('categoryId', '267') // Books category
    url.searchParams.set('itemFilter(0).name', 'SoldItemsOnly')
    url.searchParams.set('itemFilter(0).value', 'true')
    url.searchParams.set('itemFilter(1).name', 'ListingType')
    url.searchParams.set('itemFilter(1).value', 'AuctionWithBIN')
    url.searchParams.set('itemFilter(2).name', 'ListingType(1)')
    url.searchParams.set('itemFilter(2).value', 'FixedPrice')
    url.searchParams.set('sortOrder', 'EndTimeSoonest')
    url.searchParams.set('paginationInput.entriesPerPage', '20')

    const res = await fetch(url.toString())
    const data = await res.json()

    const searchResult = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]
    const items: EbayItem[] = searchResult?.item ?? []

    if (!items.length) return { avg: null, low: null, high: null, count: 0 }

    const prices = items
      .map(item => parseFloat(item.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.__value__ ?? '0'))
      .filter(p => p > 0)

    if (!prices.length) return { avg: null, low: null, high: null, count: 0 }

    prices.sort((a, b) => a - b)
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    return {
      avg: Math.round(avg * 100) / 100,
      low: prices[0],
      high: prices[prices.length - 1],
      count: prices.length,
    }
  } catch (err) {
    console.error('eBay API error:', err)
    return { avg: null, low: null, high: null, count: 0 }
  }
}

function buildSearchQuery(editionName: string, bookTitle: string, sourceName: string): string {
  // Use book title + source for more accurate results
  // e.g. "A Court of Thorns and Roses Illumicrate"
  const cleanTitle = bookTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const cleanSource = sourceName.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  return `${cleanTitle} ${cleanSource} special edition`.trim()
}

async function run() {
  // Get editions that haven't been priced yet or were priced >7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: editions, error } = await supabase
    .from('edition')
    .select('id, edition_name, book:book_id(title), source:source_id(name)')
    .or(`value_updated_at.is.null,value_updated_at.lt.${sevenDaysAgo}`)
    .not('source_id', 'is', null)
    .limit(200) // process in batches

  if (error) { console.error(error); process.exit(1) }
  console.log(`Processing ${editions?.length ?? 0} editions...\n`)

  let updated = 0
  let notFound = 0

  for (const ed of editions ?? []) {
    const book = ed.book as { title: string } | null
    const source = ed.source as { name: string } | null
    if (!book || !source) { notFound++; continue }

    const query = buildSearchQuery(ed.edition_name, book.title, source.name)
    const { avg, low, high, count } = await getEbaySoldPrice(query)

    await supabase.from('edition').update({
      estimated_value: avg,
      ebay_price_low: low,
      ebay_price_high: high,
      ebay_sold_count: count,
      value_updated_at: new Date().toISOString(),
    }).eq('id', ed.id)

    if (avg) {
      console.log(`  ✓ ${book.title} (${source.name}) → £${avg} (${count} sales, £${low}–£${high})`)
      updated++
    } else {
      console.log(`  ~ ${book.title} — no eBay sales found`)
      notFound++
    }

    // Rate limit: eBay Finding API allows 5000 calls/day, be polite
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone. ${updated} priced, ${notFound} no data found.`)
}

run().catch(console.error)

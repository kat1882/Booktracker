/**
 * Fetches results from completed Apify eBay scraper runs and updates
 * edition estimated_value prices in the database.
 *
 * The edition_price_history trigger fires automatically on each update,
 * so price history is logged for free.
 *
 * Workflow:
 *   1. Run trigger-ebay-scrape.ts — it prints run IDs
 *   2. Wait 10–30 min for runs to complete (check console.apify.com)
 *   3. Paste run IDs into RUN_IDS below
 *   4. Run: npx tsx scripts/update-ebay-prices.ts
 *
 * Env vars required: APIFY_TOKEN, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const APIFY_TOKEN = process.env.APIFY_API_KEY ?? ''

if (!APIFY_TOKEN) { console.error('APIFY_API_KEY env var required'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Accept run IDs from CLI args (--runs=id1,id2) or fall back to hardcoded list
const cliRuns = process.argv.find(a => a.startsWith('--runs='))?.slice(7).split(',').filter(Boolean) ?? []

// ─── PASTE YOUR RUN IDs HERE after trigger-ebay-scrape.ts finishes ───
const HARDCODED_RUN_IDS: string[] = [
  'fcnf0bnBaf7Sgg2G8', // test: 10 editions
  'CZumaOQhJhc24A0nl', // batch 1: 100 editions
  'arwvt5BFzbchaCTFn', // batch 2: 100 editions
  'nKMaFT8Sw9oEnizGn', // batch 3: 100 editions
  'ngQnVtO4Gg2YZ1xzJ', // batch 4: 100 editions
]
// ─────────────────────────────────────────────────────────────────────

const RUN_IDS = cliRuns.length > 0 ? cliRuns : HARDCODED_RUN_IDS

// Minimum sold results required before we trust the price
const MIN_SALES = 2
// Only use the most recent N sales — recent prices reflect current market better
const MAX_RECENT_SALES = 10

interface EbayItem {
  title: string
  priceText: string
  condition?: string
}

interface DatasetItem {
  editionId: string
  url: string
  items: EbayItem[]
}

function parsePrice(text: string): number | null {
  if (!text) return null

  // Strip currency symbols and country prefixes: US $, C $, AU $, £, €
  const cleaned = text
    .replace(/(?:US|C|AU|CA|NZ)\s*\$/gi, '')
    .replace(/[£€$]/g, '')
    .replace(/,/g, '')
    .trim()

  // Range like "10.00 to 20.00" — take the midpoint
  const rangeMatch = cleaned.match(/([\d.]+)\s+to\s+([\d.]+)/i)
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1])
    const hi = parseFloat(rangeMatch[2])
    return isNaN(lo) || isNaN(hi) ? null : (lo + hi) / 2
  }

  const match = cleaned.match(/\d+\.\d{2}/)
  const val = match ? parseFloat(match[0]) : null
  return val && val > 0.5 && val < 5000 ? val : null
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}


async function fetchDataset(runId: string): Promise<DatasetItem[]> {
  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=2000`
  )
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching run ${runId}`)
  const raw = await res.json()
  return (raw as DatasetItem[]).filter(item => item?.editionId && Array.isArray(item.items))
}

async function run() {
  if (RUN_IDS.length === 0) {
    console.error(
      'No RUN_IDS specified.\n' +
      '1. Run: npx tsx scripts/trigger-ebay-scrape.ts\n' +
      '2. Wait for runs to complete at console.apify.com\n' +
      '3. Paste the printed run IDs into RUN_IDS in this file'
    )
    process.exit(1)
  }

  console.log(`Fetching results from ${RUN_IDS.length} Apify run(s)…\n`)

  const allItems: DatasetItem[] = []
  for (const runId of RUN_IDS) {
    try {
      console.log(`  Fetching run ${runId}…`)
      const items = await fetchDataset(runId)
      console.log(`  ✓ ${items.length} pages scraped`)
      allItems.push(...items)
    } catch (err) {
      console.error(`  ✗ Run ${runId} failed:`, (err as Error).message)
    }
  }

  console.log(`\nTotal edition pages: ${allItems.length}`)
  console.log('Processing prices…\n')

  let updated = 0
  let skipped = 0
  let noData = 0

  for (const page of allItems) {
    const { editionId, items } = page

    if (!editionId) { noData++; continue }

    // Items are in page order (most recent first on eBay sold listings) — take only the latest N
    const prices = (items ?? [])
      .slice(0, MAX_RECENT_SALES)
      .map(item => parsePrice(item.priceText))
      .filter((p): p is number => p !== null && p >= 3 && p <= 500)

    if (prices.length < MIN_SALES) {
      noData++
      continue
    }

    const medianPrice = median(prices)
    const low = Math.min(...prices)
    const high = Math.max(...prices)

    // Only use eBay as estimated_value when no Mercari data exists — Mercari is primary
    const { data: existing } = await supabase
      .from('edition')
      .select('mercari_median')
      .eq('id', editionId)
      .single()

    const ebayMed = Math.round(medianPrice * 100) / 100
    const hasMercari = existing?.mercari_median != null

    const updateFields: Record<string, unknown> = {
      ebay_median: ebayMed,
      ebay_price_low: Math.round(low * 100) / 100,
      ebay_price_high: Math.round(high * 100) / 100,
      ebay_sold_count: prices.length,
    }
    if (!hasMercari) {
      updateFields.estimated_value = ebayMed
      updateFields.value_updated_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('edition')
      .update(updateFields)
      .eq('id', editionId)

    if (error) {
      console.error(`  ✗ DB error for ${editionId}: ${error.message}`)
      skipped++
      continue
    }

    console.log(
      `  ✓ ${editionId}: $${medianPrice.toFixed(2)} median` +
      ` (${prices.length} sales, $${low.toFixed(2)}–$${high.toFixed(2)})`
    )
    updated++

    await new Promise(r => setTimeout(r, 60))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ DONE: ${updated} priced, ${noData} no/insufficient data, ${skipped} DB errors`)
}

run().catch(console.error)

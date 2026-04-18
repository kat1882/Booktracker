/**
 * Fetches results from completed Apify Mercari scraper runs and updates
 * edition mercari price columns in the database.
 * Also updates estimated_value for editions that have no eBay data.
 *
 * Workflow:
 *   1. Run trigger-mercari-scrape.ts — it prints run IDs
 *   2. Wait 15–30 min for runs to complete (check console.apify.com)
 *   3. Run: npx tsx scripts/update-mercari-prices.ts --runs=ID1,ID2,...
 *
 * Env vars required: APIFY_API_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const APIFY_TOKEN = process.env.APIFY_API_KEY ?? ''

if (!APIFY_TOKEN) { console.error('APIFY_API_KEY env var required'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const cliRuns = process.argv.find(a => a.startsWith('--runs='))?.slice(7).split(',').filter(Boolean) ?? []

// ─── PASTE YOUR RUN IDs HERE after trigger-mercari-scrape.ts finishes ───
const HARDCODED_RUN_IDS: string[] = []
// ─────────────────────────────────────────────────────────────────────────

const RUN_IDS = cliRuns.length > 0 ? cliRuns : HARDCODED_RUN_IDS

// Minimum sold results required before we trust the price
const MIN_SALES = 2

interface MercariItem {
  title: string
  priceText: string
  condition?: string
}

interface DatasetItem {
  editionId: string
  url: string
  items: MercariItem[]
}

function parsePrice(text: string): number | null {
  if (!text) return null

  // Mercari shows discounted prices as "$XX.XX$YY.YY" — take first (lower = sale price)
  // Strip currency symbols
  const cleaned = text
    .replace(/[£€]/g, '')
    .replace(/,/g, '')
    .trim()

  // Two prices jammed together: "$45.00$60.00" — take first
  const twoMatch = cleaned.match(/^\$?([\d.]+)\$?([\d.]+)$/)
  if (twoMatch) {
    const a = parseFloat(twoMatch[1])
    const b = parseFloat(twoMatch[2])
    const lower = Math.min(a, b)
    return lower > 0.5 && lower < 5000 ? lower : null
  }

  // Single price
  const match = cleaned.match(/\$?([\d]+\.[\d]{2})/)
  const val = match ? parseFloat(match[1]) : null
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
      '1. Run: npx tsx scripts/trigger-mercari-scrape.ts\n' +
      '2. Wait for runs to complete at console.apify.com\n' +
      '3. Pass run IDs: npx tsx scripts/update-mercari-prices.ts --runs=ID1,ID2'
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

    const prices = (items ?? [])
      .map(item => parsePrice(item.priceText))
      .filter((p): p is number => p !== null && p >= 3 && p <= 1000)

    if (prices.length < MIN_SALES) {
      noData++
      continue
    }

    const medianPrice = median(prices)
    const low = Math.min(...prices)
    const high = Math.max(...prices)

    // Fetch current edition to check if it already has eBay data
    const { data: existing } = await supabase
      .from('edition')
      .select('estimated_value, ebay_price_low')
      .eq('id', editionId)
      .maybeSingle()

    const hasEbayData = existing?.ebay_price_low != null

    const updatePayload: Record<string, unknown> = {
      mercari_price_low: Math.round(low * 100) / 100,
      mercari_price_high: Math.round(high * 100) / 100,
      mercari_sold_count: prices.length,
      mercari_updated_at: new Date().toISOString(),
    }

    // Only update estimated_value if there's no eBay data already
    if (!hasEbayData) {
      updatePayload.estimated_value = Math.round(medianPrice * 100) / 100
      updatePayload.value_updated_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('edition')
      .update(updatePayload)
      .eq('id', editionId)

    if (error) {
      console.error(`  ✗ DB error for ${editionId}: ${error.message}`)
      skipped++
      continue
    }

    const ebayNote = hasEbayData ? ' (eBay price kept)' : ' → estimated_value updated'
    console.log(
      `  ✓ ${editionId}: $${medianPrice.toFixed(2)} median` +
      ` (${prices.length} sales, $${low.toFixed(2)}–$${high.toFixed(2)})${ebayNote}`
    )
    updated++

    await new Promise(r => setTimeout(r, 60))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ DONE: ${updated} priced, ${noData} no/insufficient data, ${skipped} DB errors`)
}

run().catch(console.error)

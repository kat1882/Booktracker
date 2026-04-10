/**
 * Reads FairyLoot scrape results from Apify and upserts editions into the DB.
 *
 * Usage:
 *   APIFY_API_KEY=your_key npx tsx scripts/process-fairyloot-scrape.ts --runs=RUN_ID1,RUN_ID2
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const APIFY_TOKEN = process.env.APIFY_API_KEY ?? ''

if (!APIFY_TOKEN) { console.error('APIFY_API_KEY env var required'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const cliRuns = process.argv.find(a => a.startsWith('--runs='))?.slice(7).split(',').filter(Boolean) ?? []
if (!cliRuns.length) { console.error('--runs=RUN_ID required'); process.exit(1) }

interface BoxResult {
  editionName: string
  bookTitle: string | null
  author: string | null
  coverImage: string
  releaseMonth: string | null
  price: number | null
  features: string[]
  descriptionSnippet: string
  productUrl: string
}

interface DatasetItem {
  category: string
  categoryUrl: string
  boxes: BoxResult[]
  error?: string
}

async function fetchDataset(runId: string): Promise<DatasetItem[]> {
  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=1000`
  )
  if (!res.ok) throw new Error(`Apify dataset error: ${res.status}`)
  return res.json()
}

function normaliseTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

async function findOrCreateBook(title: string, author: string | null): Promise<string | null> {
  // Try exact ilike match first
  const { data: exact } = await supabase
    .from('book')
    .select('id')
    .ilike('title', title.trim())
    .limit(1)
    .maybeSingle()
  if (exact) return exact.id

  // Try normalised match (strip punctuation differences)
  const norm = normaliseTitle(title)
  const { data: allBooks } = await supabase
    .from('book')
    .select('id, title')
    .ilike('title', `%${title.slice(0, 20).trim()}%`)
    .limit(20)
  if (allBooks) {
    for (const b of allBooks) {
      if (normaliseTitle(b.title) === norm) return b.id
    }
  }

  // Create new book record
  const { data: newBook, error } = await supabase
    .from('book')
    .insert({ title: title.trim(), author: author ?? 'Unknown' })
    .select('id')
    .single()
  if (error) { console.error('  Failed to create book:', error.message); return null }
  return newBook.id
}

async function run() {
  // Ensure FairyLoot source exists
  let { data: source } = await supabase.from('source').select('id').ilike('name', 'FairyLoot').maybeSingle()
  if (!source) {
    const { data: newSource, error } = await supabase
      .from('source')
      .insert({ name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com', country: 'UK' })
      .select('id')
      .single()
    if (error) { console.error('Failed to create source:', error.message); process.exit(1) }
    source = newSource
    console.log('Created FairyLoot source')
  }
  const sourceId = source!.id
  console.log(`FairyLoot source ID: ${sourceId}\n`)

  let totalBoxes = 0
  let added = 0
  let skipped = 0
  let failed = 0

  for (const runId of cliRuns) {
    console.log(`Fetching dataset for run: ${runId}`)
    const items = await fetchDataset(runId)
    console.log(`  ${items.length} category result(s)\n`)

    for (const item of items) {
      if (item.error) {
        console.log(`⚠️  ${item.category}: ${item.error}`)
        continue
      }

      console.log(`📦 ${item.category} — ${item.boxes?.length ?? 0} boxes`)

      for (const box of (item.boxes ?? [])) {
        totalBoxes++

        // We need at minimum an edition name
        if (!box.editionName) {
          console.log(`  ✗ No edition name, skipping`)
          failed++
          continue
        }

        // Determine book title: prefer explicit bookTitle, fall back to editionName
        const rawBookTitle = box.bookTitle || box.editionName
        const bookTitle = rawBookTitle
          .replace(/\s*[-–—]\s*fairyloot.*$/i, '')
          .replace(/\s*\(fairyloot.*?\)/i, '')
          .replace(/\s*fairyloot\s*(exclusive|edition|past box)?/i, '')
          .trim()

        if (!bookTitle) {
          console.log(`  ✗ Could not determine book title for: ${box.editionName}`)
          failed++
          continue
        }

        // Find or create book
        const bookId = await findOrCreateBook(bookTitle, box.author)
        if (!bookId) {
          failed++
          continue
        }

        // Skip duplicates
        const { data: existing } = await supabase
          .from('edition')
          .select('id')
          .eq('book_id', bookId)
          .eq('source_id', sourceId)
          .ilike('edition_name', box.editionName)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        // Build notes from features + description snippet
        const notes = [
          box.features.length ? `Features: ${box.features.join(', ')}` : null,
          box.descriptionSnippet ? box.descriptionSnippet.slice(0, 400) : null,
        ].filter(Boolean).join('\n\n') || null

        const { error: insertErr } = await supabase.from('edition').insert({
          book_id: bookId,
          source_id: sourceId,
          edition_name: box.editionName,
          edition_type: 'subscription_box',
          cover_image: box.coverImage || null,
          original_retail_price: box.price || null,
          release_month: box.releaseMonth || null,
          notes,
        })

        if (insertErr) {
          console.log(`  ✗ Insert failed for "${box.editionName}": ${insertErr.message}`)
          failed++
        } else {
          console.log(`  ✓ ${bookTitle}${box.author ? ` (${box.author})` : ''}${box.releaseMonth ? ` — ${box.releaseMonth}` : ''}`)
          added++
        }

        await new Promise(r => setTimeout(r, 80))
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Total boxes seen: ${totalBoxes}`)
  console.log(`✅ Added: ${added}`)
  console.log(`⏭️  Skipped (duplicate): ${skipped}`)
  console.log(`✗  Failed: ${failed}`)
}

run().catch(console.error)

/**
 * Seed special editions discovered via Half Price Books (HPB) resale listings.
 * HPB resells subscription box exclusives, so their search results are a great
 * source for discovering which special editions exist.
 *
 * Run with the Apify dataset IDs from HPB scraper runs:
 *   npx tsx scripts/seed-hpb.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const APIFY_TOKEN = process.env.APIFY_TOKEN ?? ''

// Run IDs from successful Apify scrapes — add new run IDs here as we do more scrapes
const RUN_IDS = [
  'kOytTiQ0xIn3wWe2H', // OwlCrate, FairyLoot, Illumicrate, Bookish Box, Once Upon, Signed editions
  'UC4ZInyRjVnF7GqLz', // OwlCrate Jr, additional Bookish Box, LitJoy, FaeCrate searches
  'SaRG4gDfnxgNoi5Az', // LitJoy, FaeCrate, additional OwlCrate/Illumicrate pages
  'pEeGEjN9uBZKdwyLz', // More FairyLoot, OwlCrate 2022/2023, signed editions
  'JzJefnckrMLcSBC1d', // Bookish Box 2022/2023, Illumicrate 2021
]

// Maps keywords found in HPB titles to canonical source names + metadata
const SOURCE_MAP: { pattern: RegExp; name: string; type: string; website: string; country: string }[] = [
  { pattern: /owlcrate\s*jr/i, name: 'OwlCrate Jr.', type: 'subscription_box', website: 'https://www.owlcrate.com/owlcrate-jr', country: 'US' },
  { pattern: /owlcrate/i, name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com', country: 'US' },
  { pattern: /illumicrate/i, name: 'Illumicrate', type: 'subscription_box', website: 'https://www.illumicrate.com', country: 'UK' },
  { pattern: /fairyloot|fairy\s*loot/i, name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com', country: 'UK' },
  { pattern: /bookish\s*box/i, name: 'The Bookish Box', type: 'subscription_box', website: 'https://www.thebookishbox.com', country: 'US' },
  { pattern: /once\s*upon\s*a\s*book\s*club/i, name: 'Once Upon a Book Club', type: 'subscription_box', website: 'https://www.onceuponabookclub.com', country: 'US' },
  { pattern: /litjoy/i, name: 'LitJoy Crate', type: 'subscription_box', website: 'https://litjoycrate.com', country: 'US' },
  { pattern: /book\(ish\)\s*box/i, name: 'The Bookish Box', type: 'subscription_box', website: 'https://www.thebookishbox.com', country: 'US' },
  { pattern: /faecrate|fae\s*crate/i, name: 'FaeCrate', type: 'subscription_box', website: 'https://www.faecrate.com', country: 'US' },
  { pattern: /uppercase\s*box/i, name: 'Uppercase Box', type: 'subscription_box', website: 'https://uppercasebox.com', country: 'CA' },
  { pattern: /pemberley\s*box/i, name: 'Pemberley Box', type: 'subscription_box', website: 'https://www.pemberleybox.com', country: 'US' },
  { pattern: /unplugged\s*book\s*box/i, name: 'Unplugged Book Box', type: 'subscription_box', website: 'https://www.unpluggedbookbox.com', country: 'US' },
  { pattern: /the\s*locked\s*library/i, name: 'The Locked Library', type: 'subscription_box', website: 'https://www.thelockedlibrary.com', country: 'UK' },
  { pattern: /fable\s*box/i, name: 'Fable Box', type: 'subscription_box', website: 'https://fablebox.com', country: 'US' },
  { pattern: /goldsboro/i, name: 'Goldsboro Books', type: 'retailer', website: 'https://www.goldsborobooks.com', country: 'UK' },
]

// Keywords that indicate this isn't a book we want
const SKIP_PATTERNS = [
  /\bbox\s*set\b/i,
  /\bcomplete\s*(series|set)\b/i,
  /\b\d+\s*book\s*(set|series|bundle)\b/i,
  /\bseries\s*\(.*book/i,
  /kingmakers\s*(complete|series)/i,
]

interface HpbProduct {
  name: string
  price: string
  url: string
  img?: string
}

interface ApifyItem {
  url: string
  productsFound: number
  products: HpbProduct[]
}

function parsePrice(priceStr: string): number | null {
  const match = priceStr.replace(/[$,\s]/g, '').match(/[\d.]+/)
  const val = match ? parseFloat(match[0]) : null
  return val && val > 0 ? val : null
}

function identifySource(title: string): typeof SOURCE_MAP[0] | null {
  for (const source of SOURCE_MAP) {
    if (source.pattern.test(title)) return source
  }
  return null
}

function cleanTitle(title: string, sourceName: string): string {
  // Remove source name variations from title
  let clean = title
  // Remove "by Author Name" suffix
  clean = clean.replace(/\s+by\s+[A-Z][a-zA-Z\s.'-]{2,50}$/i, '')
  // Remove source names and edition qualifiers in parentheses or brackets
  clean = clean.replace(/\s*\[.*?\]\s*/g, '')
  clean = clean.replace(/\s*\(.*?(edition|exclusive|crate|box|loot|club|crate)\s*\)/gi, '')
  // Remove the source name itself
  for (const src of SOURCE_MAP) {
    clean = clean.replace(new RegExp('\\s*[-–—]?\\s*' + src.pattern.source + '.*$', 'i'), '')
    clean = clean.replace(src.pattern, '')
  }
  // Remove trailing edition/exclusive/special markers
  clean = clean.replace(/\s*(special|exclusive|signed|annotated|luxe|limited|hardcover|edition)\s*$/gi, '')
  // Clean up brackets, extra spaces, trailing punctuation
  clean = clean.replace(/[()[\]]/g, '').replace(/\s+/g, ' ').replace(/[-–—:,]\s*$/, '').trim()
  return clean
}

function extractAuthorFromTitle(title: string): string | null {
  const m = title.match(/\bby\s+([A-Z][a-zA-Z.\-' ]+?)(?:\s*[-–—(|]|$)/i)
  return m ? m[1].trim() : null
}

async function ensureSource(src: typeof SOURCE_MAP[0]): Promise<string> {
  const { data } = await supabase.from('source').select('id').ilike('name', src.name).maybeSingle()
  if (data) return data.id
  const { data: newSrc, error } = await supabase.from('source').insert({
    name: src.name, type: src.type, website: src.website, country: src.country,
  }).select('id').single()
  if (error || !newSrc) throw new Error(`Failed to create source ${src.name}: ${error?.message}`)
  console.log(`  Created source: ${src.name}`)
  return newSrc.id
}

async function fetchDataset(runId: string): Promise<HpbProduct[]> {
  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=1000`
  )
  if (!res.ok) throw new Error(`Failed to fetch dataset for run ${runId}: ${res.status}`)
  const items: ApifyItem[] = await res.json()
  const products: HpbProduct[] = []
  for (const item of items) {
    if (item.products) products.push(...item.products)
  }
  return products
}

async function run() {
  console.log('Fetching HPB product data from Apify...')

  const allProducts: HpbProduct[] = []
  for (const runId of RUN_IDS) {
    const products = await fetchDataset(runId)
    console.log(`  Run ${runId}: ${products.length} products`)
    allProducts.push(...products)
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const unique = allProducts.filter(p => {
    if (!p.name || seen.has(p.url)) return false
    seen.add(p.url)
    return true
  })
  console.log(`Total unique products: ${unique.length}`)

  const sourceCache = new Map<string, string>()
  let added = 0
  let skipped = 0
  let noSource = 0

  for (const product of unique) {
    const rawTitle = product.name.trim()
    if (!rawTitle) { skipped++; continue }

    // Skip box sets and bundles
    if (SKIP_PATTERNS.some(p => p.test(rawTitle))) {
      console.log(`  ⊘ Skip (bundle): ${rawTitle}`)
      skipped++
      continue
    }

    const srcMeta = identifySource(rawTitle)
    if (!srcMeta) {
      // It's a "signed special edition" or generic — log and skip for now
      noSource++
      continue
    }

    const cleanedTitle = cleanTitle(rawTitle, srcMeta.name)
    if (cleanedTitle.length < 2) { skipped++; continue }

    const author = extractAuthorFromTitle(rawTitle)
    const price = parsePrice(product.price)

    // Get or create source
    let sourceId = sourceCache.get(srcMeta.name)
    if (!sourceId) {
      sourceId = await ensureSource(srcMeta)
      sourceCache.set(srcMeta.name, sourceId)
    }

    // Find or create book
    const { data: existingBook } = await supabase
      .from('book').select('id').ilike('title', cleanedTitle).limit(1).maybeSingle()

    let bookId: string
    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: newBook, error } = await supabase
        .from('book').insert({ title: cleanedTitle, author: author ?? 'Unknown' })
        .select('id').single()
      if (error || !newBook) {
        console.log(`  ✗ Book insert failed for "${cleanedTitle}": ${error?.message}`)
        skipped++
        continue
      }
      bookId = newBook.id
    }

    // Check for duplicate edition
    const { data: existingEdition } = await supabase
      .from('edition').select('id')
      .eq('book_id', bookId).eq('source_id', sourceId)
      .ilike('edition_name', rawTitle).maybeSingle()

    if (existingEdition) { skipped++; continue }

    // Insert edition — use HPB resale price as estimated_value since it's secondary market
    const { error } = await supabase.from('edition').insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: rawTitle,
      edition_type: 'subscription_box',
      cover_image: product.img || null,
      estimated_value: price,  // HPB resale price = secondary market estimate
      notes: `Found via Half Price Books resale listing. HPB URL: ${product.url}`,
    })

    if (error) {
      console.log(`  ✗ ${cleanedTitle}: ${error.message}`)
      skipped++
      continue
    }

    console.log(`  ✓ [${srcMeta.name}] ${cleanedTitle}${author ? ` — ${author}` : ''}${price ? ` ($${price})` : ''}`)
    added++
    await new Promise(r => setTimeout(r, 80))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ DONE: ${added} added, ${skipped} skipped, ${noSource} without identifiable source`)
}

run().catch(console.error)

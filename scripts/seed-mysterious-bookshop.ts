/**
 * Seeds Mysterious Bookshop signed/special editions.
 * Title format: "Author Name - Book Title - Signed [detail]"
 *
 * Usage: npx tsx scripts/seed-mysterious-bookshop.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SKIP_PATTERNS = [
  /\bplaying cards?\b/i, /\bbingo\b/i, /\bpostcards?\b/i, /\btrivia\b/i,
  /\bjigsaw\b/i, /\bpuzzle\b/i, /\bgame\b/i, /\bcoaster\b/i,
  /\bprint\b/i, /\bposter\b/i, /\bnotebook\b/i, /\bmugs?\b/i,
  /\bgift.?card\b/i, /\bvoucher\b/i, /\bsubscription\b/i,
]

interface ShopifyProduct {
  title: string
  body_html: string
  variants: { price: string }[]
  images: { src: string }[]
}

// Parse "Author - Title - Signed ..." format
function parseMBSTitle(raw: string): { title: string; author: string | null; suffix: string | null } {
  const parts = raw.split(' - ').map(s => s.trim())

  if (parts.length >= 3) {
    const author = parts[0]
    const suffix = parts.slice(2).join(' - ')
    const title = parts[1]
    return { title, author, suffix }
  }
  if (parts.length === 2) {
    return { title: parts[1], author: parts[0], suffix: null }
  }
  return { title: raw, author: null, suffix: null }
}

function isSignedEdition(title: string, suffix: string | null): boolean {
  const combined = `${title} ${suffix ?? ''}`
  return /signed|lettered|numbered|tipped.in|bookplate/i.test(combined)
}

async function fetchAll(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `https://www.mysteriousbookshop.com/products.json?limit=250&page=${page}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json() as { products: ShopifyProduct[] }
    if (!data.products?.length) break
    all.push(...data.products)
    if (data.products.length < 250) break
    page++
    await new Promise(r => setTimeout(r, 300))
  }
  return all
}

function normalise(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

async function findOrCreateBook(title: string, author: string | null): Promise<string | null> {
  const { data: exact } = await supabase.from('book').select('id').ilike('title', title).limit(1).maybeSingle()
  if (exact) return exact.id
  const norm = normalise(title)
  const { data: candidates } = await supabase.from('book').select('id, title').ilike('title', `%${title.slice(0, 15)}%`).limit(20)
  for (const b of candidates ?? []) {
    if (normalise(b.title) === norm) return b.id
  }
  const { data: nb, error } = await supabase.from('book').insert({ title, author: author ?? 'Unknown' }).select('id').single()
  if (error) { console.error('  Failed:', error.message); return null }
  return nb.id
}

async function run() {
  let { data: source } = await supabase.from('source').select('id').ilike('name', 'Mysterious Bookshop').maybeSingle()
  if (!source) {
    const { data: s, error } = await supabase.from('source').insert({
      name: 'Mysterious Bookshop',
      type: 'retailer',
      website: 'https://www.mysteriousbookshop.com',
      country: 'US',
    }).select('id').single()
    if (error) { console.error(error.message); process.exit(1) }
    source = s
    console.log('Created source: Mysterious Bookshop')
  }
  const sourceId = source!.id
  console.log(`Mysterious Bookshop source ID: ${sourceId}\n`)

  console.log('Fetching all products…')
  const all = await fetchAll()
  console.log(`Fetched ${all.length} total`)

  // Filter to signed editions only, skip merchandise
  const signed = all.filter(p => {
    if (SKIP_PATTERNS.some(r => r.test(p.title))) return false
    const { suffix } = parseMBSTitle(p.title)
    return isSignedEdition(p.title, suffix)
  })
  console.log(`${signed.length} signed/special editions after filtering\n`)

  let added = 0, skipped = 0, failed = 0

  for (const p of signed) {
    const { title: bookTitle, author, suffix } = parseMBSTitle(p.title)
    if (!bookTitle || bookTitle.length < 2) { failed++; continue }

    const cover = p.images?.[0]?.src?.replace('http://', 'https://') ?? null
    const price = parseFloat(p.variants?.[0]?.price ?? '0') || null

    const bookId = await findOrCreateBook(bookTitle, author)
    if (!bookId) { failed++; continue }

    const { data: existing } = await supabase.from('edition').select('id')
      .eq('book_id', bookId).eq('source_id', sourceId).ilike('edition_name', p.title).maybeSingle()
    if (existing) { skipped++; continue }

    const editionType = /lettered|numbered/i.test(p.title) ? 'lettered' : 'signed'

    const { error } = await supabase.from('edition').insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: p.title,
      edition_type: editionType,
      cover_image: cover,
      original_retail_price: price,
      notes: suffix ?? null,
    })

    if (error) {
      console.log(`  ✗ "${bookTitle}": ${error.message}`)
      failed++
    } else {
      console.log(`  ✓ ${bookTitle}${author ? ` — ${author}` : ''}${suffix ? ` [${suffix}]` : ''}`)
      added++
    }
    await new Promise(r => setTimeout(r, 80))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Added: ${added} | ⏭️ Skipped: ${skipped} | ✗ Failed: ${failed}`)
}

run().catch(console.error)

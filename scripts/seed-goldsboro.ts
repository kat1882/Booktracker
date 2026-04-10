/**
 * Seeds Goldsboro Books Crime Collective editions from their Shopify API.
 * Goldsboro has ~4,800 products but only ~47 are special editions (Crime Collective).
 *
 * Usage: npx tsx scripts/seed-goldsboro.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  variants: { price: string }[]
  images: { src: string }[]
}

const SPECIAL_PATTERN = /crime collective|goldsboro exclusive|signed.*numbered|numbered.*signed/i

function extractAuthor(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, ' ')
  const match = text.match(/\bby\s+([A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){0,3})/m)
  return match ? match[1].trim() : null
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[-–]\s*(crime collective edition|crime collective|goldsboro exclusive.*|june \d{4}.*|may \d{4}.*|april \d{4}.*|march \d{4}.*|february \d{4}.*|january \d{4}.*|\w+ \d{4} crime.*)/gi, '')
    .trim()
}

async function fetchAll(): Promise<ShopifyProduct[]> {
  const special: ShopifyProduct[] = []
  let page = 1
  while (true) {
    const res = await fetch(`https://www.goldsborobooks.com/products.json?limit=250&page=${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const data = await res.json() as { products: ShopifyProduct[] }
    if (!data.products?.length) break
    special.push(...data.products.filter(p => SPECIAL_PATTERN.test(p.title)))
    if (data.products.length < 250) break
    page++
    await new Promise(r => setTimeout(r, 300))
  }
  return special
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
  const { data: newBook, error } = await supabase.from('book').insert({ title, author: author ?? 'Unknown' }).select('id').single()
  if (error) { console.error('  Failed to create book:', error.message); return null }
  return newBook.id
}

async function run() {
  let { data: source } = await supabase.from('source').select('id').ilike('name', 'Goldsboro Books').maybeSingle()
  if (!source) {
    const { data: s, error } = await supabase.from('source').insert({ name: 'Goldsboro Books', type: 'retailer', website: 'https://www.goldsborobooks.com', country: 'UK' }).select('id').single()
    if (error) { console.error(error.message); process.exit(1) }
    source = s
  }
  const sourceId = source!.id
  console.log(`Goldsboro Books source ID: ${sourceId}\n`)

  console.log('Scanning all Goldsboro pages for special editions…')
  const products = await fetchAll()
  console.log(`Found ${products.length} special editions\n`)

  let added = 0, skipped = 0, failed = 0

  for (const p of products) {
    const bookTitle = cleanTitle(p.title)
    if (!bookTitle || bookTitle.length < 2) { failed++; continue }

    const author = extractAuthor(p.body_html)
    const cover = p.images?.[0]?.src?.replace('http://', 'https://') ?? null
    const price = parseFloat(p.variants?.[0]?.price ?? '0') || null

    const bookId = await findOrCreateBook(bookTitle, author)
    if (!bookId) { failed++; continue }

    const { data: existing } = await supabase.from('edition').select('id')
      .eq('book_id', bookId).eq('source_id', sourceId).ilike('edition_name', p.title).maybeSingle()
    if (existing) { skipped++; continue }

    const editionType = /crime collective/i.test(p.title) ? 'subscription_box' : 'signed'

    const { error: insertErr } = await supabase.from('edition').insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: p.title,
      edition_type: editionType,
      cover_image: cover,
      original_retail_price: price,
    })

    if (insertErr) {
      console.log(`  ✗ "${p.title}": ${insertErr.message}`)
      failed++
    } else {
      console.log(`  ✓ ${bookTitle}${author ? ` (${author})` : ''}`)
      added++
    }
    await new Promise(r => setTimeout(r, 80))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Added: ${added} | ⏭️ Skipped: ${skipped} | ✗ Failed: ${failed}`)
}

run().catch(console.error)

/**
 * Seeds The Bookish Box editions from their Shopify products API.
 * Note: thebookishbox.com redirects to thebookishshop.com
 *
 * Usage: npx tsx scripts/seed-bookishbox.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  body_html: string
  product_type: string
  variants: { price: string }[]
  images: { src: string }[]
}

function extractAuthor(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, ' ')
  const match = text.match(/\bby\s+([A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){0,3})/m)
  return match ? match[1].trim() : null
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^members\s+first:\s*/i, '')
    .replace(/\s*[-–]\s*(exclusive luxe edition.*|luxe edition.*|exclusive edition.*|signed.*|special.*)/gi, '')
    .replace(/\s*\((exclusive|luxe|signed|special)[^)]*\)/gi, '')
    .replace(/\s+(exclusive luxe edition|luxe edition|exclusive edition|set|preorder)$/gi, '')
    .replace(/\s+by\s+[A-Z].*$/i, '')
    .trim()
}

async function fetchAll(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = []
  let page = 1
  while (true) {
    const res = await fetch(`https://thebookishshop.com/products.json?limit=250&page=${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const data = await res.json() as { products: ShopifyProduct[] }
    if (!data.products?.length) break
    products.push(...data.products)
    if (data.products.length < 250) break
    page++
    await new Promise(r => setTimeout(r, 400))
  }
  return products
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
  // Ensure source exists
  let { data: source } = await supabase.from('source').select('id').ilike('name', 'The Bookish Box').maybeSingle()
  if (!source) {
    const { data: newSource, error } = await supabase
      .from('source')
      .insert({ name: 'The Bookish Box', type: 'subscription_box', website: 'https://www.thebookishbox.com', country: 'US' })
      .select('id').single()
    if (error) { console.error('Failed to create source:', error.message); process.exit(1) }
    source = newSource
    console.log('Created source: The Bookish Box')
  }
  const sourceId = source!.id
  console.log(`The Bookish Box source ID: ${sourceId}\n`)

  console.log('Fetching products…')
  const all = await fetchAll()
  console.log(`Fetched ${all.length} total`)

  const books = all.filter(p => p.product_type === 'Book' || p.product_type === 'Preorder')
  console.log(`${books.length} book products after filtering\n`)

  let added = 0, skipped = 0, failed = 0

  for (const p of books) {
    const bookTitle = cleanTitle(p.title)
    if (!bookTitle || bookTitle.length < 3) { failed++; continue }

    const author = extractAuthor(p.body_html)
    const cover = p.images?.[0]?.src?.replace('http://', 'https://') ?? null
    const price = parseFloat(p.variants?.[0]?.price ?? '0') || null
    const notes = p.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500).trim() || null

    const bookId = await findOrCreateBook(bookTitle, author)
    if (!bookId) { failed++; continue }

    const { data: existing } = await supabase.from('edition').select('id')
      .eq('book_id', bookId).eq('source_id', sourceId).ilike('edition_name', p.title).maybeSingle()
    if (existing) { skipped++; continue }

    const { error: insertErr } = await supabase.from('edition').insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: p.title,
      edition_type: 'subscription_box',
      cover_image: cover,
      original_retail_price: price,
      notes,
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

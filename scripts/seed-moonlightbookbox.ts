/**
 * Seeds Moonlight Book Box editions from their Shopify products API.
 * Usage: npx tsx scripts/seed-moonlightbookbox.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SKIP_PATTERNS = [
  /\bsubscription\b/i, /\bsticker(s)?\b/i, /\bpin(s)?\b/i, /\bcandle\b/i,
  /\bmug\b/i, /\btote\b/i, /\bprint\b/i, /\bbookmark(s)?\b/i, /grade b/i,
]

interface ShopifyProduct {
  id: number; title: string; body_html: string; product_type: string
  variants: { price: string }[]; images: { src: string }[]
}

function extractAuthor(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, ' ')
  const match = text.match(/\bby\s+([A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){0,3})/m)
  return match ? match[1].trim() : null
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[-–]\s*(moonlight.*|exclusive.*|special.*|signed.*)/gi, '')
    .replace(/\s*\((moonlight|exclusive|special)[^)]*\)/gi, '')
    .replace(/\s+by\s+[A-Z].*$/i, '').trim()
}

async function findOrCreateBook(title: string, author: string | null): Promise<string | null> {
  const { data: exact } = await supabase.from('book').select('id').ilike('title', title).limit(1).maybeSingle()
  if (exact) return exact.id
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  const { data: candidates } = await supabase.from('book').select('id, title').ilike('title', `%${title.slice(0, 15)}%`).limit(20)
  for (const b of candidates ?? []) { if (norm(b.title) === norm(title)) return b.id }
  const { data: nb, error } = await supabase.from('book').insert({ title, author: author ?? 'Unknown' }).select('id').single()
  if (error) { console.error('  Failed:', error.message); return null }
  return nb.id
}

async function run() {
  let { data: source } = await supabase.from('source').select('id').ilike('name', 'Moonlight Book Box').maybeSingle()
  if (!source) {
    const { data: s, error } = await supabase.from('source').insert({ name: 'Moonlight Book Box', type: 'subscription_box', website: 'https://www.moonlightbookbox.com', country: 'US' }).select('id').single()
    if (error) { console.error(error.message); process.exit(1) }
    source = s; console.log('Created source: Moonlight Book Box')
  }
  const sourceId = source!.id
  console.log(`Moonlight Book Box source ID: ${sourceId}\n`)

  const res = await fetch('https://www.moonlightbookbox.com/products.json?limit=250', { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const data = await res.json() as { products: ShopifyProduct[] }
  const books = (data.products ?? []).filter(p => !SKIP_PATTERNS.some(r => r.test(p.title)))
  console.log(`${books.length} book products\n`)

  let added = 0, skipped = 0, failed = 0

  for (const p of books) {
    const bookTitle = cleanTitle(p.title)
    if (!bookTitle || bookTitle.length < 3) { failed++; continue }
    const author = extractAuthor(p.body_html)
    const cover = p.images?.[0]?.src?.replace('http://', 'https://') ?? null
    const price = parseFloat(p.variants?.[0]?.price ?? '0') || null
    const bookId = await findOrCreateBook(bookTitle, author)
    if (!bookId) { failed++; continue }
    const { data: existing } = await supabase.from('edition').select('id').eq('book_id', bookId).eq('source_id', sourceId).ilike('edition_name', p.title).maybeSingle()
    if (existing) { skipped++; continue }
    const { error } = await supabase.from('edition').insert({ book_id: bookId, source_id: sourceId, edition_name: p.title, edition_type: 'subscription_box', cover_image: cover, original_retail_price: price })
    if (error) { console.log(`  ✗ "${p.title}": ${error.message}`); failed++ }
    else { console.log(`  ✓ ${bookTitle}${author ? ` (${author})` : ''}`); added++ }
    await new Promise(r => setTimeout(r, 80))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Added: ${added} | ⏭️ Skipped: ${skipped} | ✗ Failed: ${failed}`)
}

run().catch(console.error)

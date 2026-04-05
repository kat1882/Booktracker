import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const SKIP_PATTERNS = [
  /\bprints?\b/i, /\bcharacter cards?\b/i, /\bset\b/i,
  /\bart print/i, /\bwatercolor/i, /\bkayden\b/i, /\bwrath and\b/i,
  /\bmalice and\b/i, /\blegacy of gods prints/i,
]

interface ShopifyProduct {
  title: string
  body_html: string
  variants: { price: string }[]
  images: { src: string }[]
}

function extractAuthorFromTitle(title: string): { cleanTitle: string; author: string | null } {
  // "This Kingdom Will Not Kill Me by Ilona Andrews" → title + author
  const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i)
  if (byMatch) return { cleanTitle: byMatch[1].trim(), author: byMatch[2].trim() }
  return { cleanTitle: title.trim(), author: null }
}

function extractNotes(bodyHtml: string): string {
  return bodyHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

async function run() {
  // Ensure source exists
  let { data: source } = await supabase.from('source').select('id').ilike('name', 'Imagine Books Shop').maybeSingle()
  if (!source) {
    const { data: newSource, error } = await supabase
      .from('source')
      .insert({ name: 'Imagine Books Shop', type: 'retailer', website: 'https://imaginebooks.shop', country: 'US' })
      .select('id').single()
    if (error) { console.error('Source error:', error); process.exit(1) }
    source = newSource
  }
  const sourceId = source!.id
  console.log(`Source ID: ${sourceId}`)

  const res = await fetch('https://imaginebooks.shop/products.json?limit=250')
  const data = await res.json() as { products: ShopifyProduct[] }
  console.log(`Fetched ${data.products.length} products`)

  const books = data.products.filter(p => !SKIP_PATTERNS.some(pat => pat.test(p.title)))
  console.log(`${books.length} books after filtering\n`)

  let added = 0
  let skipped = 0

  for (const product of books) {
    const { cleanTitle, author } = extractAuthorFromTitle(product.title)
    const coverImage = product.images?.[0]?.src ?? null
    const price = parseFloat(product.variants?.[0]?.price ?? '0') || null
    const notes = extractNotes(product.body_html)

    // Find or create book
    const { data: existingBook } = await supabase
      .from('book').select('id').ilike('title', cleanTitle).limit(1).maybeSingle()

    let bookId: string
    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: newBook, error } = await supabase
        .from('book')
        .insert({ title: cleanTitle, author: author ?? 'Unknown' })
        .select('id').single()
      if (error || !newBook) { console.log(`  ✗ Book create failed: ${cleanTitle}`); skipped++; continue }
      bookId = newBook.id
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('edition').select('id')
      .eq('book_id', bookId).eq('source_id', sourceId)
      .ilike('edition_name', product.title).maybeSingle()

    if (existing) { skipped++; continue }

    await supabase.from('edition').insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: product.title,
      edition_type: 'collectors',
      cover_image: coverImage,
      original_retail_price: price,
      notes,
    })

    console.log(`  ✓ ${cleanTitle}${author ? ` (${author})` : ''} — $${price}`)
    added++
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\nDone. ${added} added, ${skipped} skipped.`)
}

run().catch(console.error)

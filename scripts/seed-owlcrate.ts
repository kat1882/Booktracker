import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const SKIP_PATTERNS = [
  /\bbox\b/i, /\bset\b/i, /\bbundle\b/i, /\badvent\b/i, /\bcandle\b/i,
  /\bpin\b/i, /\bpouch\b/i, /\bprint\b/i, /\bsticker\b/i, /\btote\b/i,
  /\bsubscription\b/i, /\bgift card\b/i, /\bfigurine\b/i, /\bartwork\b/i,
  /\bmug\b/i, /\bjewelry\b/i, /\bnecklace\b/i, /\bring\b/i,
]

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*\(exclusive owlcrate(?: jr\.?)? edition\)/i, '')
    .replace(/\s*\(owlcrate(?: jr\.?)? exclusive\)/i, '')
    .replace(/\s*exclusive owlcrate edition/i, '')
    .replace(/\s*\([^)]*edition[^)]*\)/i, '')
    .trim()
}

function extractAuthor(bodyHtml: string): string | null {
  // Look for "by AuthorName" near the start of the body
  const match = bodyHtml.replace(/<[^>]+>/g, ' ').match(/\bby\s+([A-Z][a-zA-Z.\-']+(?:\s+[A-Z][a-zA-Z.\-']+){0,3})/m)
  return match ? match[1].trim() : null
}

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  body_html: string
  product_type: string
  variants: { price: string }[]
  images: { src: string }[]
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = []
  let page = 1
  while (true) {
    const res = await fetch(`https://www.owlcrate.com/products.json?limit=250&page=${page}`)
    const data = await res.json() as { products: ShopifyProduct[] }
    if (!data.products || data.products.length === 0) break
    products.push(...data.products)
    if (data.products.length < 250) break
    page++
    await new Promise(r => setTimeout(r, 500))
  }
  return products
}

async function run() {
  // Ensure OwlCrate source exists
  let { data: source } = await supabase.from('source').select('id').ilike('name', 'OwlCrate').maybeSingle()
  if (!source) {
    const { data: newSource, error: srcErr } = await supabase.from('source').insert({ name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com', country: 'US' }).select('id').single()
    if (srcErr) { console.error('Failed to create source:', srcErr); process.exit(1) }
    source = newSource
  }
  const sourceId = source!.id
  console.log(`OwlCrate source ID: ${sourceId}`)

  const products = await fetchAllProducts()
  console.log(`Fetched ${products.length} total products`)

  const books = products.filter(p => {
    if (p.product_type !== 'Books') return false
    if (SKIP_PATTERNS.some(pat => pat.test(p.title))) return false
    return true
  })
  console.log(`${books.length} book products after filtering\n`)

  let added = 0
  let skipped = 0

  for (const product of books) {
    const cleanedTitle = cleanTitle(product.title)
    const coverImage = product.images?.[0]?.src?.replace('http://', 'https://') ?? null
    const price = parseFloat(product.variants?.[0]?.price ?? '0') || null
    const author = extractAuthor(product.body_html)
    const notes = product.body_html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 500)
      .trim()

    // Find or create book
    let bookId: string | null = null
    const { data: existingBook } = await supabase
      .from('book')
      .select('id')
      .ilike('title', cleanedTitle)
      .limit(1)
      .maybeSingle()

    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: newBook } = await supabase
        .from('book')
        .insert({ title: cleanedTitle, author: author ?? 'Unknown' })
        .select('id')
        .single()
      bookId = newBook?.id ?? null
    }

    if (!bookId) {
      console.log(`  ✗ Could not resolve book: ${cleanedTitle}`)
      skipped++
      continue
    }

    // Check for duplicate edition
    const { data: existing } = await supabase
      .from('edition')
      .select('id')
      .eq('book_id', bookId)
      .eq('source_id', sourceId)
      .ilike('edition_name', product.title)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    await supabase.from('edition').insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: product.title,
      edition_type: 'subscription_box',
      cover_image: coverImage,
      original_retail_price: price,
      notes: notes || null,
    })

    console.log(`  ✓ ${cleanedTitle}${author ? ` (${author})` : ''}`)
    added++

    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\nDone. ${added} added, ${skipped} skipped/duplicate.`)
}

run().catch(console.error)

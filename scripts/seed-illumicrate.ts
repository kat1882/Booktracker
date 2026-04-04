import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const KNOWN_GENRES = ['fantasy', 'romance', 'thriller', 'mystery', 'horror', 'sci-fi', 'science fiction', 'historical', 'contemporary', 'ya', 'adult']

interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  vendor: string
  product_type: string
  tags: string[]
  variants: { sku: string; price: string; available: boolean }[]
  images: { src: string }[]
}

function extractAuthorFromHtml(html: string): string | null {
  // Match "by First Last" patterns
  const match = html.match(/by\s+([A-Z][a-zA-Z\s\.]+?)(?:\s+was|\s+in\s+the|\s*<|\s*\n|\.)/i)
  return match ? match[1].trim() : null
}

function extractBookTitle(productTitle: string): string {
  // Remove parenthetical suffixes like "(Illumicrate Exclusive)" or "(Illumicrate 'Box' exclusive)"
  let title = productTitle.replace(/\s*\([^)]*illumicrate[^)]*\)/gi, '').trim()
  // Remove trailing "Mini Box", "Exclusive", "Special Edition" etc
  title = title.replace(/\s+(Mini Box|Special Edition Box|Exclusive)$/gi, '').trim()
  // Remove " by Author" if it's in the title
  title = title.replace(/\s+by\s+[A-Z].*$/i, '').trim()
  return title
}

function extractReleaseMonth(html: string): string | null {
  const match = html.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i)
  return match ? `${match[1]} ${match[2]}` : null
}

function extractGenre(tags: string[]): string | null {
  const lowerTags = tags.map(t => t.toLowerCase())
  for (const genre of KNOWN_GENRES) {
    if (lowerTags.includes(genre)) return genre
  }
  return null
}

async function seed() {
  console.log('Seeding Illumicrate source...')

  // Upsert source
  const { data: source, error: sourceErr } = await supabase
    .from('source')
    .upsert({ name: 'Illumicrate', type: 'subscription_box', country: 'GB', website: 'https://illumicrate.com' }, { onConflict: 'name' })
    .select('id')
    .single()

  if (sourceErr) { console.error('Source error:', sourceErr); process.exit(1) }
  console.log('Source ID:', source.id)

  // Fetch all products
  let page = 1
  let allProducts: ShopifyProduct[] = []
  while (true) {
    const res = await fetch(`https://illumicrate.com/collections/books/products.json?limit=250&page=${page}`)
    const json = await res.json() as { products: ShopifyProduct[] }
    if (!json.products || json.products.length === 0) break
    allProducts = allProducts.concat(json.products)
    if (json.products.length < 250) break
    page++
  }
  console.log(`Fetched ${allProducts.length} products from Illumicrate`)

  let inserted = 0
  let skipped = 0

  for (const product of allProducts) {
    const bookTitle = extractBookTitle(product.title)
    const author = extractAuthorFromHtml(product.body_html) ?? 'Unknown'
    const genre = extractGenre(product.tags)
    const releaseMonth = extractReleaseMonth(product.body_html)
    const sku = product.variants[0]?.sku ?? null
    const price = product.variants[0]?.price ? parseFloat(product.variants[0].price) : null
    const coverImage = product.images[0]?.src ?? null

    if (!bookTitle) { skipped++; continue }

    // Upsert book
    const { data: book, error: bookErr } = await supabase
      .from('book')
      .upsert({ title: bookTitle, author, genre }, { onConflict: 'title' })
      .select('id')
      .single()

    if (bookErr) {
      console.error(`Book error for "${bookTitle}":`, bookErr.message)
      skipped++
      continue
    }

    // Upsert edition
    const { error: editionErr } = await supabase
      .from('edition')
      .upsert({
        book_id: book.id,
        source_id: source.id,
        edition_name: product.title,
        edition_type: 'subscription_box',
        release_month: releaseMonth,
        sku,
        original_retail_price: price,
        cover_image: coverImage,
        notes: product.body_html.replace(/<[^>]+>/g, '').trim()
      }, { onConflict: 'sku' })

    if (editionErr) {
      console.error(`Edition error for "${product.title}":`, editionErr.message)
      skipped++
      continue
    }

    console.log(`  ✓ ${bookTitle} by ${author}`)
    inserted++
  }

  console.log(`\nDone. ${inserted} editions inserted, ${skipped} skipped.`)
}

seed().catch(console.error)

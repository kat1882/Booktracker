import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const STORES = [
  {
    name: 'FaeCrate',
    url: 'https://www.faecrate.com',
    type: 'subscription_box',
    editionType: 'subscription_box',
    country: 'US',
    bookKeywords: ['book', 'edition', 'exclusive'],
    skipKeywords: ['box', 'bundle', 'set', 'pin', 'candle', 'mug', 'tote', 'print', 'sticker', 'shirt', 'hoodie', 'blanket', 'bag', 'card', 'jewelry', 'necklace', 'bracelet', 'enamel'],
  },
  {
    name: 'Goldsboro Books',
    url: 'https://www.goldsborobooks.com',
    type: 'retailer',
    editionType: 'signed',
    country: 'UK',
    bookKeywords: [],
    skipKeywords: ['gift card', 'voucher', 'tote', 'poster', 'print', 'pin', 'sticker'],
  },
  {
    name: 'Moonlight Book Box',
    url: 'https://moonlightbookbox.com',
    type: 'subscription_box',
    editionType: 'subscription_box',
    country: 'US',
    bookKeywords: [],
    skipKeywords: ['box', 'bundle', 'pin', 'candle', 'mug', 'tote', 'print', 'sticker', 'shirt', 'hoodie', 'blanket', 'bag', 'jewelry', 'necklace', 'bracelet', 'charm', 'subscription', 'grade b', 'grade c'],
  },
  {
    name: 'Beastly Tales Book Box',
    url: 'https://beastlytalesbookbox.com',
    type: 'retailer',
    editionType: 'signed',
    country: 'US',
    bookKeywords: ['book', 'signing', 'exclusive', 'hardcover', 'paperback'],
    skipKeywords: ['underwear', 'shirt', 'hoodie', 'mug', 'candle', 'tote', 'pin', 'print', 'sticker', 'blanket', 'pillow', 'bag', 'card', 'jewelry', 'necklace', 'charm', 'calendar', 'eu customers only'],
  },
  {
    name: 'The Locked Library',
    url: 'https://www.thelockedlibrary.com',
    type: 'subscription_box',
    editionType: 'subscription_box',
    country: 'UK',
    bookKeywords: [],
    skipKeywords: ['box', 'bundle', 'pin', 'candle', 'mug', 'tote', 'print', 'sticker', 'shirt', 'blanket', 'bag', 'card', 'jewelry', 'map', 'art', 'poster', 'subscription', 'gift card'],
  },
]

const GLOBAL_SKIP = [
  /\bgift.?card\b/i, /\bvoucher\b/i, /\bsubscription\b/i,
  /eu customers? only/i, /grade [bc]/i,
  /\bunderwear\b/i, /\bshirt\b/i, /\bhoodie\b/i, /\bblanket\b/i,
  /\bpillow\b/i, /\bcandle\b/i, /\bmug\b/i, /\bjewelry\b/i,
  /\bnecklace\b/i, /\bbracelet\b/i, /\benamel pin\b/i,
  /\bsticker sheet\b/i, /\btote bag\b/i, /\bposter\b/i,
  /\bcalendar\b/i, /\bart print\b/i, /\bcharacter card/i,
]

interface ShopifyProduct {
  title: string
  body_html: string
  product_type: string
  variants: { price: string }[]
  images: { src: string }[]
}

function isBook(product: ShopifyProduct, store: typeof STORES[0]): boolean {
  const title = product.title.toLowerCase()
  const type = (product.product_type || '').toLowerCase()

  // Global hard skips
  if (GLOBAL_SKIP.some(p => p.test(product.title))) return false
  // Store-specific skip keywords
  if (store.skipKeywords.some(k => title.includes(k))) return false

  // If store has book keywords, at least one must match (unless product_type is already "book")
  if (store.bookKeywords.length > 0) {
    const isBookType = type.includes('book')
    const hasKeyword = store.bookKeywords.some(k => title.includes(k) || type.includes(k))
    if (!isBookType && !hasKeyword) return false
  }

  return true
}

function extractAuthor(title: string, bodyHtml: string): { cleanTitle: string; author: string | null } {
  // "Title by Author Name" pattern in title
  const titleBy = title.match(/^(.+?)\s+by\s+([A-Z][a-zA-Z.\-' ]+?)(\s*[-–—(|]|$)/i)
  if (titleBy) return { cleanTitle: titleBy[1].trim(), author: titleBy[2].trim() }

  // Try body HTML
  const body = bodyHtml.replace(/<[^>]+>/g, ' ')
  const bodyBy = body.match(/\bby\s+([A-Z][a-zA-Z.\-']+(?:\s+[A-Z][a-zA-Z.\-']+){0,3})/m)
  if (bodyBy) return { cleanTitle: title.trim(), author: bodyBy[1].trim() }

  return { cleanTitle: title.trim(), author: null }
}

async function fetchProducts(storeUrl: string): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = []
  let page = 1
  while (true) {
    const res = await fetch(`${storeUrl}/products.json?limit=250&page=${page}`)
    if (!res.ok) break
    const data = await res.json() as { products: ShopifyProduct[] }
    if (!data.products?.length) break
    products.push(...data.products)
    if (data.products.length < 250) break
    page++
    await new Promise(r => setTimeout(r, 300))
  }
  return products
}

async function ensureSource(store: typeof STORES[0]): Promise<string> {
  let { data } = await supabase.from('source').select('id').ilike('name', store.name).maybeSingle()
  if (data) return data.id
  const { data: newSource, error } = await supabase.from('source').insert({
    name: store.name, type: store.type, website: store.url, country: store.country,
  }).select('id').single()
  if (error || !newSource) throw new Error(`Failed to create source ${store.name}: ${error?.message}`)
  return newSource.id
}

async function run() {
  let totalAdded = 0
  let totalSkipped = 0

  for (const store of STORES) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`🏪 ${store.name} (${store.url})`)
    console.log('='.repeat(50))

    const sourceId = await ensureSource(store)
    const allProducts = await fetchProducts(store.url)
    const books = allProducts.filter(p => isBook(p, store))

    console.log(`  Fetched ${allProducts.length} total → ${books.length} books after filtering`)

    let added = 0
    let skipped = 0

    for (const product of books) {
      const { cleanTitle, author } = extractAuthor(product.title, product.body_html)
      const coverImage = product.images?.[0]?.src ?? null
      const price = parseFloat(product.variants?.[0]?.price ?? '0') || null
      const notes = product.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || null

      // Find or create book
      const { data: existingBook } = await supabase
        .from('book').select('id').ilike('title', cleanTitle).limit(1).maybeSingle()

      let bookId: string
      if (existingBook) {
        bookId = existingBook.id
      } else {
        const { data: newBook, error } = await supabase
          .from('book').insert({ title: cleanTitle, author: author ?? 'Unknown' })
          .select('id').single()
        if (error || !newBook) { skipped++; continue }
        bookId = newBook.id
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from('edition').select('id')
        .eq('book_id', bookId).eq('source_id', sourceId)
        .ilike('edition_name', product.title).maybeSingle()

      if (existing) { skipped++; continue }

      const { error } = await supabase.from('edition').insert({
        book_id: bookId,
        source_id: sourceId,
        edition_name: product.title,
        edition_type: (store as typeof STORES[0] & { editionType?: string }).editionType ?? store.type,
        cover_image: coverImage,
        original_retail_price: price,
        notes,
      })

      if (error) { console.log(`  ✗ ${cleanTitle}: ${error.message}`); skipped++; continue }

      console.log(`  ✓ ${cleanTitle}${author ? ` — ${author}` : ''}`)
      added++
      await new Promise(r => setTimeout(r, 80))
    }

    console.log(`  → ${added} added, ${skipped} skipped`)
    totalAdded += added
    totalSkipped += skipped
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ ALL DONE: ${totalAdded} editions added, ${totalSkipped} skipped`)
}

run().catch(console.error)

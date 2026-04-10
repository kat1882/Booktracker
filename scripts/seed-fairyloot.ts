/**
 * Seeds FairyLoot editions from their WordPress REST API.
 * No scraping needed — the WP REST API is public.
 *
 * Usage:
 *   npx tsx scripts/seed-fairyloot.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Products to skip — non-book items
const SKIP_PATTERNS = [
  /\boverlay(s)?\b/i, /\bsticker(s)?\b/i, /\bpin(s)?\b/i, /\bpouch\b/i,
  /\bcandle\b/i, /\bmug\b/i, /\bjewelry\b/i, /\bnecklace\b/i, /\bring\b/i,
  /\btote\b/i, /\bprint\b/i, /\bartwork\b/i, /\bfigurine\b/i, /\bgift.?card\b/i,
  /\bbookmark(s)?\b/i, /\btarot\b/i, /\bsubscription\b/i,
  /\bnotebook\b/i, /\bstrap\b/i, /\bbag\b/i, /\bt-shirt\b/i,
  /^shipping$/i, /^free box$/i, /^golden ticket/i, /^rep box$/i, /^[a-z\s]{0,20} box$/i,
]

interface WPProduct {
  id: number
  title: { rendered: string }
  excerpt: { rendered: string }
  link: string
  featured_media: number
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string }[]
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeEntities(str: string): string {
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
}

function extractAuthorFromExcerpt(html: string): string | null {
  const text = stripHtml(html)
  // "by Author Name" pattern
  const match = text.match(/\bby\s+([A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){0,3})/m)
  return match ? match[1].trim() : null
}

function extractBookTitleFromExcerpt(html: string, editionName: string): string | null {
  const text = stripHtml(html)

  // Pattern: strong/em tags in the excerpt are usually the book title
  const strongMatches = html.match(/<strong>(.*?)<\/strong>/g) ?? []
  for (const m of strongMatches) {
    const t = stripHtml(m).trim()
    // Skip if it looks like a feature description, not a title
    if (t.length > 3 && t.length < 100 && !/^(Presenting|Here|Book|The Box|Note|Please|Feature|Including|edition)/i.test(t) && !/sprayed|foil|signed|hardback|hardcover|dust jacket|endpaper/i.test(t)) {
      return t
    }
  }

  // Pattern: "Presenting the [Edition type] of BOOK TITLE" — cut before "by" or "("
  const presentingMatch = text.match(/(?:of\s+)([\w][^.!?\n]{3,60}?)\s+(?:by\s+[A-Z]|\()/i)
  if (presentingMatch) {
    const candidate = presentingMatch[1].trim().replace(/[,\s]+$/, '')
    if (candidate.length > 2 && !/sprayed|foil|signed|hardback|hardcover|dust jacket|endpaper/i.test(candidate)) {
      return candidate
    }
  }

  // Fall back: strip edition type suffixes from the product title to get book title
  return editionName
    .replace(/\s*[-–]\s*(EXCLUSIVE EDITIONS?|MORTAL EDITIONS?|IRON EDITIONS?|UNSIGNED.*|SIGNED.*|PAST BOX.*|SPECIAL EDITION.*|LIMITED EDITION.*)/i, '')
    .trim() || null
}

function detectEditionType(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('mortal')) return 'subscription_box'
  if (t.includes('iron')) return 'subscription_box'
  if (t.includes('exclusive')) return 'subscription_box'
  if (t.includes('signed')) return 'signed'
  if (t.includes('illustrated')) return 'illustrated'
  if (t.includes('collectors')) return 'collectors'
  return 'subscription_box'
}

async function fetchAllProducts(): Promise<WPProduct[]> {
  const products: WPProduct[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `https://www.fairyloot.com/wp-json/wp/v2/product?per_page=100&page=${page}&_embed=wp:featuredmedia`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) {
      if (res.status === 400) break // past last page
      throw new Error(`API error: ${res.status}`)
    }
    const data = await res.json() as WPProduct[]
    if (!data.length) break
    products.push(...data)
    console.log(`  Fetched page ${page} (${data.length} products)`)
    if (data.length < 100) break
    page++
    await new Promise(r => setTimeout(r, 300))
  }
  return products
}

function normaliseTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

async function findOrCreateBook(title: string, author: string | null): Promise<string | null> {
  const { data: exact } = await supabase.from('book').select('id').ilike('title', title).limit(1).maybeSingle()
  if (exact) return exact.id

  const norm = normaliseTitle(title)
  const { data: candidates } = await supabase.from('book').select('id, title').ilike('title', `%${title.slice(0, 15)}%`).limit(20)
  if (candidates) {
    for (const b of candidates) {
      if (normaliseTitle(b.title) === norm) return b.id
    }
  }

  const { data: newBook, error } = await supabase.from('book').insert({ title, author: author ?? 'Unknown' }).select('id').single()
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
      .select('id').single()
    if (error) { console.error('Failed to create source:', error.message); process.exit(1) }
    source = newSource
    console.log('Created FairyLoot source')
  }
  const sourceId = source!.id
  console.log(`FairyLoot source ID: ${sourceId}\n`)

  console.log('Fetching products from FairyLoot WordPress API…')
  const products = await fetchAllProducts()
  console.log(`\nFetched ${products.length} total products`)

  // Filter to books only
  const books = products.filter(p => {
    const title = decodeEntities(p.title.rendered)
    return !SKIP_PATTERNS.some(pat => pat.test(title))
  })
  console.log(`${books.length} book products after filtering\n`)

  let added = 0, skipped = 0, failed = 0

  for (const product of books) {
    const editionName = decodeEntities(product.title.rendered)
    const excerpt = product.excerpt.rendered
    const coverImage = product._embedded?.['wp:featuredmedia']?.[0]?.source_url?.replace('http://', 'https://') ?? null

    const author = extractAuthorFromExcerpt(excerpt)
    const rawBookTitle = extractBookTitleFromExcerpt(excerpt, editionName)

    if (!rawBookTitle) {
      console.log(`  ✗ Could not determine book title for: ${editionName}`)
      failed++
      continue
    }

    const bookTitle = rawBookTitle.trim()
    const bookId = await findOrCreateBook(bookTitle, author)
    if (!bookId) { failed++; continue }

    // Check for duplicate
    const { data: existing } = await supabase.from('edition').select('id')
      .eq('book_id', bookId).eq('source_id', sourceId).ilike('edition_name', editionName).maybeSingle()

    if (existing) { skipped++; continue }

    // Build notes from excerpt
    const notes = stripHtml(excerpt).slice(0, 600) || null

    const { error: insertErr } = await supabase.from('edition').insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: editionName,
      edition_type: detectEditionType(editionName),
      cover_image: coverImage,
      notes,
    })

    if (insertErr) {
      console.log(`  ✗ Insert failed for "${editionName}": ${insertErr.message}`)
      failed++
    } else {
      console.log(`  ✓ ${bookTitle}${author ? ` (${author})` : ''}`)
      added++
    }

    await new Promise(r => setTimeout(r, 80))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Total books seen: ${books.length}`)
  console.log(`✅ Added: ${added}`)
  console.log(`⏭️  Skipped (duplicate): ${skipped}`)
  console.log(`✗  Failed: ${failed}`)
}

run().catch(console.error)

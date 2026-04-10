/**
 * Backfills missing book cover images using the Google Books API.
 * Targets books that have no cover_image but have at least one edition.
 *
 * Usage:
 *   GOOGLE_BOOKS_API_KEY=your_key npx tsx scripts/backfill-book-covers.ts
 *   npx tsx scripts/backfill-book-covers.ts   # works without key, lower rate limit
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const GB_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? ''

async function fetchGBCover(title: string, author: string | null): Promise<string | null> {
  const q = author
    ? `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author.split(' ').pop()!)}`
    : `intitle:${encodeURIComponent(title)}`
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1${GB_KEY ? `&key=${GB_KEY}` : ''}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const vol = data.items?.[0]?.volumeInfo
    if (!vol) return null
    const img = vol.imageLinks?.extraLarge ?? vol.imageLinks?.large ?? vol.imageLinks?.thumbnail
    if (!img) return null
    return img.replace('http://', 'https://').replace('zoom=1', 'zoom=3').replace('&edge=curl', '')
  } catch { return null }
}

async function run() {
  console.log('Finding books with no cover image…')

  // Get books with no cover that have editions
  const { data: books, error } = await supabase
    .from('book')
    .select('id, title, author')
    .is('cover_image', null)
    .order('title')

  if (error) { console.error(error.message); process.exit(1) }
  if (!books?.length) { console.log('All books have covers.'); return }

  console.log(`${books.length} books without covers\n`)

  let updated = 0, notFound = 0

  for (const book of books) {
    const cover = await fetchGBCover(book.title, book.author)
    if (cover) {
      await supabase.from('book').update({ cover_image: cover }).eq('id', book.id)
      console.log(`  ✓ ${book.title}`)
      updated++
    } else {
      notFound++
    }
    // Respect Google Books rate limit
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Updated: ${updated} | ✗ Not found: ${notFound}`)
}

run().catch(console.error)

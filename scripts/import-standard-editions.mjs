/**
 * Imports standard published editions (Hardcover, Paperback, etc.) from Open Library
 * for every book in the database. Skips books that already have standard editions.
 * Stores the discovered OL work ID back on the book record so re-runs are faster.
 *
 * Usage:
 *   node scripts/import-standard-editions.mjs              # all books missing standard editions
 *   node scripts/import-standard-editions.mjs --limit=50   # test with 50 books
 *   node scripts/import-standard-editions.mjs --offset=500 # resume from offset
 *   node scripts/import-standard-editions.mjs --dry-run    # no writes
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ARGS = process.argv.slice(2)
const DRY_RUN = ARGS.includes('--dry-run')
const LIMIT = (() => { const a = ARGS.find(a => a.startsWith('--limit=')); return a ? parseInt(a.slice(8)) : 10000 })()
const OFFSET = (() => { const a = ARGS.find(a => a.startsWith('--offset=')); return a ? parseInt(a.slice(9)) : 0 })()
const OL_DELAY_MS = 150 // be polite to Open Library

const sleep = ms => new Promise(r => setTimeout(r, ms))

function decodeHtml(str) {
  return str
    .replace(/&#8216;|&#8217;|&apos;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')  // strip any remaining numeric entities
}

function cleanTitleForSearch(title) {
  // Strip wrapping quotes like 'A Curse Carved in Bone' or "Title"
  return title.replace(/^['"\u2018\u2019\u201C\u201D](.+?)['"\u2018\u2019\u201C\u201D]$/, '$1').trim()
}

function looksLikeEditionName(title) {
  const t = title.toLowerCase()
  return (
    t.startsWith('(reprint)') ||
    t.startsWith('(signed)') ||
    (t.includes('exclusive') && t.includes('edition')) ||
    t.includes('luxe edition')
  )
}

function formatEditionName(format, publisher, year) {
  const parts = [format, publisher, year].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Standard Edition'
}

function normalizeFormat(raw) {
  if (!raw) return null
  const f = raw.toLowerCase()
  if (f.includes('hardcover') || f.includes('hardback')) return 'Hardcover'
  if (f.includes('mass market')) return 'Mass Market Paperback'
  if (f.includes('paperback') || f.includes('softcover') || f.includes('trade paper')) return 'Paperback'
  if (f.includes('ebook') || f.includes('digital') || f.includes('kindle')) return 'eBook'
  if (f.includes('audio')) return 'Audiobook'
  if (f.includes('board')) return 'Board Book'
  return raw
}

async function searchOL(title, author) {
  const lastName = author.split(' ').slice(-1)[0]
  const q = `title:${encodeURIComponent(title)} author:${encodeURIComponent(lastName)}`
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1&fields=key,title,author_name`, {
      headers: { 'User-Agent': 'Shelfworth/1.0 (ldavis182@gmail.com)' }
    })
    if (!res.ok) return null
    const data = await res.json()
    const key = data.docs?.[0]?.key ?? ''
    return key ? key.replace('/works/', '') : null
  } catch { return null }
}

async function fetchOLEditions(olId) {
  try {
    const res = await fetch(`https://openlibrary.org/works/${olId}/editions.json?limit=100`, {
      headers: { 'User-Agent': 'Shelfworth/1.0 (ldavis182@gmail.com)' }
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.entries ?? []
  } catch { return [] }
}

async function main() {
  console.log(`Starting standard edition import (offset=${OFFSET}, limit=${LIMIT}, dry-run=${DRY_RUN})`)

  // Fetch books that don't yet have any standard editions
  const { data: booksWithStandard } = await supabase
    .from('edition')
    .select('book_id')
    .eq('edition_type', 'standard')
  const booksWithStandardIds = new Set((booksWithStandard ?? []).map(e => e.book_id))

  // Fetch all books
  // Paginate to get all books (Supabase max 1000/request)
  const allBooks = []
  let from = OFFSET
  const end = OFFSET + LIMIT
  while (from < end) {
    const batchEnd = Math.min(from + 999, end - 1)
    const { data, error } = await supabase
      .from('book')
      .select('id, title, author, open_library_id')
      .order('title')
      .range(from, batchEnd)
    if (error) { console.error('Failed to fetch books:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    allBooks.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const books = allBooks.filter(b => !booksWithStandardIds.has(b.id))
  console.log(`${books.length} books need standard editions (${(allBooks ?? []).length - books.length} already done)\n`)

  let inserted = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const cleanTitle = decodeHtml(book.title)
    process.stdout.write(`[${i + 1}/${books.length}] ${cleanTitle} — `)

    if (looksLikeEditionName(cleanTitle)) {
      console.log('skipped (edition name, not a book)')
      skipped++
      continue
    }

    // Find OL work ID
    let olId = book.open_library_id
    const searchTitle = cleanTitleForSearch(cleanTitle)
    if (!olId) {
      olId = await searchOL(searchTitle, book.author)
      await sleep(OL_DELAY_MS)
      if (olId && !DRY_RUN) {
        await supabase.from('book').update({ open_library_id: olId }).eq('id', book.id)
      }
    }

    if (!olId) {
      console.log('no OL match')
      skipped++
      continue
    }

    // Fetch editions from OL
    const olEditions = await fetchOLEditions(olId)
    await sleep(OL_DELAY_MS)

    if (olEditions.length === 0) {
      console.log(`OL:${olId} — no editions`)
      skipped++
      continue
    }

    // Deduplicate by ISBN, build rows
    const seenIsbns = new Set()
    const rows = []

    for (const ed of olEditions) {
      const isbn = ed.isbn_13?.[0] ?? ed.isbn_10?.[0] ?? null
      if (isbn && seenIsbns.has(isbn)) continue
      if (isbn) seenIsbns.add(isbn)

      const format = normalizeFormat(ed.physical_format)
      const publisher = ed.publishers?.[0] ?? null
      const year = ed.publish_date?.match(/\d{4}/)?.[0] ?? null
      const coverImage = ed.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${ed.covers[0]}-L.jpg`
        : null

      // Skip if no meaningful identifying info
      if (!format && !isbn && !publisher) continue

      rows.push({
        book_id: book.id,
        edition_name: formatEditionName(format, publisher, year),
        edition_type: 'standard',
        isbn: isbn ?? null,
        publisher: publisher ?? null,
        release_month: year ?? null,
        cover_image: coverImage,
      })
    }

    if (rows.length === 0) {
      console.log(`OL:${olId} — 0 usable editions`)
      skipped++
      continue
    }

    console.log(`OL:${olId} — ${rows.length} editions`)

    if (!DRY_RUN) {
      // Upsert to avoid duplicate ISBN conflicts
      const { error: insertError } = await supabase
        .from('edition')
        .upsert(rows, { onConflict: 'isbn', ignoreDuplicates: true })

      if (insertError) {
        console.error(`  ERROR: ${insertError.message}`)
        failed++
      } else {
        inserted += rows.length
      }
    } else {
      inserted += rows.length
    }
  }

  console.log(`\nDone. Inserted: ${inserted} editions | Skipped: ${skipped} books | Failed: ${failed} books`)
}

main().catch(console.error)

/**
 * Seeds B&N Exclusive Edition books from the firecrawl output.
 * Usage: npx tsx scripts/seed-bn-exclusive.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface BNEdition {
  title: string
  author: string
  ean_isbn: string
  url: string
}

function parseTitle(raw: string): { title: string; seriesName: string | null; seriesNumber: string | null } {
  // Remove "(B&N Exclusive Edition)", "(Deluxe Edition)", "(Deluxe Limited Edition)" etc.
  let title = raw
    .replace(/\s*\(B&N Exclusive Edition\)/gi, '')
    .replace(/\s*\(Deluxe Limited Edition\)/gi, '')
    .replace(/\s*\(Deluxe Edition\)/gi, '')
    .replace(/\s*\(2025 B&N Children's Book of the Year\)/gi, '')
    .trim()

  // Extract series info like "(Into Darkness Series #3)" or "(Wings of Fire, Book 16)"
  let seriesName: string | null = null
  let seriesNumber: string | null = null

  const seriesMatch = title.match(/\s*\(([^)]+(?:Series|Book|#)[^)]*)\)$/i)
  if (seriesMatch) {
    const seriesPart = seriesMatch[1]
    title = title.slice(0, seriesMatch.index).trim()

    const numMatch = seriesPart.match(/#(\d+)|Book\s+(\d+)/i)
    if (numMatch) seriesNumber = numMatch[1] || numMatch[2]

    seriesName = seriesPart
      .replace(/#\d+/, '').replace(/Book\s+\d+/i, '').replace(/,\s*$/, '')
      .trim()
  }

  // Remove ": A Novel", ": A Novel of Obsession" etc. from end
  title = title.replace(/:\s+A\s+(Novel|Companion)[^)]*$/i, '').trim()

  return { title, seriesName, seriesNumber }
}

function parseAuthor(raw: string): string {
  // Take only the primary author (before comma if there are roles listed)
  return raw.split(',')[0].replace(/\s*\(.*?\)/g, '').trim()
}

async function getCoverFromISBN(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.covers && data.covers.length > 0) {
      return `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
    }
  } catch {}
  return null
}

async function run() {
  // Read the JSON — strip the header lines and parse just the array
  const raw = fs.readFileSync('.firecrawl/bn-exclusive-editions.json', 'utf-8')
  const jsonStart = raw.indexOf('[')
  const editions: BNEdition[] = JSON.parse(raw.slice(jsonStart))

  console.log(`Loaded ${editions.length} B&N editions\n`)

  // Get Barnes & Noble source ID
  const { data: sourceRow } = await supabase
    .from('source')
    .select('id')
    .eq('name', 'Barnes & Noble')
    .single()

  if (!sourceRow) {
    console.error('Barnes & Noble source not found in DB')
    process.exit(1)
  }
  const sourceId = sourceRow.id
  console.log(`Source ID: ${sourceId}\n`)

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const ed of editions) {
    const { title, seriesName, seriesNumber } = parseTitle(ed.title)
    const author = parseAuthor(ed.author)
    const isbn = ed.ean_isbn

    // Skip children's books / non-fiction that don't fit the tracker's focus
    // (keep them for now, user can prune later)

    try {
      // 1. Find or create book
      let bookId: string

      const { data: existingBook } = await supabase
        .from('book')
        .select('id')
        .eq('title', title)
        .maybeSingle()

      if (existingBook) {
        bookId = existingBook.id
        console.log(`  Book exists: ${title} by ${author}`)
      } else {
        const { data: newBook, error: bookErr } = await supabase
          .from('book')
          .insert({
            title,
            author,
            series_name: seriesName,
            series_number: seriesNumber,
          })
          .select('id')
          .single()

        if (bookErr || !newBook) {
          console.error(`  ✗ Book insert failed for "${title}":`, bookErr?.message)
          errors++
          continue
        }
        bookId = newBook.id
        console.log(`  ✓ Created book: ${title} by ${author}`)
      }

      // 2. Check if this edition already exists
      const { data: existingEd } = await supabase
        .from('edition')
        .select('id')
        .eq('source_id', sourceId)
        .eq('book_id', bookId)
        .maybeSingle()

      if (existingEd) {
        console.log(`    Edition already exists, skipping`)
        skipped++
        continue
      }

      // 3. Get cover image from Open Library
      const coverImage = await getCoverFromISBN(isbn)

      // 4. Insert edition
      const editionName = `${title} (B&N Exclusive Edition)`
      const { error: edErr } = await supabase
        .from('edition')
        .insert({
          book_id: bookId,
          source_id: sourceId,
          edition_name: editionName,
          edition_type: 'collectors',
          isbn,
          cover_image: coverImage,
        })

      if (edErr) {
        console.error(`    ✗ Edition insert failed:`, edErr.message)
        errors++
      } else {
        console.log(`    ✓ Edition inserted${coverImage ? ' (with cover)' : ' (no cover)'}`)
        inserted++
      }

      // Small delay to avoid rate limiting Open Library
      await new Promise(r => setTimeout(r, 300))

    } catch (err) {
      console.error(`  ✗ Error for "${ed.title}":`, err)
      errors++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped, ${errors} errors`)
}

run().catch(console.error)

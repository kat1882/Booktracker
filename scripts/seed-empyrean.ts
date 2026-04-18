/**
 * Seeds Empyrean series (Fourth Wing, Iron Flame, Onyx Storm) special editions
 * from the beautifulbooks.info collector's guide.
 * Usage: npx tsx scripts/seed-empyrean.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const DRY_RUN = process.argv.includes('--dry-run')

const AUTHOR = 'Rebecca Yarros'

interface EditionEntry {
  bookTitle: string
  editionName: string
  sourceName: string
  releaseMonth: string
  notes: string
  isbn?: string
}

const EDITIONS: EditionEntry[] = [
  // ── Fourth Wing ──────────────────────────────────────────────────────────────
  {
    bookTitle: 'Fourth Wing',
    editionName: 'Fourth Wing (Waterstones Exclusive A)',
    sourceName: 'Waterstones',
    releaseMonth: 'January 2024',
    notes: 'US hardback with revamped cover design, new endpapers, black sprayed page edges and two bonus chapters from Xaden\'s POV.',
    isbn: '9781649376169',
  },
  {
    bookTitle: 'Fourth Wing',
    editionName: 'Fourth Wing (Waterstones Exclusive B)',
    sourceName: 'Waterstones',
    releaseMonth: 'November 2023',
    notes: 'UK hardback with revamped red colourway cover design, new endpapers, and two bonus chapters from Xaden\'s POV.',
    isbn: '9780349440316',
  },
  {
    bookTitle: 'Fourth Wing',
    editionName: 'Fourth Wing (FairyLoot Edition)',
    sourceName: 'FairyLoot',
    releaseMonth: 'October 2023',
    notes: 'Signed by the author. Foil design on the boards, stencilled page edges, reversible dust jacket.',
  },
  {
    bookTitle: 'Fourth Wing',
    editionName: 'Fourth Wing (Probably Smut Edition)',
    sourceName: 'Probably Smut',
    releaseMonth: 'June 2023',
    notes: 'Exclusive cover design printed onto boards under the dust jacket, signed bookplate.',
  },
  {
    bookTitle: 'Fourth Wing',
    editionName: 'Fourth Wing (Bookish Box Edition)',
    sourceName: 'The Bookish Box',
    releaseMonth: 'June 2023',
    notes: 'Hard case illustration, stencilled page edges, illustrated endpapers, four page overlays, metal corner protectors. Signed by the author.',
  },
  {
    bookTitle: 'Fourth Wing',
    editionName: 'Fourth Wing (Dreamerwhale Edition)',
    sourceName: 'Dreamerwhale',
    releaseMonth: 'October 2023',
    notes: 'New double-sided cover design, full hardcover foiled design, full sprayed page edges, and 4 exclusive bookmarks.',
  },
  {
    bookTitle: 'Fourth Wing',
    editionName: 'Fourth Wing (Wing & Claw Collection)',
    sourceName: 'Barnes & Noble',
    releaseMonth: 'September 2025',
    notes: 'US hardback with new stenciled page edge designs. Part of the Wing & Claw Collection matching set.',
    isbn: '9781649379290',
  },

  // ── Iron Flame ───────────────────────────────────────────────────────────────
  {
    bookTitle: 'Iron Flame',
    editionName: 'Iron Flame (Waterstones Exclusive)',
    sourceName: 'Waterstones',
    releaseMonth: 'November 2023',
    notes: 'UK hardback with stencilled page edges.',
    isbn: '9780349440187',
  },
  {
    bookTitle: 'Iron Flame',
    editionName: 'Iron Flame (FairyLoot Special Edition)',
    sourceName: 'FairyLoot',
    releaseMonth: 'November 2023',
    notes: 'Signed by the author. Foil design on the boards, stencilled page edges, reversible dust jacket.',
  },
  {
    bookTitle: 'Iron Flame',
    editionName: 'Iron Flame (Bookish Box Edition)',
    sourceName: 'The Bookish Box',
    releaseMonth: 'December 2023',
    notes: 'Hard case illustration, stencilled page edges, illustrated endpapers, four page overlays, metal corner protectors. Signed by the author.',
  },
  {
    bookTitle: 'Iron Flame',
    editionName: 'Iron Flame (Wing & Claw Collection)',
    sourceName: 'Barnes & Noble',
    releaseMonth: 'September 2025',
    notes: 'US hardback with new stenciled page edge designs. Part of the Wing & Claw Collection matching set.',
    isbn: '9781649379399',
  },

  // ── Onyx Storm ───────────────────────────────────────────────────────────────
  {
    bookTitle: 'Onyx Storm',
    editionName: 'Onyx Storm (Target Exclusive)',
    sourceName: 'Target',
    releaseMonth: 'January 2025',
    notes: 'Alternate stenciled page edges and special artwork throughout the book.',
    isbn: '9781649378606',
  },
  {
    bookTitle: 'Onyx Storm',
    editionName: 'Onyx Storm (Waterstones Exclusive)',
    sourceName: 'Waterstones',
    releaseMonth: 'January 2025',
    notes: 'Sprayed page edges.',
    isbn: '9780349443836',
  },
  {
    bookTitle: 'Onyx Storm',
    editionName: 'Onyx Storm (FairyLoot Edition)',
    sourceName: 'FairyLoot',
    releaseMonth: 'July 2025',
    notes: 'Signed by the author. Stenciled sprayed page edges, exclusive foiled design under the dust jacket, reversible dust jacket.',
  },
]

async function run() {
  if (DRY_RUN) {
    console.log('--- DRY RUN ---')
    for (const e of EDITIONS) {
      console.log(`  [${e.sourceName}] "${e.editionName}" — ${e.releaseMonth}`)
    }
    console.log(`\nTotal: ${EDITIONS.length} editions across ${[...new Set(EDITIONS.map(e => e.bookTitle))].length} books`)
    return
  }

  // Load source IDs
  const { data: sources } = await supabase.from('source').select('id, name')
  const sourceMap = Object.fromEntries((sources ?? []).map(s => [s.name, s.id]))

  let inserted = 0, skipped = 0, errors = 0

  for (const ed of EDITIONS) {
    const sourceId = sourceMap[ed.sourceName]
    if (!sourceId) {
      console.log(`  ✗ Source not in DB: ${ed.sourceName}`)
      errors++
      continue
    }

    try {
      // Find or create book
      let bookId: string
      const { data: existingBook } = await supabase
        .from('book')
        .select('id')
        .eq('title', ed.bookTitle)
        .maybeSingle()

      if (existingBook) {
        bookId = existingBook.id
      } else {
        const { data: newBook, error: bookErr } = await supabase
          .from('book')
          .insert({ title: ed.bookTitle, author: AUTHOR })
          .select('id')
          .single()

        if (bookErr || !newBook) {
          const { data: retry } = await supabase.from('book').select('id').eq('title', ed.bookTitle).maybeSingle()
          if (retry) { bookId = retry.id }
          else { console.error(`  ✗ Failed to create book "${ed.bookTitle}"`); errors++; continue }
        } else {
          bookId = newBook.id
        }
      }

      // Check if edition already exists for this source + book
      const { data: existingEd } = await supabase
        .from('edition')
        .select('id')
        .eq('source_id', sourceId)
        .eq('book_id', bookId)
        .maybeSingle()

      if (existingEd) {
        console.log(`  – [${ed.sourceName}] "${ed.bookTitle}" already exists, skipping`)
        skipped++
        continue
      }

      const coverImage = `https://covers.openlibrary.org/b/title/${encodeURIComponent(ed.bookTitle)}-L.jpg`

      const insertData: Record<string, unknown> = {
        book_id: bookId,
        source_id: sourceId,
        edition_name: ed.editionName,
        edition_type: 'collectors',
        release_month: ed.releaseMonth,
        notes: ed.notes,
        cover_image: coverImage,
      }
      if (ed.isbn) insertData.isbn = ed.isbn

      const { error: edErr } = await supabase.from('edition').insert(insertData)

      if (edErr) {
        console.error(`  ✗ "${ed.editionName}":`, edErr.message)
        errors++
      } else {
        console.log(`  ✓ [${ed.sourceName}] ${ed.editionName} — ${ed.releaseMonth}`)
        inserted++
      }

      await new Promise(r => setTimeout(r, 80))
    } catch (err) {
      console.error(`  ✗ Error for "${ed.editionName}":`, err)
      errors++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped, ${errors} errors`)
}

run().catch(console.error)

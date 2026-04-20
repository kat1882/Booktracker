/**
 * Finds books whose titles are actually edition names (e.g. "A Curse For True Love - Limited Edition")
 * strips the qualifier, finds the real book, and re-links editions to it.
 *
 * Usage:
 *   node scripts/cleanup-bad-book-titles.mjs             # preview only
 *   node scripts/cleanup-bad-book-titles.mjs --fix       # apply fixes
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const FIX = process.argv.includes('--fix')

// Patterns that indicate a title is actually an edition name
const QUALIFIERS = [
  // GSFF / store-specific
  / exclusive luxe edition.*$/i,
  / - gsff edition.*$/i,
  / - august \d{4} gsff edition.*$/i,
  / - doodled.*$/i,
  // Limited / special
  / - limited edition$/i,
  / - deluxe edition$/i,
  / - exclusive.*edition.*$/i,
  / exclusive hardback edition$/i,
  / exclusive hardcover edition$/i,
  / exclusive edition$/i,
  / - b grade$/i,
  // Signed variations
  / - signed,? lined(,? [&+] ?| and )dated$/i,
  / - signed, dated [&+] stamped$/i,
  / - signed, lined [&+] dated$/i,
  / - signed(,? lined)?( edition)?$/i,
  / - signed$/i,
  /\(signed(,? lined)?(,? [&+] dated)? edition\)$/i,
  /\(signed first edition\)$/i,
  /\(signed\)$/i,
  / \(signed.*\)$/i,
  // Prefixes
  /^\(reprint\)\s*/i,
  /^reprint\s*/i,
]

function extractBaseTitle(title) {
  let base = title.trim()
  for (const pattern of QUALIFIERS) {
    base = base.replace(pattern, '').trim()
  }
  // Strip wrapping quotes
  base = base.replace(/^['"\u2018\u2019\u201C\u201D](.+?)['"\u2018\u2019\u201C\u201D]$/, '$1').trim()
  return base === title.trim() ? null : base  // null = no change made
}

async function main() {
  console.log(`Mode: ${FIX ? 'FIX (writing changes)' : 'PREVIEW (no changes)'}\n`)

  // Fetch all books (paginate to get past 1000-row limit)
  const allBooks = []
  let from = 0
  while (true) {
    const { data } = await supabase.from('book').select('id, title, author').range(from, from + 999)
    if (!data || data.length === 0) break
    allBooks.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`Fetched ${allBooks.length} total books`)
  const badBooks = allBooks.filter(b => extractBaseTitle(b.title) !== null)

  console.log(`Found ${badBooks?.length ?? 0} candidate bad book records\n`)

  let canFix = 0, noMatch = 0, sameBook = 0

  for (const bad of (badBooks ?? [])) {
    const baseTitle = extractBaseTitle(bad.title)
    if (!baseTitle) {
      // Title didn't match any qualifier pattern — skip
      continue
    }

    // Look for the real book by title match
    const { data: matches } = await supabase
      .from('book')
      .select('id, title, author')
      .ilike('title', baseTitle)
      .neq('id', bad.id)
      .limit(3)

    if (!matches || matches.length === 0) {
      noMatch++
      if (!FIX) console.log(`NO MATCH  | "${bad.title}" → "${baseTitle}"`)
      continue
    }

    const realBook = matches[0]
    if (realBook.id === bad.id) { sameBook++; continue }

    canFix++
    console.log(`${FIX ? 'FIXING  ' : 'CAN FIX '} | "${bad.title}"`)
    console.log(`          → real book: "${realBook.title}" by ${realBook.author} (${realBook.id})`)

    if (FIX) {
      // Move editions to the real book
      await supabase.from('edition').update({ book_id: realBook.id }).eq('book_id', bad.id)
      // Move user_collection entries
      await supabase.from('user_collection').update({ book_id: realBook.id }).eq('book_id', bad.id)
      // Delete the bad book
      const { error } = await supabase.from('book').delete().eq('id', bad.id)
      if (error) console.log(`  ERROR deleting: ${error.message}`)
      else console.log(`  Deleted bad book record.`)
    }
  }

  console.log(`\nSummary:`)
  console.log(`  Can fix (real book found): ${canFix}`)
  console.log(`  No match found:            ${noMatch}`)
}

main().catch(console.error)

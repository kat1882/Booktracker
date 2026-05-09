/**
 * import-retail-editions.mjs
 * Parses BAS special-edition URL slugs to extract title/author/source/month
 * and inserts missing editions into the database.
 *
 * Slug format: {title-slug}-{author-slug}-{source-slug}
 * e.g. skyshade-alex-aster-collectors-edition
 *      fever-dream-elsie-silver-barnes-and-noble-exclusive
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-retail-editions.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://fubplguqhrsubaorfnqh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Map slug suffixes → source names in our DB
const SOURCE_SUFFIX_MAP = [
  { patterns: ['barnes-and-noble', 'barnes-%26-noble', 'bn-exclusive', 'bn-edition'],    source: 'Barnes & Noble' },
  { patterns: ['books-a-million', 'books-a-million-exclusive'],                           source: 'Books-A-Million' },
  { patterns: ['waterstones'],                                                             source: 'Waterstones' },
  { patterns: ['indigo-exclusive', 'indigo-edition'],                                     source: 'Indigo' },
  { patterns: ['walmart-exclusive'],                                                       source: 'Walmart' },
  { patterns: ['target-exclusive'],                                                        source: 'Target' },
  { patterns: ['goldsboro-books', 'goldsboro'],                                           source: 'Goldsboro Books' },
  { patterns: ['the-works'],                                                               source: 'The Works' },
  { patterns: ['inkstone-books'],                                                          source: 'Inkstone Books' },
  // Subscription boxes
  { patterns: ['fairyloot', 'fairy-loot'],                                                source: 'FairyLoot' },
  { patterns: ['fairyloot-romantasy'],                                                     source: 'FairyLoot Romantasy' },
  { patterns: ['fairyloot-adult'],                                                         source: 'FairyLoot Adult' },
  { patterns: ['illumicrate'],                                                             source: 'Illumicrate' },
  { patterns: ['afterlight', 'afterlight-romance'],                                       source: 'Afterlight Romance' },
  { patterns: ['owlcrate-ya', 'owlcrate-jr'],                                             source: 'OwlCrate' },
  { patterns: ['owlcrate-adult'],                                                          source: 'OwlCrate Adult Fantasy' },
  { patterns: ['owlcrate'],                                                                source: 'OwlCrate' },
  { patterns: ['faecrate', 'fae-crate'],                                                  source: 'FaeCrate' },
  { patterns: ['litjoy'],                                                                  source: 'LitJoy Crate' },
  { patterns: ['thebookishbox', 'bookish-box'],                                           source: 'The Bookish Box' },
  { patterns: ['books-for-days'],                                                          source: 'Books for Days Crate' },
  { patterns: ['moonlight-book-box'],                                                      source: 'Moonlight Book Box' },
  { patterns: ['cover-to-cover'],                                                          source: 'Cover to Cover' },
  { patterns: ['bookish-spice', 'bookish-%26-spice'],                                     source: 'Bookish & Spice' },
  { patterns: ['page-%26-wick', 'page-wick'],                                             source: 'Page & Wick' },
  { patterns: ['coveted-cover-nocturna'],                                                  source: 'Coveted Cover Nocturna' },
  { patterns: ['coveted-cover'],                                                           source: 'Coveted Cover' },
  { patterns: ['bad-women-books'],                                                         source: 'Bad Women Books' },
  { patterns: ['fabled'],                                                                  source: 'Fabled' },
  { patterns: ['foxglove-romance'],                                                        source: 'Foxglove Romance' },
  { patterns: ['foxglove'],                                                                source: 'Foxglove Fantasy Fiction' },
  { patterns: ['butterfly-book-club'],                                                     source: 'Butterfly Book Club' },
  { patterns: ['autumn-midnights'],                                                        source: 'Autumn Midnights' },
  { patterns: ['after-dark-bookshop'],                                                     source: 'After Dark Bookshop' },
  { patterns: ['allurial'],                                                                source: 'Allurial' },
  { patterns: ['aurora-crate'],                                                            source: 'Aurora Crate' },
  { patterns: ['belle-book-box'],                                                          source: 'Belle Book Box' },
  { patterns: ['dark-desires'],                                                            source: 'Dark Desires' },
  { patterns: ['dark-and-nerdy'],                                                          source: 'Dark and Nerdy' },
  { patterns: ['dreamerwhale'],                                                            source: 'Dreamerwhale' },
  { patterns: ['euphoric-lit'],                                                            source: 'Euphoric Lit' },
  { patterns: ['evernight'],                                                               source: 'Evernight' },
  { patterns: ['fated-arcana'],                                                            source: 'Fated Arcana' },
  { patterns: ['forbidden-wing'],                                                          source: 'Forbidden Wing' },
  { patterns: ['lit-haven'],                                                               source: 'Lit Haven' },
  { patterns: ['little-wicked'],                                                           source: 'Little Wicked' },
  { patterns: ['midnight-whispers'],                                                       source: 'Midnight Whispers' },
  { patterns: ['moonlight-book-box'],                                                      source: 'Moonlight Book Box' },
  { patterns: ['motley-chronicles'],                                                       source: 'Motley Chronicles' },
  { patterns: ['novel-grounds'],                                                           source: 'Novel Grounds' },
  { patterns: ['onyx'],                                                                    source: 'Onyx Book Box' },
  { patterns: ['rainbow-crate'],                                                           source: 'Rainbow Crate' },
  { patterns: ['rainbow-after-dark'],                                                      source: 'Rainbow After Dark' },
  { patterns: ['red-flags'],                                                               source: 'Red Flags & Roses' },
  { patterns: ['romance-cartel'],                                                          source: 'Romance Cartel' },
  { patterns: ['ruined-by-fiction'],                                                       source: 'Ruined by Fiction' },
  { patterns: ['sinful-obsessions'],                                                       source: 'Sinful Obsessions' },
  { patterns: ['smut-sip', 'smut-%26-sip'],                                               source: 'Smut & Sip' },
  { patterns: ['the-book-cove'],                                                           source: 'The Book Cove' },
  { patterns: ['the-darkly-box'],                                                          source: 'The Darkly Box' },
  { patterns: ['the-locked-library'],                                                      source: 'The Locked Library' },
  { patterns: ['twisted-fantasy'],                                                         source: 'Twisted Fantasy' },
  { patterns: ['venom-and-lace'],                                                          source: 'Venom and Lace Book Box' },
  // Generic retail — catch-all for deluxe/collector editions without specific store
  { patterns: ['deluxe-edition', 'deluxe-limited-edition', 'deluxe-paperback',
               'collectors-edition', 'collector-s-edition', 'special-edition',
               'deluxe-hardcover', 'deluxe-1st-edition', 'deluxe-us-edition',
               'deluxe-uk-edition', 'deluxe-au', 'export-exclusive', 'deluxe-export',
               '10th-anniversary', 'collectible-edition', 'slipcase-edition',
               '1st-edition', 'first-edition'],                                            source: 'Most Bookstores' },
]

// Known author overrides for ambiguous slugs
// Format: title-slug → [title, author]
const KNOWN_OVERRIDES = {
  'skyshade-alex-aster-collectors-edition':          ['Skyshade', 'Alex Aster'],
  'dark-matter-blake-crouch-10th-anniversary-edition': ['Dark Matter', 'Blake Crouch'],
  'divergent-veronica-roth-deluxe-limited-edition':  ['Divergent', 'Veronica Roth'],
  'legendary-sources-deluxe-edition':                 ['Legendary', 'Stephanie Garber'],
  'red-rising-deluxe-slipcase-edition-pierce-brown':  ['Red Rising', 'Pierce Brown'],
  'the-sea-of-monsters-rick-riordan-deluxe-collectors-edition': ['The Sea of Monsters', 'Rick Riordan'],
  'leaves-of-grass-walt-whitman-collectors-edition':  ['Leaves of Grass', 'Walt Whitman'],
  'songs-of-the-dead-brandon-sanderson-peter-orullian-deluxe-edition': ['Songs of the Dead', 'Brandon Sanderson'],
}

function parseSlug(slug) {
  // Decode URL encoding
  const decoded = decodeURIComponent(slug).toLowerCase()

  // Check for known overrides first
  if (KNOWN_OVERRIDES[slug]) {
    const [title, author] = KNOWN_OVERRIDES[slug]
    return { rawTitle: title, author, sourceSuffix: null }
  }

  // Find which source suffix matches
  let sourceSuffix = null
  let titleAuthorPart = decoded

  for (const { patterns } of SOURCE_SUFFIX_MAP) {
    for (const pat of patterns) {
      // Check if slug ends with this pattern (with optional surrounding context)
      const idx = decoded.lastIndexOf('-' + pat)
      if (idx > 10) { // must have substantial title before it
        sourceSuffix = pat
        titleAuthorPart = decoded.slice(0, idx)
        break
      }
      // Also check if the pattern appears anywhere in the slug
      if (decoded.includes(pat)) {
        const start = decoded.indexOf(pat)
        if (start > 10) {
          sourceSuffix = pat
          titleAuthorPart = decoded.slice(0, start - 1)
          break
        }
      }
    }
    if (sourceSuffix) break
  }

  // titleAuthorPart is like "fever-dream-elsie-silver" — split at last 2 words for author
  // This is a heuristic: last 2 hyphen-separated parts are usually "firstname-lastname"
  const parts = titleAuthorPart.split('-').filter(Boolean)
  if (parts.length < 2) return null

  // Heuristic: if last part looks like a name (starts with capital when title-cased), it's author
  // Take last 2 parts as author, rest as title
  const authorParts = parts.slice(-2)
  const titleParts = parts.slice(0, -2)

  if (titleParts.length === 0) return null

  const rawTitle = titleParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const author = authorParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return { rawTitle, author, sourceSuffix }
}

function sourceForSlug(slug, sourceByName) {
  const decoded = decodeURIComponent(slug).toLowerCase()
  for (const { patterns, source } of SOURCE_SUFFIX_MAP) {
    for (const pat of patterns) {
      if (decoded.includes(pat)) {
        const src = sourceByName[source.toLowerCase()]
        if (src) return src
      }
    }
  }
  return null
}

// Extract month from slug if present (e.g. "april-2025" in slug)
function monthFromSlug(slug) {
  const m = slug.match(/(january|february|march|april|may|june|july|august|september|october|november|december)-?(20\d\d)/i)
  if (m) return `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} ${m[2]}`
  return null
}

async function main() {
  console.log('Loading sources...')
  const { data: sources } = await supabase.from('source').select('id, name, type')
  const sourceByName = Object.fromEntries(sources.map(s => [s.name.toLowerCase(), s]))

  console.log('Loading existing books + editions...')
  const { data: books } = await supabase.from('book').select('id, title, author')
  const bookByTitle = new Map(books.map(b => [b.title.toLowerCase(), b]))

  const { data: existingEditions } = await supabase
    .from('edition')
    .select('id, edition_name, source_id, book_id')
    .limit(10000)
  const editionNames = new Set(existingEditions?.map(e => e.edition_name.toLowerCase()) || [])

  // Read all slug lists
  const slugSources = []

  // From release page slugs (hardcoded list)
  const releasePageSlugs = readFileSync(`C:/Users/ldavi/OneDrive/Desktop/.claude/.firecrawl/all-edition-urls.txt`, 'utf8')
    .trim().split('\n')
    .map(u => u.split('/special-editions/')[1])
    .filter(Boolean)

  releasePageSlugs.forEach(s => slugSources.push({ slug: s, monthYear: monthFromSlug(s) }))

  console.log(`Processing ${slugSources.length} slugs...`)

  const toInsert = []
  const skipped = []
  let newBooks = 0

  for (const { slug, monthYear } of slugSources) {
    const source = sourceForSlug(slug, sourceByName)
    if (!source) { skipped.push(slug); continue }

    const parsed = parseSlug(slug)
    if (!parsed || !parsed.rawTitle) { skipped.push(slug); continue }

    const { rawTitle, author } = parsed

    // Build edition name
    const editionName = monthYear
      ? `${source.name} ${monthYear} Edition`
      : `${rawTitle} (${source.name} Edition)`

    // Skip if edition already exists
    if (editionNames.has(editionName.toLowerCase())) continue

    // Find or note book
    let bookId = bookByTitle.get(rawTitle.toLowerCase())?.id || null

    toInsert.push({
      edition_name: editionName,
      source_id: source.id,
      source_name: source.name,
      book_id: bookId,
      book_title: rawTitle,
      book_author: author,
      release_month: monthYear,
      edition_type: source.type === 'subscription_box' ? 'subscription_box' : 'deluxe',
    })
  }

  console.log(`\n── RESULTS ──────────────────────────────`)
  console.log(`  To insert: ${toInsert.length}`)
  console.log(`  Skipped (no source/parse): ${skipped.length}`)
  console.log(`\n  Sample inserts:`)
  toInsert.slice(0, 15).forEach(e => console.log(`  "${e.edition_name}" [${e.source_name}] book="${e.book_title}"${e.release_month ? ' '+e.release_month : ''}`))

  if (toInsert.length === 0) { console.log('Nothing to insert.'); return }

  // Create missing books first
  const missingBooks = toInsert.filter(e => !e.book_id)
  if (missingBooks.length > 0) {
    console.log(`\nCreating ${missingBooks.length} missing book records...`)
    // Deduplicate by title
    const uniqueBooks = [...new Map(missingBooks.map(e => [e.book_title.toLowerCase(), e])).values()]
    for (const e of uniqueBooks) {
      // Try insert, then fetch if it already exists
      let { data: newBook } = await supabase.from('book')
        .insert({ title: e.book_title, author: e.book_author })
        .select('id, title')
        .single()
      if (!newBook) {
        // Might already exist with slightly different casing
        const { data: existing } = await supabase.from('book')
          .select('id, title')
          .ilike('title', e.book_title)
          .limit(1)
          .single()
        newBook = existing
      }
      if (newBook) {
        bookByTitle.set(newBook.title.toLowerCase(), newBook)
        toInsert.filter(x => x.book_title.toLowerCase() === e.book_title.toLowerCase())
          .forEach(x => x.book_id = newBook.id)
        newBooks++
      }
    }
    console.log(`  Created ${newBooks} books`)
  }

  // Filter out any still missing book_id
  const readyToInsert = toInsert.filter(e => e.book_id)
  console.log(`\nInserting ${readyToInsert.length} editions (${toInsert.length - readyToInsert.length} skipped - no book)...`)
  const toInsertFinal = readyToInsert
  let inserted = 0, errors = 0
  const BATCH = 50
  for (let i = 0; i < toInsertFinal.length; i += BATCH) {
    const batch = toInsertFinal.slice(i, i + BATCH).map(e => ({
      edition_name: e.edition_name,
      source_id: e.source_id,
      book_id: e.book_id,
      release_month: e.release_month,
      edition_type: e.edition_type,
    }))
    const { error } = await supabase.from('edition').insert(batch)
    if (error) { console.error('Batch error:', error.message); errors += batch.length }
    else inserted += batch.length
    process.stdout.write(`\r  ${i + BATCH}/${toInsertFinal.length}...`)
  }

  console.log(`\n\n✅ Done: ${inserted} editions inserted, ${errors} errors, ${newBooks} new books created`)
}

main().catch(console.error)

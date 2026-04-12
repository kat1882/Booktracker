/**
 * Extracts cover image URLs from scraped BAS markdown files and
 * updates edition.cover_image and book.cover_image in the database.
 *
 * Fast version: pre-loads all books + editions into memory, then
 * does batch updates instead of per-row queries.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const COMPANY_MAP: Record<string, string> = {
  'fairyloot-adult': 'FairyLoot', 'fairyloot-romantasy': 'FairyLoot',
  'fairyloot-ya': 'FairyLoot', 'fairyloot-epic-fantasy': 'FairyLoot',
  'fairyloot': 'FairyLoot', 'fairy-loot-cozy-fantasy': 'FairyLoot',
  'owlcrate-adult': 'OwlCrate', 'owlcrate-romance': 'OwlCrate',
  'owlcrate-romantasy': 'OwlCrate', 'owlcrate-horror': 'OwlCrate',
  'owlcrate-sci-fi': 'OwlCrate', 'owlcrate': 'OwlCrate',
  'owlcrate-ya': 'OwlCrate Jr.',
  'moonlight-book-box': 'Moonlight Book Box',
  'locked-library': 'The Locked Library',
  'litjoy': 'LitJoy Crate',
  'thebookishbox': 'The Bookish Box',
  'illumicrate': 'Illumicrate',
  'goldsboro-premier': 'Goldsboro Books', 'goldsboro-crime-collective': 'Goldsboro Books',
  'goldsboro-gsff': 'Goldsboro Books', 'goldsboro': 'Goldsboro Books',
  'faecrate-ya': 'FaeCrate', 'fae-crate-adult': 'FaeCrate', 'fae-crate-opus': 'FaeCrate',
  'afterlight-romance': 'Afterlight Romance', 'arcane-society': 'Arcane Society',
  'autumn-midnights': 'Autumn Midnights', 'baddies-book-box': 'Baddies Book Box',
  'belle': 'Belle Book Box', 'blackout-romance': 'Blackout Romance',
  'book-in-a-box': 'Book in a Box',
  'bookish-%26-spice-dark-romance': 'Bookish & Spice',
  'bookish-%26-spice-romantasy': 'Bookish & Spice',
  'bookish-%26-spice': 'Bookish & Spice',
  'bookish-%26-spice-contemporary-romance': 'Bookish & Spice',
  'broken-binding-fantasy': 'The Broken Binding',
  'broken-binding-sci-fi': 'The Broken Binding',
  'broken-binding': 'The Broken Binding',
  'broken-binding-sci-fi-%26-fantasy': 'The Broken Binding',
  'butterfly-book-club-fantasy-fated-flames': 'Butterfly Book Club',
  'butterfly-book-club-sinful-souls': 'Butterfly Book Club',
  'butterfly-book-club-carnal-creatures': 'Butterfly Book Club',
  'butterfly-book-club-hive': 'Butterfly Book Club',
  'corrupted-nights': 'Corrupted Nights', 'cover-snob': 'Cover Snob',
  'cover-to-cover-red-flags': 'Cover to Cover',
  'cover-to-cover-white-knights': 'Cover to Cover',
  'cover-to-cover': 'Cover to Cover',
  'coveted-cover-aetheria': 'Coveted Cover',
  'coveted-cover-nocturna': 'Coveted Cover Nocturna',
  'coveted-cover': 'Coveted Cover',
  'dark-%26-quirky': 'Dark & Quirky', 'dark-and-nerdy': 'Dark and Nerdy',
  'dark-and-sinful': 'Dark and Sinful', 'dark-desires': 'Dark Desires',
  'darkly-book-box': 'The Darkly Box',
  'dazzling-adult-quarterly': 'Dazzling', 'dazzling-ya-monthly': 'Dazzling',
  'dazzling-bookish-shop': 'Dazzling',
  'eternal-embers': 'Eternal Embers', 'ethereal-by-eternal-embers': 'Eternal Embers',
  'evernight': 'Evernight',
  'fabled-midnight': 'Fabled', 'fabled-moonlight': 'Fabled',
  'fabled-nights': 'Fabled', 'fabled-twilight': 'Fabled', 'fabled-co': 'Fabled',
  'fated-mates': 'Fated Mates', 'forbidden-wing': 'Forbidden Wing',
  'fox-%26-wit': 'Fox & Wit', 'foxglove-romance': 'Foxglove Romance',
  'gold-leaf': 'Gold Leaf', 'grimoire-%26-alchemy': 'Grimoire & Alchemy',
  'inkstone-books': 'Inkstone Books',
  'la-petite-mort-book-box': 'La Petite Mort Book Box',
  'lilac-library-romantasy': 'Lilac Library', "lilac-library's": 'Lilac Library',
  'lilac-library-romance': 'Lilac Library', 'little-wicked': 'Little Wicked',
  'love-club-book-shop': 'Love Club Book Shop',
  'the-love-club-bookshop-monthly': 'Love Club Book Shop',
  'the-love-club-bookshop-quarterly': 'Love Club Book Shop',
  "marley's-must-reads": "Marley's Must Reads",
  'midnight-bookshelf': 'Midnight Bookshelf', 'motley-chronicles': 'Motley Chronicles',
  'mystic-box': 'Mystic Box',
  'nocturnal-ink-provocative-pages': 'Nocturnal Ink',
  'nocturnal-ink-twisted-desires': 'Nocturnal Ink',
  'nocturnal-ink-delust-box': 'Nocturnal Ink',
  'nocturnal-ink-hooked-on-him': 'Nocturnal Ink',
  'onyx': 'Onyx Book Box', 'page-%26-wick': 'Page & Wick',
  'pretty-little-words-novel-noir-luxe-book-box': 'Pretty Little Words',
  'pretty-little-words': 'Pretty Little Words',
  'probably-smut': 'Probably Smut', 'rainbow-after-dark': 'Rainbow After Dark',
  'rainbow-crate': 'Rainbow Crate', 'renegade-romance': 'Renegade Romance',
  'romance-cartel-enchantasy': 'Romance Cartel',
  'romance-cartel-his-obsession': 'Romance Cartel',
  'romance-cartel-literati': 'Romance Cartel', 'romance-cartel': 'Romance Cartel',
  'satisfiction': 'Satisfiction', 'sinful-obsessions': 'Sinful Obsessions',
  'smut-%26-sip': 'Smut & Sip', 'starbright': 'Starbright',
  'the-book-cove': 'The Book Cove', 'the-love-story-society': 'The Love Story Society',
  'twisted-fantasy': 'Twisted Fantasy', 'twisted-horror-erotica': 'Twisted Horror Erotica',
  'wicked-tales': 'Wicked Tales', 'yo-leo-sola-book-box': 'Yo Leo Sola Book Box',
  'beastly-tales-book-box': 'Beastly Tales Book Box',
  'imagine-books-shop': 'Imagine Books Shop',
  'after-dark-bookshop': 'After Dark Bookshop',
  'all-of-the-above-book-box': 'All of the Above Book Box',
  'allurial': 'Allurial', 'amor-eterno-book-box': 'Amor Eterno Book Box',
  'aurora-crate': 'Aurora Crate', 'author-editions': 'Author Editions',
  'bad-girls-book-box': 'Bad Girls Book Box',
  'bad-women-books-romantasy-book-box': 'Bad Women Books',
  'bad-women-books-vintage-romance-box': 'Bad Women Books',
  'bad-women-books': 'Bad Women Books',
  'barnes-%26-noble': 'Barnes & Noble',
  'bewitched-pages': 'Bewitched Pages', 'beyond-the-pages': 'Beyond the Pages',
  'bibleophile-custom-sprayed-edges': 'Bibleophile',
  'blackraven-books': 'Blackraven Books', 'blush-book-box': 'Blush Book Box',
  'bookaholic': 'Bookaholic', 'books-for-days': 'Books for Days Crate',
  'books-for-days-crate-romance': 'Books for Days Crate',
  'bright-side-candles-pre-orders': 'Bright Side Candles',
  'chapter-55': 'Chapter 55', 'curious-king': 'Curious King',
  'custom-sprayed-edges': 'Custom Sprayed Edges',
  'dark-and-disturbed': 'Dark and Disturbed',
  'dirty-diction-fiction': 'Dirty Diction Fiction', 'dreamerwhale': 'Dreamerwhale',
  'elysian-crates': 'Elysian Crates', 'endless-pages': 'Endless Pages',
  'endless-vines-%26-roses': 'Endless Vines & Roses',
  'euphoric-lit': 'Euphoric Lit', 'everheart-book-box': 'Everheart Book Box',
  'exclusi-books': 'Exclusi Books', 'faentasy-designs': 'Faentasy Designs',
  'fated-arcana': 'Fated Arcana', 'fated-pages': 'Fated Pages',
  'final-score': 'Final Score', 'forbidden-love-bookstore': 'Forbidden Love Bookstore',
  'foxglove-fantasy-fiction': 'Foxglove Fantasy Fiction',
  'haunted-hearts': 'Haunted Hearts', 'hear-me-out-by-lavish-library': 'Lavish Library',
  'indigo-exclusive': 'Indigo Exclusive', 'ink-pages': 'Ink Pages',
  'iridescent-fairytale': 'Iridescent Fairytale',
  'kingdom-book-designs': 'Kingdom Book Designs', 'knot-and-page': 'Knot and Page',
  'last-chapter-book-box': 'Last Chapter Book Box', 'lavish-library': 'Lavish Library',
  'lit-haven': 'Lit Haven', 'lit-pins-%26-co': 'Lit Pins & Co',
  'luna-%26-lore': 'Luna & Lore', 'lunarya': 'Lunarya',
  'mahogany-mail': 'Mahogany Mail', 'midnight-whispers': 'Midnight Whispers',
  'millennia-books': 'Millennia Books', 'mindsight': 'Mindsight',
  'mondlicht-b%C3%BCcher': 'Mondlicht Bücher', 'most-bookstores': 'Most Bookstores',
  'nostalgic-af-books': 'Nostalgic AF Books', 'novaflame': 'Novaflame',
  'novel-grounds': 'Novel Grounds', 'obsidian-descension': 'Obsidian Descension',
  'perfectly-edged': 'Perfectly Edged', 'prettygalxcrates': 'Pretty Galx Crates',
  'read-in-peace': 'Read in Peace', 'red-flags-%26-roses': 'Red Flags & Roses',
  'romance-era': 'Romance Era', 'romance-me': 'Romance Me',
  'roses-%26-thorns': 'Roses & Thorns', 'ruined-by-fiction': 'Ruined by Fiction',
  'sonny-book-box': 'Sonny Book Box', 'spiced-book-box': 'Spiced Book Box',
  'target-exclusive': 'Target', 'the-works': 'The Works',
  'twisted-fiction': 'Twisted Fiction', 'venom-and-lace-book-box': 'Venom and Lace Book Box',
  'venus-volumes': 'Venus Volumes', 'walmart-exclusives': 'Walmart',
  'waterstones': 'Waterstones',
}

interface CoverEntry {
  companySlug: string
  bookSlug: string
  editionSlug: string
  bookCoverUrl: string | null
  editionCoverUrl: string | null
}

function upgradeWixUrl(url: string): string {
  // Strip Wix resize parameters — get the original full-quality image
  const match = url.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+)/)
  return match ? match[1]! : url
}

function parseCoverEntries(content: string): CoverEntry[] {
  const entries: CoverEntry[] = []
  const lines = content.split('\n')
  let state: 'none' | 'company' | 'book' | 'edition' = 'none'
  let currentCompany = '', currentBook = '', currentBookCover: string | null = null

  const companyUrlRe = /\]\(https:\/\/www\.booksandspreadsheets\.com\/companies\/([^)]+)\)/
  const bookUrlRe    = /\]\(https:\/\/www\.booksandspreadsheets\.com\/books-1\/([^)]+)\)/
  const editionUrlRe = /\]\(https:\/\/www\.booksandspreadsheets\.com\/special-editions\/([^)]+)\)/
  const imgRe        = /!\[[^\]]*\]\((https:\/\/static\.wixstatic\.com[^)]+)\)/

  for (const line of lines) {
    if (line.includes('###### COMPANY')) { state = 'company'; continue }
    if (line.includes('###### BOOK'))    { state = 'book'; continue }
    if (line.includes('###### EDITION')) { state = 'edition'; continue }
    if (line.includes('###### SALE'))    { state = 'none'; continue }

    if (state === 'company') {
      const m = companyUrlRe.exec(line)
      if (m) { currentCompany = m[1]!; currentBook = ''; currentBookCover = null }
    } else if (state === 'book') {
      const bm = bookUrlRe.exec(line)
      const im = imgRe.exec(line)
      if (bm) currentBook = bm[1]!
      if (im) currentBookCover = upgradeWixUrl(im[1]!)
    } else if (state === 'edition') {
      const em = editionUrlRe.exec(line)
      const im = imgRe.exec(line)
      if (em && currentCompany && currentBook) {
        entries.push({
          companySlug: currentCompany,
          bookSlug: currentBook,
          editionSlug: em[1]!,
          bookCoverUrl: currentBookCover,
          editionCoverUrl: im ? upgradeWixUrl(im[1]!) : null,
        })
      }
    }
  }
  return entries
}

function toTitleCase(s: string): string {
  return s.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

function decodeSlug(slug: string): string {
  try { return decodeURIComponent(slug).replace(/-/g, ' ').trim() }
  catch { return slug.replace(/-/g, ' ').trim() }
}

async function loadAllInPages<T>(
  query: () => ReturnType<typeof supabase.from>['select'],
  pageSize = 1000
): Promise<T[]> {
  const results: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await (query() as any).range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    results.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return results
}

async function main() {
  const firecrawlDir = path.join(__dirname, '../.firecrawl')

  // 1. Parse all markdown files
  const allEntries = new Map<string, CoverEntry>()
  for (const file of fs.readdirSync(firecrawlDir).sort()) {
    if (!file.startsWith('bas-') || !file.endsWith('.md')) continue
    if (/^bas-\d{4}\.md$/.test(file)) continue
    const content = fs.readFileSync(path.join(firecrawlDir, file), 'utf-8')
    for (const e of parseCoverEntries(content)) {
      if (!allEntries.has(e.editionSlug)) allEntries.set(e.editionSlug, e)
    }
  }
  console.log(`Parsed ${allEntries.size} unique edition entries\n`)

  // 2. Preload all sources
  const { data: sources } = await supabase.from('source').select('id, name')
  const sourceByName = new Map<string, string>()
  for (const s of sources ?? []) sourceByName.set(s.name.toLowerCase(), s.id)
  console.log(`Loaded ${sourceByName.size} sources`)

  // 3. Preload all books (title → {id, hasCover})
  console.log('Loading books...')
  const allBooks = await loadAllInPages<{id: string; title: string; cover_image: string | null}>(
    () => supabase.from('book').select('id, title, cover_image')
  )
  const bookByTitle = new Map<string, {id: string; hasCover: boolean}>()
  for (const b of allBooks) {
    bookByTitle.set(b.title.toLowerCase(), { id: b.id, hasCover: !!b.cover_image })
  }
  console.log(`Loaded ${bookByTitle.size} books`)

  // 4. Preload all editions (book_id + source_id → {id, hasCover})
  console.log('Loading editions...')
  const allEditions = await loadAllInPages<{id: string; book_id: string; source_id: string; cover_image: string | null}>(
    () => supabase.from('edition').select('id, book_id, source_id, cover_image')
  )
  const editionByKey = new Map<string, {id: string; hasCover: boolean}>()
  for (const e of allEditions) {
    editionByKey.set(`${e.book_id}|${e.source_id}`, { id: e.id, hasCover: !!e.cover_image })
  }
  console.log(`Loaded ${editionByKey.size} editions\n`)

  // 5. Match entries and collect updates
  const editionUpdates: {id: string; cover_image: string}[] = []
  const bookUpdates: {id: string; cover_image: string}[] = []
  const bookCoverUpdated = new Set<string>()

  let notFound = 0

  for (const [, entry] of allEntries) {
    const sourceName = COMPANY_MAP[entry.companySlug]
    if (!sourceName) continue
    const sourceId = sourceByName.get(sourceName.toLowerCase())
    if (!sourceId) continue

    // Match book via progressive slug trimming
    const words = decodeSlug(entry.bookSlug).split(' ').filter(Boolean)
    let bookId: string | null = null
    let bookHasCover = false

    for (let trim = 0; trim <= 3 && !bookId; trim++) {
      if (words.length - trim < 1) break
      const candidate = toTitleCase(words.slice(0, words.length - trim).join(' ')).toLowerCase()
      const found = bookByTitle.get(candidate)
      if (found) { bookId = found.id; bookHasCover = found.hasCover }
    }

    if (!bookId) { notFound++; continue }

    // Find edition
    const editionKey = `${bookId}|${sourceId}`
    const edition = editionByKey.get(editionKey)
    if (!edition) { notFound++; continue }

    // Queue edition cover update (only if not already set)
    if (entry.editionCoverUrl && !edition.hasCover) {
      editionUpdates.push({ id: edition.id, cover_image: entry.editionCoverUrl })
      edition.hasCover = true // prevent duplicate updates
    }

    // Queue book cover update (only if not already set)
    if (entry.bookCoverUrl && !bookHasCover && !bookCoverUpdated.has(bookId)) {
      bookUpdates.push({ id: bookId, cover_image: entry.bookCoverUrl })
      bookCoverUpdated.add(bookId)
      // Update the in-memory map to prevent duplicate updates for same book
      const existing = bookByTitle.get(words.slice(0, words.length).join(' ').toLowerCase())
      if (existing) existing.hasCover = true
    }
  }

  console.log(`Queued ${editionUpdates.length} edition cover updates`)
  console.log(`Queued ${bookUpdates.length} book cover updates`)
  console.log(`Not matched: ${notFound}\n`)

  // 6. Execute updates in batches of 50
  const BATCH = 50

  console.log('Updating edition covers...')
  let editionDone = 0
  for (let i = 0; i < editionUpdates.length; i += BATCH) {
    const batch = editionUpdates.slice(i, i + BATCH)
    await Promise.all(batch.map(u =>
      supabase.from('edition').update({ cover_image: u.cover_image }).eq('id', u.id)
    ))
    editionDone += batch.length
    if (editionDone % 200 === 0) process.stdout.write(`  ${editionDone}/${editionUpdates.length}\n`)
  }

  console.log('Updating book covers...')
  let bookDone = 0
  for (let i = 0; i < bookUpdates.length; i += BATCH) {
    const batch = bookUpdates.slice(i, i + BATCH)
    await Promise.all(batch.map(u =>
      supabase.from('book').update({ cover_image: u.cover_image }).eq('id', u.id)
    ))
    bookDone += batch.length
    if (bookDone % 200 === 0) process.stdout.write(`  ${bookDone}/${bookUpdates.length}\n`)
  }

  console.log('\n=== Done ===')
  console.log(`Edition covers updated: ${editionUpdates.length}`)
  console.log(`Book covers updated:    ${bookUpdates.length}`)
  console.log(`Not matched in DB:      ${notFound}`)
}

main().catch(console.error)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Titles that are box sets, subscriptions, or non-books — skip entirely
const SKIP_PATTERNS = [
  /\bset\b/i, /\btrilogy\b/i, /\bduology\b/i, /\bduo\b/i, /\bseries\b/i,
  /\bvolumes?\b/i, /\bmonths?\b/i, /\bprepaid\b/i, /\bsubscription\b/i,
  /illumicrate\s+book\s+only/i, /afterlight\s+romance/i, /\bexclusive:\s*/i,
  /starbright science fiction/i, /evernight horror/i,
]

// Author strings that are clearly junk from the bad parser
const JUNK_AUTHORS = [
  'the author', 'unknown', 'both authors', 'the roots before the end',
  'one of her marks', 'a group o', 'a stunning new voice', 'the west centuries ago',
  'syd mills', 'jim di bartolo', 'gavin reece', 'andrew davis', 'chatty nora',
  'kay fine', 'kudriaken', 'kira yukishiro', 'ridart', 'fen inkwright',
  'invaders from the heavens', 'a pacifist code', 'fate now stand against each other',
  'finding a cure to the mysterious blight',
]

function isJunkAuthor(author: string): boolean {
  return JUNK_AUTHORS.includes(author.toLowerCase().trim()) || author.trim().length < 3
}

function shouldSkip(title: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(title))
}

// Clean the title for searching — strip "Exclusive:", publisher prefixes, etc.
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*$/g, '') // remove trailing parenthetical
    .replace(/^(illumicrate exclusive:|daphne press deluxe:|afterlight exclusive:)\s*/i, '')
    .replace(/\s+hardback book$/i, '')
    .replace(/\s+book only$/i, '')
    .trim()
}

interface OLResult {
  key: string
  title: string
  author_name?: string[]
  cover_i?: number
  subject?: string[]
}

async function searchOL(title: string, author?: string): Promise<OLResult | null> {
  try {
    const cleanedTitle = cleanTitle(title)
    // Try title + author first if we have a real author
    const q = author && !isJunkAuthor(author)
      ? `title:${encodeURIComponent(cleanedTitle)} author:${encodeURIComponent(author.split(' ').pop()!)}`
      : `title:${encodeURIComponent(cleanedTitle)}`

    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=1&fields=key,title,author_name,cover_i,subject`
    )
    const data = await res.json()
    const result = data.docs?.[0]
    if (!result) return null

    // Basic sanity check — returned title should loosely match
    const returnedTitle: string = (result.title ?? '').toLowerCase()
    const searchedTitle = cleanedTitle.toLowerCase()
    if (!returnedTitle.includes(searchedTitle.split(' ')[0]) &&
        !searchedTitle.includes(returnedTitle.split(' ')[0])) {
      return null
    }

    return result
  } catch { return null }
}

function pickGenre(subjects?: string[]): string | null {
  if (!subjects) return null
  const lower = subjects.map(s => s.toLowerCase())
  if (lower.some(s => s.includes('romance'))) return 'romance'
  if (lower.some(s => s.includes('fantasy'))) return 'fantasy'
  if (lower.some(s => s.includes('horror'))) return 'horror'
  if (lower.some(s => s.includes('science fiction'))) return 'sci-fi'
  if (lower.some(s => s.includes('mystery') || s.includes('thriller'))) return 'thriller'
  if (lower.some(s => s.includes('young adult'))) return 'ya'
  return null
}

async function run() {
  const { data: books, error } = await supabase
    .from('book')
    .select('id, title, author')
    .is('open_library_id', null)
    .is('google_books_id', null)
    .order('title')

  if (error) { console.error(error); process.exit(1) }
  console.log(`Found ${books?.length ?? 0} books to process\n`)

  let linked = 0
  let skipped = 0
  let failed = 0
  let deleted = 0

  for (const book of books ?? []) {
    // Skip box sets and subscription products — delete them if they have no user data
    if (shouldSkip(book.title)) {
      const { count } = await supabase
        .from('user_collection')
        .select('id', { count: 'exact', head: true })
        .eq('book_id', book.id)
      if ((count ?? 0) === 0) {
        await supabase.from('edition').delete().eq('book_id', book.id)
        await supabase.from('book').delete().eq('id', book.id)
        console.log(`  🗑 Deleted non-book: ${book.title}`)
        deleted++
      } else {
        console.log(`  ~ Skipping (has users): ${book.title}`)
        skipped++
      }
      await new Promise(r => setTimeout(r, 50))
      continue
    }

    const result = await searchOL(book.title, book.author)
    if (!result) {
      console.log(`  ✗ Not found: ${book.title}`)
      failed++
      await new Promise(r => setTimeout(r, 100))
      continue
    }

    const olId = result.key.replace('/works/', '')
    const realAuthor = result.author_name?.[0]
    const genre = pickGenre(result.subject)

    // Check for OL ID conflict
    const { data: conflict } = await supabase
      .from('book')
      .select('id')
      .eq('open_library_id', olId)
      .neq('id', book.id)
      .single()

    if (conflict) {
      // Move editions to the conflicting record and delete this one
      await supabase.from('edition').update({ book_id: conflict.id }).eq('book_id', book.id)
      await supabase.from('user_collection').update({ book_id: conflict.id }).eq('book_id', book.id)
      await supabase.from('book').delete().eq('id', book.id)
      console.log(`  ↪ Merged "${book.title}" into existing record`)
      linked++
      await new Promise(r => setTimeout(r, 100))
      continue
    }

    // Update with OL data
    const updates: Record<string, string | null> = {
      open_library_id: olId,
      cover_ol_id: result.cover_i?.toString() ?? null,
    }
    if (realAuthor && isJunkAuthor(book.author)) updates.author = realAuthor
    if (genre && !book.author) updates.genre = genre

    await supabase.from('book').update(updates).eq('id', book.id)
    console.log(`  ✓ ${book.title}${realAuthor && isJunkAuthor(book.author) ? ` → author: ${realAuthor}` : ''}`)
    linked++

    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\nDone. ${linked} linked/merged, ${deleted} deleted, ${skipped} skipped, ${failed} not found.`)
}

run().catch(console.error)

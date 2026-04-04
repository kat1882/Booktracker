import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function searchOL(title: string, author: string): Promise<{ olId: string; coverId: string | null; genre: string | null } | null> {
  try {
    // Try title + author first
    const query = author !== 'Unknown'
      ? `title:${encodeURIComponent(title)} author:${encodeURIComponent(author.split(' ').slice(-1)[0])}`
      : `title:${encodeURIComponent(title)}`

    const res = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=1&fields=key,title,cover_i,subject`
    )
    const data = await res.json()
    const result = data.docs?.[0]
    if (!result) return null

    const subjects: string[] = result.subject ?? []
    const lower = subjects.map((s: string) => s.toLowerCase())
    let genre: string | null = null
    if (lower.some(s => s.includes('romance'))) genre = 'romance'
    else if (lower.some(s => s.includes('fantasy'))) genre = 'fantasy'
    else if (lower.some(s => s.includes('horror'))) genre = 'horror'
    else if (lower.some(s => s.includes('science fiction'))) genre = 'sci-fi'
    else if (lower.some(s => s.includes('mystery') || s.includes('thriller'))) genre = 'thriller'
    else if (lower.some(s => s.includes('young adult'))) genre = 'ya'

    return {
      olId: result.key.replace('/works/', ''),
      coverId: result.cover_i?.toString() ?? null,
      genre,
    }
  } catch { return null }
}

async function run() {
  // Get all books missing open_library_id
  const { data: books, error } = await supabase
    .from('book')
    .select('id, title, author')
    .is('open_library_id', null)
    .order('title')

  if (error) { console.error(error); process.exit(1) }
  console.log(`Found ${books?.length ?? 0} books without Open Library IDs\n`)

  let linked = 0
  let failed = 0

  for (const book of books ?? []) {
    const result = await searchOL(book.title, book.author)

    if (!result) {
      console.log(`  ✗ Not found: ${book.title}`)
      failed++
      await new Promise(r => setTimeout(r, 100))
      continue
    }

    // Check if another book already has this OL ID
    const { data: conflict } = await supabase
      .from('book')
      .select('id')
      .eq('open_library_id', result.olId)
      .neq('id', book.id)
      .single()

    if (conflict) {
      console.log(`  ~ OL ID conflict: ${book.title}`)
      failed++
      await new Promise(r => setTimeout(r, 100))
      continue
    }

    const { error: updateErr } = await supabase
      .from('book')
      .update({
        open_library_id: result.olId,
        cover_ol_id: result.coverId,
        ...(result.genre && !book.author ? { genre: result.genre } : {}),
      })
      .eq('id', book.id)

    if (updateErr) {
      console.log(`  ✗ Update failed: ${book.title} — ${updateErr.message}`)
      failed++
    } else {
      console.log(`  ✓ ${book.title}`)
      linked++
    }

    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\nDone. ${linked} linked, ${failed} failed.`)
}

run().catch(console.error)

import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { book_id, book_meta, isbn, format, publisher, year, cover_url, status } = await request.json()

  // Ensure user_profile exists
  await supabase.from('user_profile').upsert(
    { id: user.id, username: user.email!.split('@')[0] },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Find or create the book in our DB
  let bookId: string | null = book_id ?? null

  if (!bookId && book_meta) {
    // Try to find by external ID first
    if (book_meta.google_books_id) {
      const { data } = await supabase.from('book').select('id').eq('google_books_id', book_meta.google_books_id).maybeSingle()
      bookId = data?.id ?? null
    }
    if (!bookId && book_meta.open_library_id) {
      const { data } = await supabase.from('book').select('id').eq('open_library_id', book_meta.open_library_id).maybeSingle()
      bookId = data?.id ?? null
    }
    if (!bookId) {
      const { data } = await supabase.from('book').insert({
        title: book_meta.title,
        author: book_meta.author,
        genre: book_meta.genre ?? null,
        google_books_id: book_meta.google_books_id ?? null,
        open_library_id: book_meta.open_library_id ?? null,
        cover_image: book_meta.cover_image ?? null,
        synopsis: book_meta.synopsis ?? null,
        page_count: book_meta.page_count ?? null,
      }).select('id').single()
      bookId = data?.id ?? null
    }
  }

  if (!bookId) return NextResponse.json({ error: 'Could not resolve book' }, { status: 400 })

  // Find or create the specific edition by ISBN
  let editionId: string | null = null

  if (isbn) {
    const { data } = await supabase.from('edition').select('id').eq('isbn', isbn).maybeSingle()
    editionId = data?.id ?? null
  }

  if (!editionId) {
    const editionName = [format, publisher, year].filter(Boolean).join(' · ') || 'Standard Edition'
    const { data, error } = await supabase.from('edition').insert({
      book_id: bookId,
      edition_name: editionName,
      edition_type: 'standard',
      isbn: isbn ?? null,
      publisher: publisher ?? null,
      release_month: year ?? null,
      cover_image: cover_url ?? null,
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    editionId = data.id
  }

  // Find or update existing shelf entry for this edition
  const { data: existing } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', user.id)
    .eq('edition_id', editionId)
    .maybeSingle()

  if (existing) {
    await supabase.from('user_collection').update({ reading_status: status }).eq('id', existing.id)
  } else {
    await supabase.from('user_collection').insert({
      user_id: user.id,
      edition_id: editionId,
      book_id: bookId,
      reading_status: status,
    })
  }

  return NextResponse.json({ ok: true, edition_id: editionId })
}

import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { book, status } = await request.json()

  // Check if book already exists by google_books_id or open_library_id
  let existingId: string | null = null

  if (book.google_books_id) {
    const { data } = await supabase
      .from('book')
      .select('id')
      .eq('google_books_id', book.google_books_id)
      .single()
    existingId = data?.id ?? null
  }

  if (!existingId && book.open_library_id) {
    const { data } = await supabase
      .from('book')
      .select('id')
      .eq('open_library_id', book.open_library_id)
      .single()
    existingId = data?.id ?? null
  }

  let bookId = existingId

  if (!bookId) {
    const { data: newBook, error } = await supabase
      .from('book')
      .insert({
        title: book.title,
        author: book.author,
        genre: book.genre ?? null,
        original_pub_date: book.first_publish_year ? `${book.first_publish_year}-01-01` : null,
        open_library_id: book.open_library_id ?? null,
        cover_ol_id: book.cover_ol_id ?? null,
        google_books_id: book.google_books_id ?? null,
        cover_image: book.cover_image ?? null,
        synopsis: book.synopsis ?? null,
        page_count: book.page_count ?? null,
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    bookId = newBook.id
  }

  // Upsert shelf entry
  const { error: collectionError } = await supabase
    .from('user_collection')
    .upsert(
      { user_id: user.id, book_id: bookId, reading_status: status },
      { onConflict: 'user_id,book_id' }
    )

  if (collectionError) return NextResponse.json({ error: collectionError.message }, { status: 500 })

  return NextResponse.json({ bookId })
}

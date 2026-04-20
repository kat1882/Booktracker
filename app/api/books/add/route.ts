import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { book, status } = await request.json()

  // If a direct UUID was passed, use it
  let bookId: string | null = book.id ?? null

  if (!bookId && book.google_books_id) {
    const { data } = await supabase.from('book').select('id').eq('google_books_id', book.google_books_id).maybeSingle()
    bookId = data?.id ?? null
  }
  if (!bookId && book.open_library_id) {
    const { data } = await supabase.from('book').select('id').eq('open_library_id', book.open_library_id).maybeSingle()
    bookId = data?.id ?? null
  }
  if (!bookId && book.title && book.author) {
    const { data } = await supabase.from('book').select('id').eq('title', book.title).eq('author', book.author).maybeSingle()
    bookId = data?.id ?? null
  }

  if (!bookId) {
    return NextResponse.json({ error: 'not_in_database', message: 'This book is not in our database yet.' }, { status: 404 })
  }

  const { error } = await supabase
    .from('user_collection')
    .upsert(
      { user_id: user.id, book_id: bookId, reading_status: status },
      { onConflict: 'user_id,book_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookId })
}

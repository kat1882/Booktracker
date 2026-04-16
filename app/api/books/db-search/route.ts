import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ books: [] })

  const [byTitle, byAuthor] = await Promise.all([
    supabase.from('book_browse').select('id, title, author, book_cover, genre').ilike('title', `%${q}%`).order('title').limit(20),
    supabase.from('book_browse').select('id, title, author, book_cover, genre').ilike('author', `%${q}%`).order('title').limit(20),
  ])

  const seen = new Set<string>()
  const data = [...(byTitle.data ?? []), ...(byAuthor.data ?? [])].filter(b => {
    if (seen.has(b.id)) return false
    seen.add(b.id)
    return true
  }).slice(0, 20).map(b => ({ ...b, cover_image: b.book_cover }))

  return NextResponse.json({ books: data ?? [] })
}

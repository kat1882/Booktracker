import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'
const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  const { data: books } = await anon
    .from('book')
    .select('id, title, author')
    .ilike('title', `%${q}%`)
    .order('title')
    .limit(30)

  if (!books?.length) return NextResponse.json({ books: [] })

  // Count editions per book
  const ids = books.map(b => b.id)
  const { data: counts } = await anon
    .from('edition')
    .select('book_id')
    .in('book_id', ids)

  const countMap: Record<string, number> = {}
  for (const row of counts ?? []) {
    countMap[row.book_id] = (countMap[row.book_id] ?? 0) + 1
  }

  return NextResponse.json({
    books: books.map(b => ({ ...b, edition_count: countMap[b.id] ?? 0 })),
  })
}

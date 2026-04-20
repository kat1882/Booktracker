import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'
const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const selectFields = 'id, edition_name, edition_type, cover_image, original_retail_price, estimated_value, isbn, book:book_id(id, title, author), source:source_id(name)'

  if (!q) {
    const { data } = await anon.from('edition').select(selectFields).order('edition_name').limit(50)
    return NextResponse.json({ editions: data ?? [] })
  }

  const [byEditionName, byBookTitle] = await Promise.all([
    anon.from('edition').select(selectFields).ilike('edition_name', `%${q}%`).order('edition_name').limit(50),
    anon.from('edition').select(selectFields).filter('book.title', 'ilike', `%${q}%`).not('book', 'is', null).order('edition_name').limit(50),
  ])

  const seen = new Set<string>()
  const merged = [...(byEditionName.data ?? []), ...(byBookTitle.data ?? [])].filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  }).slice(0, 50)

  return NextResponse.json({ editions: merged })
}

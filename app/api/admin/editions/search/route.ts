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

  let query = anon
    .from('edition')
    .select('id, edition_name, edition_type, cover_image, original_retail_price, estimated_value, isbn, book:book_id(title, author), source:source_id(name)')
    .order('edition_name')
    .limit(50)

  if (q) query = query.ilike('edition_name', `%${q}%`)

  const { data } = await query
  return NextResponse.json({ editions: data ?? [] })
}

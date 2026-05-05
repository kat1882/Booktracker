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
  const field = searchParams.get('field') ?? 'edition'

  const selectFields = 'id, book_id, edition_name, edition_type, cover_image, original_retail_price, estimated_value, price_override, isbn, set_size, publisher, release_month, print_run_size, cover_artist, edge_treatment, binding, foiling, signature_type, extras, notes, sku, mercari_median, ebay_median, value_updated_at, book:book_id(id, title, author), source:source_id(id, name)'

  if (!q) {
    const { data } = await anon.from('edition').select(selectFields).order('edition_name').limit(60)
    return NextResponse.json({ editions: data ?? [] })
  }

  let results: any[] = []

  if (field === 'author') {
    const { data } = await anon.from('edition').select(selectFields)
      .ilike('book.author', `%${q}%`).not('book', 'is', null).order('edition_name').limit(60)
    results = data ?? []
  } else if (field === 'source') {
    const { data } = await anon.from('edition').select(selectFields)
      .ilike('source.name', `%${q}%`).not('source', 'is', null).order('edition_name').limit(60)
    results = data ?? []
  } else if (field === 'title') {
    const { data } = await anon.from('edition').select(selectFields)
      .ilike('book.title', `%${q}%`).not('book', 'is', null).order('edition_name').limit(60)
    results = data ?? []
  } else {
    // Default: edition name + book title combined
    const [byName, byTitle] = await Promise.all([
      anon.from('edition').select(selectFields).ilike('edition_name', `%${q}%`).order('edition_name').limit(60),
      anon.from('edition').select(selectFields).ilike('book.title', `%${q}%`).not('book', 'is', null).order('edition_name').limit(60),
    ])
    const seen = new Set<string>()
    results = [...(byName.data ?? []), ...(byTitle.data ?? [])].filter(e => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
  }

  return NextResponse.json({ editions: results.slice(0, 60) })
}

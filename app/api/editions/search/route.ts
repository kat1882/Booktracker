import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ editions: [] })

  const editionSelect = `id, edition_name, cover_image, edition_type, original_retail_price, estimated_value,
    book:book_id ( title, author ),
    source:source_id ( name )`

  // Search by edition name AND by book title (via book IDs)
  const [{ data: byEditionName }, { data: bookMatches }] = await Promise.all([
    supabase.from('edition').select(editionSelect).ilike('edition_name', `%${q}%`).limit(20),
    supabase.from('book').select('id').ilike('title', `%${q}%`).limit(20),
  ])

  // Fetch editions for matching books
  const bookIds = (bookMatches ?? []).map(b => b.id)
  const { data: byBookTitle } = bookIds.length > 0
    ? await supabase.from('edition').select(editionSelect).in('book_id', bookIds).limit(20)
    : { data: [] }

  // Merge, deduplicate by id
  const seen = new Set<string>()
  const editions = [...(byEditionName ?? []), ...(byBookTitle ?? [])].filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  }).slice(0, 30)

  return NextResponse.json({ editions })
}

import { createClient } from '@supabase/supabase-js'
import BrowseView from './BrowseView'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PAGE_SIZE = 24

interface SearchParams {
  q?: string
  type?: string
  genre?: string
  priceMin?: string
  priceMax?: string
  sort?: string
  page?: string
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const sourceType = params.type ?? ''
  const genre = params.genre ?? ''
  const priceMin = params.priceMin ? parseFloat(params.priceMin) : null
  const priceMax = params.priceMax ? parseFloat(params.priceMax) : null
  const sort = params.sort ?? 'value'
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Build edition search query
  let query = supabase
    .from('edition_search')
    .select('id, edition_name, cover_image, estimated_value, set_size, book_id, book_title, book_author, book_genre, source_name, source_type', { count: 'exact' })
    .range(from, to)

  if (q) {
    query = query.or(`book_title.ilike.%${q}%,book_author.ilike.%${q}%,edition_name.ilike.%${q}%`)
  }
  if (sourceType) {
    query = query.eq('source_type', sourceType)
  }
  if (genre) {
    query = query.eq('book_genre', genre)
  }
  if (priceMin !== null) {
    query = query.gte('estimated_value', priceMin)
  }
  if (priceMax !== null) {
    query = query.lte('estimated_value', priceMax)
  }

  if (sort === 'value') {
    query = query.order('estimated_value', { ascending: false, nullsFirst: false })
  } else if (sort === 'title') {
    query = query.order('book_title', { ascending: true })
  } else if (sort === 'new') {
    query = query.order('id', { ascending: false })
  }

  const { data: editions, count } = await query

  // Trending: top 8 highest-value editions
  const { data: trending } = await supabase
    .from('edition_search')
    .select('id, edition_name, cover_image, estimated_value, set_size, book_id, book_title, book_author, source_name, source_type')
    .not('estimated_value', 'is', null)
    .order('estimated_value', { ascending: false })
    .limit(8)

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <BrowseView
      editions={editions ?? []}
      trending={trending ?? []}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
      filters={{ q, sourceType, genre, priceMin, priceMax, sort }}
    />
  )
}

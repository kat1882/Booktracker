import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 3600

export default async function TrendingPage() {
  // Most collected editions (in user_collection)
  const { data: collected } = await supabase
    .from('user_collection')
    .select('edition_id')
    .not('edition_id', 'is', null)

  // Most wishlisted editions (in user_wishlist)
  const { data: wished } = await supabase
    .from('user_wishlist')
    .select('edition_id')

  // Tally counts
  const counts: Record<string, { collectors: number; wanters: number }> = {}
  for (const row of collected ?? []) {
    if (!row.edition_id) continue
    counts[row.edition_id] ??= { collectors: 0, wanters: 0 }
    counts[row.edition_id].collectors++
  }
  for (const row of wished ?? []) {
    counts[row.edition_id] ??= { collectors: 0, wanters: 0 }
    counts[row.edition_id].wanters++
  }

  // Sort by total activity, take top 50
  const topIds = Object.entries(counts)
    .sort((a, b) => (b[1].collectors + b[1].wanters) - (a[1].collectors + a[1].wanters))
    .slice(0, 50)
    .map(([id]) => id)

  let editions: {
    id: string; edition_name: string; cover_image?: string; estimated_value?: number
    book: { title: string; author: string }
    source?: { name: string }
  }[] = []

  if (topIds.length > 0) {
    const { data } = await supabase
      .from('edition')
      .select(`id, edition_name, cover_image, estimated_value, book:book_id ( title, author ), source:source_id ( name )`)
      .in('id', topIds)
    editions = (data ?? []) as typeof editions
    // Re-sort to match our ranking
    editions.sort((a, b) => {
      const aScore = (counts[a.id]?.collectors ?? 0) + (counts[a.id]?.wanters ?? 0)
      const bScore = (counts[b.id]?.collectors ?? 0) + (counts[b.id]?.wanters ?? 0)
      return bScore - aScore
    })
  }

  // If no user activity yet, show most recently added editions instead
  if (editions.length === 0) {
    const { data } = await supabase
      .from('edition')
      .select(`id, edition_name, cover_image, estimated_value, book:book_id ( title, author ), source:source_id ( name )`)
      .not('cover_image', 'is', null)
      .limit(50)
    editions = (data ?? []) as typeof editions
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Trending Editions</h1>
        <p className="text-sm text-gray-500 mt-1">Most collected and most wanted by the community</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {editions.map((edition, i) => {
          const c = counts[edition.id]
          const collectors = c?.collectors ?? 0
          const wanters = c?.wanters ?? 0
          return (
            <Link key={edition.id} href={`/edition/${edition.id}`} className="group bg-gray-900 border border-gray-800 hover:border-violet-700 rounded-xl overflow-hidden transition-colors">
              <div className="relative">
                <div className="aspect-[2/3] relative bg-gray-800">
                  {edition.cover_image ? (
                    <Image src={edition.cover_image} alt={edition.edition_name} fill className="object-cover" sizes="200px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs p-2 text-center">
                      {edition.edition_name}
                    </div>
                  )}
                </div>
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-white leading-tight line-clamp-2">{edition.book?.title}</p>
                {edition.source && (
                  <p className="text-xs text-violet-400 mt-0.5">{edition.source.name}</p>
                )}
                <div className="flex gap-2 mt-1.5">
                  {collectors > 0 && (
                    <span className="text-xs text-gray-500">📚 {collectors}</span>
                  )}
                  {wanters > 0 && (
                    <span className="text-xs text-gray-500">♥ {wanters}</span>
                  )}
                  {edition.estimated_value && (
                    <span className="text-xs text-emerald-400 ml-auto">${Number(edition.estimated_value).toFixed(0)}</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

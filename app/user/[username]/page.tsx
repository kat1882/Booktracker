import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, username, joined_at')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  const [{ data: collection }, { data: wishlist }] = await Promise.all([
    supabase
      .from('user_collection')
      .select(`
        id, reading_status, rating,
        edition:edition_id ( id, cover_image, edition_name, estimated_value, original_retail_price,
          source:source_id ( name )
        ),
        book:book_id ( title, author )
      `)
      .eq('user_id', profile.id)
      .order('reading_status'),
    supabase
      .from('user_wishlist')
      .select(`
        edition_id,
        edition:edition_id ( id, cover_image, edition_name,
          book:book_id ( title ),
          source:source_id ( name )
        )
      `)
      .eq('user_id', profile.id)
      .limit(12),
  ])

  const entries = (collection ?? []) as unknown as {
    id: string
    reading_status: string
    rating: number | null
    edition: { id: string; cover_image?: string; edition_name: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
    book: { title: string; author: string } | null
  }[]

  const wishItems = (wishlist ?? []) as unknown as {
    edition_id: string
    edition: { id: string; cover_image?: string; edition_name: string; book: { title: string }; source?: { name: string } }
  }[]

  const read = entries.filter(e => e.reading_status === 'read')
  const ratings = read.map(e => e.rating).filter((r): r is number => r !== null)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const collectionValue = entries.reduce((sum, e) => sum + Number(e.edition?.estimated_value ?? e.edition?.original_retail_price ?? 0), 0)

  const bySource: Record<string, number> = {}
  for (const e of entries) {
    if (!e.edition?.source?.name) continue
    bySource[e.edition.source.name] = (bySource[e.edition.source.name] ?? 0) + 1
  }
  const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0]

  const joinedYear = new Date(profile.joined_at).getFullYear()
  const withCovers = entries.filter(e => e.edition?.cover_image)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-violet-700 flex items-center justify-center text-2xl font-bold text-white">
          {profile.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
          <p className="text-sm text-gray-500">
            Collector since {joinedYear}
            {topSource && <span> · Mostly <span className="text-violet-400">{topSource[0]}</span></span>}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Editions', value: entries.length },
          { label: 'Books Read', value: read.length },
          { label: 'Avg Rating', value: avgRating ? `${avgRating.toFixed(1)} ★` : '—' },
          { label: 'Est. Value', value: collectionValue > 0 ? `$${collectionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Collection */}
      {withCovers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">
            Collection <span className="text-gray-500 font-normal text-sm ml-1">({entries.length})</span>
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {withCovers.slice(0, 32).map(e => (
              <Link key={e.id} href={`/edition/${e.edition!.id}`} className="group" title={e.book?.title}>
                <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden">
                  <Image
                    src={e.edition!.cover_image!}
                    alt={e.book?.title ?? ''}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="80px"
                  />
                  {e.reading_status === 'read' && (
                    <div className="absolute bottom-0 inset-x-0 bg-violet-600/80 text-white text-center text-[9px] py-0.5">Read</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {entries.length > 32 && (
            <p className="text-sm text-gray-600 mt-3 text-center">+{entries.length - 32} more editions</p>
          )}
        </section>
      )}

      {/* Wish list */}
      {wishItems.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Wish List <span className="text-gray-500 font-normal text-sm ml-1">({wishItems.length})</span></h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {wishItems.map(item => (
              <Link key={item.edition_id} href={`/edition/${item.edition.id}`} className="group" title={item.edition.book?.title}>
                <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden ring-1 ring-pink-800/50">
                  {item.edition.cover_image ? (
                    <Image src={item.edition.cover_image} alt={item.edition.edition_name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="80px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-1">{item.edition.book?.title}</div>
                  )}
                  <div className="absolute top-1 right-1 text-pink-400 text-xs">♥</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && wishItems.length === 0 && (
        <div className="text-center py-16 text-gray-500">This collector hasn&apos;t added anything yet.</div>
      )}
    </div>
  )
}

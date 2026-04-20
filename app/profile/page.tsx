import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Ensure profile exists
  await supabase.from('user_profile').upsert(
    { id: user.id, username: user.email!.split('@')[0] },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data: profile } = await supabase
    .from('user_profile')
    .select('username, country, joined_at, is_pro')
    .eq('id', user.id)
    .single()

  const isPro = profile?.is_pro ?? false

  const { data: collection } = await supabase
    .from('user_collection')
    .select(`
      id, reading_status, rating, date_read,
      edition:edition_id ( id, cover_image, edition_name, estimated_value, original_retail_price,
        source:source_id ( name )
      ),
      book:book_id ( title, author )
    `)
    .eq('user_id', user.id)
    .order('date_read', { ascending: false, nullsFirst: false })

  const { data: wishlist } = await supabase
    .from('user_wishlist')
    .select('edition_id')
    .eq('user_id', user.id)

  const entries = (collection ?? []) as unknown as {
    id: string
    reading_status: string
    rating: number | null
    date_read: string | null
    edition: { id: string; cover_image?: string; edition_name: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
    book: { title: string; author: string } | null
  }[]

  // Stats
  const read = entries.filter(e => e.reading_status === 'read')
  const ratings = read.map(e => e.rating).filter((r): r is number => r !== null)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const collectionValue = entries.reduce((sum, e) => sum + Number(e.edition?.estimated_value ?? e.edition?.original_retail_price ?? 0), 0)

  // Breakdown by source
  const bySource: Record<string, number> = {}
  for (const e of entries) {
    if (!e.edition?.source?.name) continue
    const name = e.edition.source.name
    bySource[name] = (bySource[name] ?? 0) + 1
  }
  const sourceList = Object.entries(bySource).sort((a, b) => b[1] - a[1])
  const maxSourceCount = sourceList[0]?.[1] ?? 1

  const username = profile?.username ?? user.email!.split('@')[0]
  const joinedYear = profile?.joined_at ? new Date(profile.joined_at).getFullYear() : new Date().getFullYear()

  // Recent covers with editions
  const recentWithCovers = entries.filter(e => e.edition?.cover_image).slice(0, 12)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-violet-700 flex items-center justify-center text-2xl font-bold text-white">
            {username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{username}</h1>
            <p className="text-sm text-gray-500">Collector since {joinedYear}</p>
            <Link href={`/user/${username}`} className="text-xs text-violet-400 hover:text-violet-300 mt-0.5 inline-block">
              View public profile →
            </Link>
          </div>
        </div>
        <Link href="/shelves" className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
          My Shelves
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Editions', value: entries.length },
          { label: 'Books Read', value: read.length },
          { label: 'On Wish List', value: wishlist?.length ?? 0 },
          { label: 'Avg Rating', value: avgRating ? `${avgRating.toFixed(1)} ★` : '—' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {isPro && collectionValue > 0 && (
        <div className="bg-gray-900 border border-emerald-900/50 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Est. collection value</p>
            <p className="text-3xl font-bold text-emerald-400">${collectionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/collection" className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 border border-emerald-800/30 px-3 py-1.5 rounded-lg">
              Value dashboard →
            </Link>
            <Link href="/marketplace" className="text-xs text-amber-400 hover:text-amber-300 bg-amber-900/20 border border-amber-800/30 px-3 py-1.5 rounded-lg">
              Marketplace →
            </Link>
          </div>
        </div>
      )}

      {/* Collection by source */}
      {sourceList.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Collection by Source</h2>
          <div className="space-y-2">
            {sourceList.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <Link href={`/browse?source=${encodeURIComponent(name)}`} className="text-sm text-gray-300 hover:text-violet-400 w-40 shrink-0 truncate transition-colors">
                  {name}
                </Link>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-violet-600 h-2 rounded-full transition-all"
                    style={{ width: `${(count / maxSourceCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent editions */}
      {recentWithCovers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Recent Additions</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {recentWithCovers.map(e => (
              <Link key={e.id} href={`/edition/${e.edition!.id}`} className="group">
                <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden">
                  <Image
                    src={e.edition!.cover_image!}
                    alt={e.book?.title ?? ''}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="80px"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Your collection is empty</p>
          <Link href="/browse" className="text-violet-400 hover:text-violet-300 text-sm">Browse editions to get started →</Link>
        </div>
      )}
    </div>
  )
}

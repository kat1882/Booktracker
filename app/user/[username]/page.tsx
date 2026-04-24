import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import CopyLinkButton from './CopyLinkButton'

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, username, display_name, bio, country, joined_at, is_pro, public_portfolio, show_market_value')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const joinedYear = profile.joined_at ? new Date(profile.joined_at).getFullYear() : new Date().getFullYear()
  const displayName = profile.display_name || profile.username
  const initial = displayName[0]?.toUpperCase() ?? '?'

  let entries: any[] = []
  let collectionValue = 0
  let signedCount = 0
  let sourceList: [string, number][] = []
  let maxSourceCount = 1

  if (profile.public_portfolio) {
    const { data: collection } = await supabase
      .from('user_collection')
      .select(`
        id, reading_status, edition_type,
        edition:edition_id(id, cover_image, edition_name, edition_type, estimated_value, original_retail_price, set_size, source:source_id(name)),
        book:book_id(title, author)
      `)
      .eq('user_id', profile.id)
      .eq('owned', true)
      .order('id', { ascending: false })

    entries = (collection ?? []) as unknown as any[]

    if (profile.show_market_value) {
      collectionValue = entries.reduce(
        (sum: number, e: any) => sum + Number(e.edition?.estimated_value ?? e.edition?.original_retail_price ?? 0) / (e.edition?.set_size ?? 1),
        0
      )
    }
    signedCount = entries.filter((e: any) => e.edition?.edition_type === 'signed').length

    const bySource: Record<string, number> = {}
    for (const e of entries) {
      const name = e.edition?.source?.name
      if (!name) continue
      bySource[name] = (bySource[name] ?? 0) + 1
    }
    sourceList = Object.entries(bySource).sort((a, b) => b[1] - a[1])
    maxSourceCount = sourceList[0]?.[1] ?? 1
  }

  // Fetch for-sale listings (always public — anyone can see what someone has for sale)
  const { data: forSaleRaw } = await supabase
    .from('user_collection')
    .select(`
      id, asking_price, condition, notes, photos,
      edition:edition_id(id, cover_image, edition_name, source:source_id(name)),
      book:book_id(id, title, author)
    `)
    .eq('user_id', profile.id)
    .eq('for_sale', true)
    .not('asking_price', 'is', null)
    .order('asking_price', { ascending: false })
  const forSaleListings = (forSaleRaw ?? []) as unknown as any[]

  // Check if viewing user is the owner
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  const withCovers = entries.filter((e: any) => e.edition?.cover_image)
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const stats = [
    { label: 'Editions', value: entries.length, icon: 'menu_book', color: 'text-violet-400' },
    ...(profile.show_market_value && collectionValue > 0 ? [{ label: 'Est. Value', value: `$${fmt(collectionValue)}`, icon: 'payments', color: 'text-emerald-400', mono: true }] : []),
    { label: 'Signed', value: signedCount, icon: 'history_edu', color: 'text-amber-400' },
    ...(forSaleListings.length > 0 ? [{ label: 'For Sale', value: forSaleListings.length, icon: 'sell', color: 'text-amber-400' }] : []),
  ]

  return (
    <div className="min-h-screen bg-[#0e131f]">
      {/* Nav bar */}
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">
          Shelfworth
        </Link>
        <div className="flex items-center gap-3">
          <CopyLinkButton username={username} />
          {isOwner && (
            <Link href="/profile" className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Profile
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full bg-violet-700 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-violet-900/60 ring-4 ring-violet-600/30">
                {initial}
              </div>
              {profile.is_pro && (
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-lg">
                  Pro
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">{displayName}</h1>
              {profile.display_name && (
                <p className="text-slate-500 text-sm mb-1">@{profile.username}</p>
              )}
              <p className="text-slate-400 text-sm">
                Book Collector · Member since {joinedYear}
                {profile.country && <span> · {profile.country}</span>}
              </p>
              {profile.bio && (
                <p className="text-slate-300 text-sm mt-3 max-w-md">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {profile.public_portfolio && entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-5">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{s.label}</p>
                <p className={`text-2xl font-bold text-white ${(s as any).mono ? 'font-mono' : ''} truncate`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Collection grid */}
        {profile.public_portfolio ? (
          withCovers.length > 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-1">Collection</p>
                  <h2 className="text-lg font-bold text-white">{entries.length} Editions</h2>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {withCovers.slice(0, 48).map((e: any) => (
                  <Link key={e.id} href={`/edition/${e.edition.id}`} className="group" title={e.book?.title}>
                    <div className="aspect-[2/3] relative bg-slate-800 rounded-lg overflow-hidden ring-1 ring-white/5 group-hover:ring-violet-500/50 transition-all duration-200">
                      <Image
                        src={e.edition.cover_image}
                        alt={e.book?.title ?? ''}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="80px"
                        unoptimized
                      />
                    </div>
                  </Link>
                ))}
              </div>
              {entries.length > 48 && (
                <p className="text-sm text-slate-600 mt-4 text-center">+{entries.length - 48} more editions</p>
              )}
            </div>
          ) : entries.length > 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8 text-center text-slate-500 mb-8">
              <span className="material-symbols-outlined text-3xl block mb-2">menu_book</span>
              <p>{entries.length} editions in collection</p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-12 text-center text-slate-600 mb-8">
              <span className="material-symbols-outlined text-4xl block mb-3">auto_stories</span>
              <p>No editions added yet.</p>
            </div>
          )
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-12 text-center text-slate-600 mb-8">
            <span className="material-symbols-outlined text-4xl block mb-3">lock</span>
            <p>This collector's shelf is private.</p>
          </div>
        )}

        {/* For Sale listings */}
        {forSaleListings.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">For Sale</p>
                <h2 className="text-lg font-bold text-white">{forSaleListings.length} Edition{forSaleListings.length !== 1 ? 's' : ''} Listed</h2>
              </div>
              <Link href="/marketplace" className="text-xs text-slate-500 hover:text-violet-300 transition-colors">
                View marketplace →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {forSaleListings.map((l: any) => (
                <Link key={l.id} href={`/marketplace/${l.id}`} className="group block">
                  <div className="aspect-[2/3] relative bg-slate-800 rounded-xl overflow-hidden mb-2 shadow-lg group-hover:-translate-y-1 transition-transform duration-200">
                    {l.edition?.cover_image ? (
                      <Image src={l.edition.cover_image} alt={l.book?.title ?? ''} fill className="object-cover" sizes="200px" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs p-2 text-center">{l.book?.title}</div>
                    )}
                    <div className="absolute top-2 left-2 bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase">
                      ${Number(l.asking_price).toFixed(0)}
                    </div>
                  </div>
                  <p className="text-slate-200 text-xs font-semibold line-clamp-1 group-hover:text-violet-300 transition-colors">{l.book?.title}</p>
                  {l.edition?.source?.name && <p className="text-violet-400 text-[10px] truncate">{l.edition.source.name}</p>}
                  {l.condition && <p className="text-slate-500 text-[10px]">{l.condition}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Source breakdown */}
        {profile.public_portfolio && sourceList.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6">
            <h3 className="font-bold text-white text-sm mb-5">Collection by Source</h3>
            <div className="space-y-3">
              {sourceList.slice(0, 8).map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 truncate w-32 shrink-0">{name}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-violet-500 h-1.5 rounded-full"
                      style={{ width: `${(count / maxSourceCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-5 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

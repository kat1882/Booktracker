'use client'

import Image from 'next/image'
import Link from 'next/link'

type Entry = {
  id: string
  reading_status: string
  rating: number | null
  date_read: string | null
  edition: {
    id: string
    cover_image?: string
    edition_name: string
    estimated_value?: number
    original_retail_price?: number
    source?: { name: string }
  } | null
  book: { title: string; author: string } | null
}

type SourceRow = [string, number]

export default function ProfileView({
  username,
  joinedYear,
  isPro,
  entries,
  wishlistCount,
  collectionValue,
  signedCount,
  thisYearCount,
  sourceList,
  maxSourceCount,
  recentWithCovers,
}: {
  username: string
  joinedYear: number
  isPro: boolean
  entries: Entry[]
  wishlistCount: number
  collectionValue: number
  signedCount: number
  thisYearCount: number
  sourceList: SourceRow[]
  maxSourceCount: number
  recentWithCovers: Entry[]
}) {
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  const initial = username[0]?.toUpperCase() ?? '?'
  const featuredShelf = recentWithCovers.slice(0, 6)
  const readCount = entries.filter(e => e.reading_status === 'read').length

  const stats = [
    { label: 'Total Editions', value: entries.length, icon: 'menu_book', color: 'text-violet-400' },
    { label: 'Est. Value', value: collectionValue > 0 ? `$${fmt(collectionValue)}` : '—', icon: 'payments', color: 'text-emerald-400', mono: true },
    { label: 'Signed Editions', value: signedCount, icon: 'history_edu', color: 'text-amber-400' },
    { label: 'This Year', value: thisYearCount, icon: 'calendar_month', color: 'text-blue-400' },
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e131f] flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col py-6 px-4 hidden md:flex border-r border-slate-800/50">
        <div className="mb-10 px-4">
          <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">My Collection</p>
        </div>

        <nav className="flex-1 space-y-1">
          <Link href="/shelves" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="font-medium text-sm">The Vault</span>
          </Link>
          <Link href="/shelves" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">auto_stories</span>
            <span className="font-medium text-sm">The Library</span>
          </Link>
          <Link href="/collection" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">analytics</span>
            <span className="font-medium text-sm">Intelligence</span>
          </Link>
          <Link href="/marketplace" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">local_mall</span>
            <span className="font-medium text-sm">The Exchange</span>
          </Link>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-3">
          <Link
            href="/browse"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add to Collection
          </Link>
          <div className="px-4 py-2 flex items-center gap-3 bg-violet-600/20 border border-violet-600/30 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initial}
            </div>
            <span className="text-violet-200 text-sm font-medium truncate">{username}</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/shelves" className="hover:text-slate-200 transition-colors">The Vault</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-white font-semibold">Profile</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/user/${username}`} className="text-xs text-violet-400 hover:text-violet-300 border border-violet-800/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Public Profile
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-10">

            {/* ── HERO ── */}
            <div className="relative mb-10 bg-slate-900/60 border border-slate-800/50 rounded-2xl p-8 overflow-hidden">
              {/* Glow */}
              <div className="absolute top-0 left-0 w-96 h-96 bg-violet-600/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-8">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-28 h-28 rounded-full bg-violet-700 flex items-center justify-center text-5xl font-black text-white shadow-2xl shadow-violet-900/60 ring-4 ring-violet-600/30">
                    {initial}
                  </div>
                  {isPro && (
                    <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-lg">
                      Pro
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h1 className="text-4xl font-black tracking-tight text-white mb-1">{username}</h1>
                  <p className="text-slate-400 text-sm mb-4">Book Collector · Member since {joinedYear}</p>
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    <Link href="/settings" className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit Profile
                    </Link>
                    <Link href={`/user/${username}`} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">share</span>
                      Share
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {stats.map(s => (
                <div key={s.label} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6 flex items-center justify-between group hover:border-slate-700 transition-colors">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-3xl font-bold ${s.mono ? 'font-mono' : ''} text-white`}>{s.value}</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-violet-600/20 transition-colors duration-300">
                    <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── MAIN CONTENT GRID ── */}
            <div className="grid grid-cols-12 gap-6">

              {/* Featured Shelf */}
              <div className="col-span-12 lg:col-span-8 bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-1">Highlights</p>
                    <h2 className="text-xl font-bold text-white">Featured Shelf</h2>
                  </div>
                  <Link href="/shelves" className="text-violet-400 text-sm font-semibold hover:text-violet-300 transition-colors flex items-center gap-1">
                    View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>

                {featuredShelf.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-600">
                    <p className="mb-3">No editions yet.</p>
                    <Link href="/browse" className="text-violet-400 hover:text-violet-300 text-sm">Browse editions →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-5">
                    {featuredShelf.map(entry => {
                      const value = entry.edition?.estimated_value ?? entry.edition?.original_retail_price
                      return (
                        <Link key={entry.id} href={entry.edition?.id ? `/edition/${entry.edition.id}` : '#'} className="group block">
                          <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-xl ring-1 ring-white/5 group-hover:ring-violet-500/50 transition-all duration-300 group-hover:-translate-y-1">
                            {entry.edition?.cover_image ? (
                              <Image
                                src={entry.edition.cover_image}
                                alt={entry.book?.title ?? ''}
                                fill
                                className="object-cover"
                                sizes="180px"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-600 text-xs text-center p-3">
                                {entry.book?.title?.slice(0, 30)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                              {value && (
                                <span className="text-emerald-400 font-mono font-bold text-sm">${fmt(Number(value))}</span>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <h3 className="text-white font-bold text-xs leading-tight truncate group-hover:text-violet-300 transition-colors">{entry.book?.title ?? 'Unknown'}</h3>
                            <p className="text-slate-500 text-[10px] truncate mt-0.5">{entry.book?.author}</p>
                            {entry.edition?.source?.name && (
                              <p className="text-violet-400 text-[10px] truncate mt-0.5">{entry.edition.source.name}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="col-span-12 lg:col-span-4 space-y-6">

                {/* Membership card */}
                <div className={`rounded-xl p-6 border ${isPro ? 'bg-gradient-to-br from-amber-900/30 to-slate-900/60 border-amber-700/40' : 'bg-slate-900/60 border-slate-800/50'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-sm">Membership</h3>
                    {isPro ? (
                      <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">Pro</span>
                    ) : (
                      <span className="bg-slate-700 text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">Free</span>
                    )}
                  </div>
                  {isPro ? (
                    <div className="space-y-2">
                      {['Market intelligence', 'Collection valuation', 'Advanced filters', 'Priority support'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="material-symbols-outlined text-amber-400 text-sm">check_circle</span>
                          {f}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-400 text-xs mb-4">Unlock valuation, market data, and more with Pro.</p>
                      <Link href="/upgrade" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
                        <span className="material-symbols-outlined text-sm">star</span>
                        Upgrade to Pro
                      </Link>
                    </div>
                  )}
                </div>

                {/* Collection by source */}
                {sourceList.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6">
                    <h3 className="font-bold text-white text-sm mb-5">By Source</h3>
                    <div className="space-y-3">
                      {sourceList.slice(0, 6).map(([name, count]) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 truncate w-28 shrink-0">{name}</span>
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

                {/* Quick links */}
                <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6">
                  <h3 className="font-bold text-white text-sm mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    {[
                      { href: '/shelves', icon: 'dashboard', label: 'My Vault', sub: `${entries.length} editions` },
                      { href: '/collection', icon: 'analytics', label: 'Intelligence', sub: collectionValue > 0 ? `$${fmt(collectionValue)} value` : 'Market data' },
                      { href: '/marketplace', icon: 'local_mall', label: 'The Exchange', sub: 'Buy & sell' },
                      { href: '/wishlist', icon: 'bookmark', label: 'Wish List', sub: `${wishlistCount} editions` },
                    ].map(l => (
                      <Link key={l.href} href={l.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors group">
                        <span className="material-symbols-outlined text-slate-500 group-hover:text-violet-400 transition-colors text-lg">{l.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 font-medium">{l.label}</p>
                          <p className="text-xs text-slate-500">{l.sub}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-700 group-hover:text-slate-500 transition-colors text-sm">chevron_right</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg px-6 py-4 flex justify-around items-center z-10 border-t border-slate-800/50">
        <Link href="/shelves" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold uppercase">Vault</span>
        </Link>
        <Link href="/shelves" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">auto_stories</span>
          <span className="text-[10px] font-bold uppercase">Library</span>
        </Link>
        <Link href="/browse" className="w-12 h-12 -mt-8 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center">
          <span className="material-symbols-outlined">add</span>
        </Link>
        <Link href="/collection" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">analytics</span>
          <span className="text-[10px] font-bold uppercase">Intel</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-violet-400">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </Link>
      </nav>
    </div>
  )
}

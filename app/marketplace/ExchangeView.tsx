'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ForSaleEntry } from './page'

const CONDITION_BADGE: Record<string, string> = {
  'Near Mint': 'text-emerald-400 bg-emerald-900/20',
  'Fine':      'text-emerald-400 bg-emerald-900/20',
  'Very Good': 'text-blue-400 bg-blue-900/20',
  'Good':      'text-yellow-400 bg-yellow-900/20',
  'Fair':      'text-orange-400 bg-orange-900/20',
  'Poor':      'text-red-400 bg-red-900/20',
}

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const CONDITIONS = ['Near Mint', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor']

export default function ExchangeView({
  forSaleEntries,
  currentUserId,
  userName,
}: {
  forSaleEntries: ForSaleEntry[]
  currentUserId: string | null
  userName: string
}) {
  const [search, setSearch] = useState('')
  const [condFilter, setCondFilter] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  const sources = useMemo(() => {
    const s = new Set<string>()
    forSaleEntries.forEach(e => { if (e.edition?.source?.name) s.add(e.edition.source.name) })
    return [...s].sort()
  }, [forSaleEntries])

  const filtered = useMemo(() => {
    return forSaleEntries.filter(e => {
      if (search) {
        const q = search.toLowerCase()
        if (!e.book?.title?.toLowerCase().includes(q) && !e.book?.author?.toLowerCase().includes(q) && !e.edition?.source?.name?.toLowerCase().includes(q)) return false
      }
      if (condFilter && e.condition !== condFilter) return false
      if (maxPrice && e.asking_price > parseFloat(maxPrice)) return false
      if (sourceFilter && e.edition?.source?.name !== sourceFilter) return false
      return true
    })
  }, [forSaleEntries, search, condFilter, maxPrice, sourceFilter])

  const coverUrl = (e: ForSaleEntry) =>
    e.edition?.cover_image ??
    (e.book?.cover_ol_id ? `https://covers.openlibrary.org/b/id/${e.book.cover_ol_id}-M.jpg` : null)

  const hasFilters = search || condFilter || maxPrice || sourceFilter

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e131f] flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col py-6 px-4 hidden md:flex border-r border-slate-800/50">
        <div className="mb-10 px-4">
          <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">The Exchange</p>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { href: '/shelves',     label: 'The Vault',     icon: 'dashboard',   active: false },
            { href: '/shelves',     label: 'The Library',   icon: 'auto_stories',active: false },
            { href: '/collection',  label: 'Intelligence',  icon: 'analytics',   active: false },
            { href: '/marketplace', label: 'The Exchange',  icon: 'local_mall',  active: true  },
            { href: '/boxes',       label: 'Box Registry',  icon: 'inventory_2', active: false },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all duration-200 ${
                item.active ? 'bg-violet-600/20 text-violet-100' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Filters panel */}
        <div className="mt-6 pt-6 border-t border-slate-800/50 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Filters</p>

          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Condition</label>
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => setCondFilter(condFilter === c ? null : c)}
                  className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                    condFilter === c ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Max Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
              <input type="number" placeholder="Any" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {sources.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Box Source</label>
              <select value={sourceFilter ?? ''} onChange={e => setSourceFilter(e.target.value || null)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">All sources</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {hasFilters && (
            <button onClick={() => { setSearch(''); setCondFilter(null); setMaxPrice(''); setSourceFilter(null) }}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-3">
          <Link href="/browse" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>
            Add to Collection
          </Link>
          {currentUserId && (
            <Link href="/marketplace/inbox" className="px-4 py-2 flex items-center gap-3 text-slate-500 hover:text-slate-200 text-sm transition-colors rounded-lg hover:bg-slate-800">
              <span className="material-symbols-outlined text-lg">mail</span>
              My Inbox
            </Link>
          )}
          <Link href="/profile" className="px-4 py-2 flex items-center gap-3 text-slate-500 hover:text-slate-200 text-sm transition-colors rounded-lg hover:bg-slate-800">
            <span className="material-symbols-outlined text-lg">person</span>
            {userName}
          </Link>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">The Exchange</h1>
            <span className="text-xs text-slate-500 font-mono">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
              <input
                placeholder="Search title, author, box…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 rounded-full py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 w-56 transition-all"
              />
            </div>
            {currentUserId && (
              <Link href="/marketplace/inbox" className="relative text-slate-400 hover:text-white transition-colors p-2">
                <span className="material-symbols-outlined text-xl">mail</span>
              </Link>
            )}
            <Link href="/profile" className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-600/50 flex items-center justify-center text-violet-300 text-sm font-bold">
              {userName.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-8 max-w-screen-2xl mx-auto">

            {/* Hero */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-violet-400 uppercase tracking-[0.2em] text-xs font-bold mb-1 font-mono">Community Marketplace</p>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  {forSaleEntries.length > 0 ? `${forSaleEntries.length} Edition${forSaleEntries.length !== 1 ? 's' : ''} For Sale` : 'The Exchange'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">Rare and special editions listed by collectors.</p>
              </div>
              {currentUserId && (
                <Link href="/shelves" className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-sm">sell</span>
                  List an Edition
                </Link>
              )}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-2xl">
                <span className="material-symbols-outlined text-4xl text-slate-700 block mb-4">local_mall</span>
                <p className="text-slate-500 mb-1">{hasFilters ? 'No listings match your filters.' : 'No editions listed yet.'}</p>
                {hasFilters && (
                  <button onClick={() => { setSearch(''); setCondFilter(null); setMaxPrice(''); setSourceFilter(null) }}
                    className="text-violet-400 text-sm hover:text-violet-300 mt-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                {filtered.map(entry => {
                  const cover = coverUrl(entry)
                  const condStyle = entry.condition ? (CONDITION_BADGE[entry.condition] ?? 'text-slate-400 bg-slate-800') : null
                  const isOwn = entry.user_id === currentUserId

                  return (
                    <Link key={entry.id} href={`/marketplace/${entry.id}`} className="group block">
                      <div className="aspect-[2/3] bg-slate-800 rounded-xl overflow-hidden relative shadow-xl transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-violet-900/30 group-hover:ring-1 group-hover:ring-violet-500/40">
                        {cover ? (
                          <Image src={cover} alt={entry.book?.title ?? ''} fill className="object-cover" sizes="200px" unoptimized />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs text-center p-3">
                            {entry.book?.title?.slice(0, 30)}
                          </div>
                        )}

                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          <span className="bg-amber-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight">
                            {isOwn ? 'Your Listing' : 'For Sale'}
                          </span>
                          {entry.photos?.length > 0 && (
                            <span className="bg-slate-900/80 text-slate-300 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">photo_camera</span>
                              {entry.photos.length}
                            </span>
                          )}
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-white text-xs font-bold">View Listing →</span>
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-0.5">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-slate-100 text-xs leading-tight line-clamp-2 flex-1 group-hover:text-violet-300 transition-colors">
                            {entry.book?.title ?? 'Unknown'}
                          </h4>
                          <span className="font-mono font-bold text-violet-300 text-xs shrink-0">{fmt(entry.asking_price)}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] truncate">{entry.book?.author}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {condStyle && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${condStyle}`}>{entry.condition}</span>
                          )}
                          {entry.edition?.source?.name && (
                            <span className="text-violet-400 text-[10px] truncate">{entry.edition.source.name}</span>
                          )}
                        </div>
                        <Link href={`/user/${entry.seller_username}`} onClick={e => e.stopPropagation()} className="text-slate-600 hover:text-violet-400 text-[10px] transition-colors">@{entry.seller_username}</Link>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg px-6 py-4 flex justify-around items-center z-10 border-t border-slate-800/50">
        <Link href="/shelves" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold uppercase">Vault</span>
        </Link>
        <Link href="/browse" className="w-12 h-12 -mt-8 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center">
          <span className="material-symbols-outlined">add</span>
        </Link>
        <Link href="/marketplace" className="flex flex-col items-center gap-1 text-violet-400">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_mall</span>
          <span className="text-[10px] font-bold uppercase">Exchange</span>
        </Link>
        <Link href="/marketplace/inbox" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">mail</span>
          <span className="text-[10px] font-bold uppercase">Inbox</span>
        </Link>
      </nav>

    </div>
  )
}

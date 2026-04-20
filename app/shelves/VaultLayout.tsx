'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ShelvesClient from './ShelvesClient'
import PurchaseDetailsModal from './PurchaseDetailsModal'
import CollectionValueChart from '../collection/CollectionValueChart'

type ShelfEntry = {
  id: string
  reading_status: string | null
  owned: boolean
  rating: number | null
  date_read: string | null
  date_started: string | null
  condition: string | null
  purchase_price: number | null
  purchase_location: string | null
  purchase_date: string | null
  notes: string | null
  for_sale: boolean
  asking_price: number | null
  book: { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string; google_books_id?: string } | null
  edition: { id: string; edition_name: string; edition_type: string; cover_image?: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
}

type Stats = {
  total: number
  owned: number
  signed: number
  read: number
  reading: number
  wantToRead: number
  readThisYear: number
  avgRating: number | null
  totalValue: number
  totalRetail: number
  forSaleValue: number
  collectionValue: number | null
}

type Gainer = {
  id: string
  title: string
  source: string | null
  cover: string | null
  changePct: number
  changeAbs: number
  editionId: string
}

const SHELF_STATS_COMPAT = (s: Stats) => ({
  total: s.total,
  read: s.read,
  reading: s.reading,
  wantToRead: s.wantToRead,
  owned: s.owned,
  readThisYear: s.readThisYear,
  avgRating: s.avgRating,
  collectionValue: s.collectionValue,
})

const CONDITION_COLORS: Record<string, string> = {
  'Near Mint': 'text-emerald-400 bg-emerald-900/20',
  'Fine': 'text-green-400 bg-green-900/20',
  'Very Good': 'text-blue-400 bg-blue-900/20',
  'Good': 'text-yellow-400 bg-yellow-900/20',
  'Fair': 'text-orange-400 bg-orange-900/20',
  'Poor': 'text-red-400 bg-red-900/20',
}

export default function VaultLayout({
  entries,
  stats,
  recentOwned,
  valueOverTime,
  topGainers,
  isPro,
  userName,
}: {
  entries: ShelfEntry[]
  stats: Stats
  recentOwned: ShelfEntry[]
  valueOverTime: { date: string; value: number }[]
  topGainers: Gainer[]
  isPro: boolean
  userName: string
}) {
  const [view, setView] = useState<'vault' | 'library'>('vault')
  const [detailEntry, setDetailEntry] = useState<ShelfEntry | null>(null)
  const [localEntries, setLocalEntries] = useState(entries)

  async function handleUpdate(id: string, updates: Record<string, unknown>) {
    await fetch(`/api/shelf/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setLocalEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } as ShelfEntry : e))
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/shelf/${id}`, { method: 'DELETE' })
    if (res.ok) setLocalEntries(prev => prev.filter(e => e.id !== id))
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e131f] flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col py-6 px-4 hidden md:flex border-r border-slate-800/50">
        <div className="mb-10 px-4">
          <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">My Collection</p>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'vault', label: 'The Vault', icon: 'dashboard', action: () => setView('vault') },
            { id: 'library', label: 'The Library', icon: 'auto_stories', action: () => setView('library') },
          ].map(item => (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all duration-200 text-left ${
                view === item.id
                  ? 'bg-violet-600/20 text-violet-100'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: view === item.id ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}

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
            href="/search"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add to Collection
          </Link>
          <Link href="/profile" className="px-4 py-2 flex items-center gap-3 text-slate-500 hover:text-slate-200 text-sm transition-colors rounded-lg hover:bg-slate-800">
            <span className="material-symbols-outlined text-lg">person</span>
            {userName}
          </Link>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <span className={`text-sm font-semibold cursor-pointer transition-colors ${view === 'vault' ? 'text-violet-300 border-b-2 border-violet-500 pb-0.5' : 'text-slate-400 hover:text-white'}`} onClick={() => setView('vault')}>Dashboard</span>
            <span className={`text-sm font-semibold cursor-pointer transition-colors ${view === 'library' ? 'text-violet-300 border-b-2 border-violet-500 pb-0.5' : 'text-slate-400 hover:text-white'}`} onClick={() => setView('library')}>Library</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/search" className="hidden lg:flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 text-sm text-slate-500 hover:text-slate-200 hover:border-slate-700 transition-colors w-56">
              <span className="material-symbols-outlined text-sm">search</span>
              Search archives…
            </Link>
            <Link href="/profile" className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-600/50 flex items-center justify-center text-violet-300 text-sm font-bold">
              {userName.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">

          {/* ── VAULT DASHBOARD ── */}
          {view === 'vault' && (
            <div className="max-w-7xl mx-auto px-8 py-10">
              <div className="mb-10">
                <p className="text-violet-400 uppercase tracking-[0.2em] text-xs font-bold mb-2 font-mono">Portfolio Overview</p>
                <h1 className="text-4xl font-bold tracking-tight text-white">The Vault</h1>
              </div>

              <div className="grid grid-cols-12 gap-6">

                {/* Portfolio Value */}
                <div className="col-span-12 lg:col-span-8 bg-slate-900/60 border border-slate-800/50 rounded-xl p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-violet-600/10 transition-colors duration-500 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">Total Portfolio Value</h3>
                        <div className="flex items-baseline gap-3">
                          <span className="text-5xl font-bold font-mono tracking-tighter text-white">
                            {stats.totalValue > 0 ? `$${fmt(stats.totalValue)}` : '—'}
                          </span>
                          {stats.totalValue > stats.totalRetail && stats.totalRetail > 0 && (
                            <span className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold">
                              +{(((stats.totalValue - stats.totalRetail) / stats.totalRetail) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {stats.totalRetail > 0 && (
                          <p className="text-xs text-slate-500 mt-1">Retail paid: ${fmt(stats.totalRetail)}</p>
                        )}
                      </div>
                      {!isPro && (
                        <Link href="/upgrade" className="text-xs bg-violet-900/40 border border-violet-700/50 text-violet-300 px-3 py-1.5 rounded-lg hover:bg-violet-800/40 transition-colors">
                          Unlock Pro →
                        </Link>
                      )}
                    </div>
                    {valueOverTime.length > 1 ? (
                      <div className="mt-4">
                        <CollectionValueChart data={valueOverTime} />
                      </div>
                    ) : (
                      <div className="h-40 flex items-end gap-2 mt-4">
                        {[40, 55, 45, 70, 60, 85, 75, 90, 100].map((h, i) => (
                          <div key={i} className="flex-1 bg-violet-500/20 rounded-t-lg" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats column */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                  {[
                    { label: 'Total Volumes', value: stats.owned || stats.total, icon: 'menu_book' },
                    { label: 'Signed Editions', value: stats.signed, icon: 'history_edu' },
                    { label: 'Est. Liquidity', value: stats.forSaleValue > 0 ? `$${fmt(stats.forSaleValue)}` : `$${fmt(stats.totalValue)}`, icon: 'payments', mono: true },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6 flex items-center justify-between group">
                      <div>
                        <p className="text-slate-500 text-sm mb-1">{s.label}</p>
                        <p className={`text-3xl font-bold ${s.mono ? 'font-mono' : ''} text-white`}>{s.value}</p>
                      </div>
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-violet-600/30 transition-colors duration-300">
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-violet-300 transition-colors">{s.icon}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Acquisitions */}
                <div className="col-span-12">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold tracking-tight text-white">Recent Acquisitions</h3>
                    <button onClick={() => setView('library')} className="text-violet-400 text-sm font-semibold hover:text-violet-300 transition-colors flex items-center gap-1">
                      View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                  {recentOwned.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-600">
                      <p className="mb-3">No owned editions yet.</p>
                      <Link href="/search" className="text-violet-400 hover:text-violet-300 text-sm">Browse editions to add →</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                      {recentOwned.map(entry => {
                        const coverUrl = entry.edition?.cover_image
                          ?? (entry.book?.cover_ol_id ? `https://covers.openlibrary.org/b/id/${entry.book.cover_ol_id}-M.jpg` : null)
                        const editionHref = entry.edition?.id ? `/edition/${entry.edition.id}` : '#'
                        const condColor = entry.condition ? CONDITION_COLORS[entry.condition] ?? 'text-slate-400 bg-slate-800' : null
                        return (
                          <div key={entry.id} className="group cursor-pointer" onClick={() => setDetailEntry(entry)}>
                            <div className="aspect-[2/3] bg-slate-800 rounded-lg mb-3 overflow-hidden shadow-xl shadow-black/40 group-hover:-translate-y-1 transition-transform duration-300 relative">
                              {coverUrl ? (
                                <Image src={coverUrl} alt={entry.book?.title ?? ''} fill className="object-cover" sizes="120px" unoptimized />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs text-center p-2">{entry.book?.title?.slice(0, 20)}</div>
                              )}
                            </div>
                            <p className="font-semibold text-slate-100 text-xs leading-tight truncate group-hover:text-violet-300 transition-colors">{entry.book?.title ?? 'Unknown'}</p>
                            <div className="flex items-center justify-between mt-1">
                              {entry.edition?.estimated_value && (
                                <span className="text-emerald-400 text-xs font-mono font-bold">${Number(entry.edition.estimated_value).toFixed(0)}</span>
                              )}
                              {condColor && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${condColor}`}>{entry.condition}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Market Intelligence */}
                <div className="col-span-12 lg:col-span-4 bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                    <span className="material-symbols-outlined text-amber-400">trending_up</span>
                    Top Gainers
                  </h3>
                  {topGainers.length === 0 ? (
                    <p className="text-slate-500 text-sm">No market data yet. Add editions with prices to track gains.</p>
                  ) : (
                    <div className="space-y-5">
                      {topGainers.map((g, i) => (
                        <Link href={`/edition/${g.editionId}`} key={g.id} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-violet-400 font-mono text-sm shrink-0">
                            0{i + 1}
                          </div>
                          {g.cover && (
                            <div className="w-8 h-12 relative bg-slate-800 rounded overflow-hidden shrink-0">
                              <Image src={g.cover} alt={g.title} fill className="object-cover" sizes="32px" unoptimized />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-200 truncate">{g.title}</p>
                            <p className="text-xs text-slate-500 truncate">{g.source ?? 'Special Edition'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-emerald-400 font-mono text-sm font-bold">+{g.changePct.toFixed(0)}%</p>
                            <p className="text-xs text-slate-600">+${g.changeAbs.toFixed(0)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link href="/collection" className="w-full mt-8 py-3 rounded-xl border border-slate-700/50 text-slate-300 font-bold hover:bg-slate-800 transition-all text-sm flex items-center justify-center">
                    Full Intelligence Report
                  </Link>
                </div>

                {/* Archive Intelligence */}
                <div className="col-span-12 lg:col-span-8 bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
                  <h3 className="text-xl font-bold mb-6 text-white">Archive Intelligence</h3>
                  <div className="divide-y divide-slate-800">
                    {[
                      {
                        color: 'bg-violet-400 shadow-violet-400/60',
                        label: 'Collection Summary',
                        labelColor: 'text-violet-300',
                        body: `You own ${stats.owned} edition${stats.owned !== 1 ? 's' : ''} across ${stats.total} tracked books. ${stats.signed > 0 ? `${stats.signed} signed edition${stats.signed !== 1 ? 's' : ''} in your collection.` : ''}`,
                        time: 'Current',
                      },
                      {
                        color: 'bg-emerald-400 shadow-emerald-400/60',
                        label: 'Reading Progress',
                        labelColor: 'text-emerald-400',
                        body: `You've read ${stats.read} book${stats.read !== 1 ? 's' : ''} total — ${stats.readThisYear} this year.${stats.reading > 0 ? ` Currently reading ${stats.reading}.` : ''}`,
                        time: 'Updated now',
                      },
                      {
                        color: 'bg-amber-400 shadow-amber-400/60',
                        label: 'Market Opportunity',
                        labelColor: 'text-amber-400',
                        body: stats.forSaleValue > 0
                          ? `You have $${fmt(stats.forSaleValue)} listed for sale. Keep editions priced competitively to attract buyers.`
                          : `Your collection is valued at $${fmt(stats.totalValue)}. Consider listing editions on the Exchange to realise gains.`,
                        time: 'Market data',
                      },
                    ].map((alert, i) => (
                      <div key={i} className={`py-4 flex gap-4 items-start ${i === 0 ? 'pt-0' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mt-2 shadow-[0_0_8px] ${alert.color} shrink-0`} />
                        <div>
                          <p className="text-sm text-slate-200 leading-relaxed">
                            <span className={`font-bold ${alert.labelColor}`}>{alert.label}: </span>
                            {alert.body}
                          </p>
                          <span className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 block tracking-widest">{alert.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── LIBRARY VIEW ── */}
          {view === 'library' && (
            <div className="px-8 py-10">
              <div className="mb-8">
                <p className="text-violet-400 uppercase tracking-[0.2em] text-xs font-bold mb-2 font-mono">My Collection</p>
                <h1 className="text-4xl font-bold tracking-tight text-white">The Library</h1>
              </div>
              <ShelvesClient
                initialEntries={localEntries}
                stats={SHELF_STATS_COMPAT(stats)}
                isPro={isPro}
              />
            </div>
          )}

        </main>
      </div>

      {/* Purchase details modal */}
      {detailEntry && (
        <PurchaseDetailsModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          onUpdate={(id, updates) => {
            handleUpdate(id, updates)
            setDetailEntry(prev => prev?.id === id ? { ...prev, ...updates } as ShelfEntry : prev)
          }}
        />
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg px-6 py-4 flex justify-around items-center z-10 border-t border-slate-800/50">
        <button onClick={() => setView('vault')} className={`flex flex-col items-center gap-1 ${view === 'vault' ? 'text-violet-400' : 'text-slate-500'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'vault' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span className="text-[10px] font-bold uppercase">Vault</span>
        </button>
        <button onClick={() => setView('library')} className={`flex flex-col items-center gap-1 ${view === 'library' ? 'text-violet-400' : 'text-slate-500'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'library' ? "'FILL' 1" : "'FILL' 0" }}>auto_stories</span>
          <span className="text-[10px] font-bold uppercase">Library</span>
        </button>
        <Link href="/search" className="w-12 h-12 -mt-8 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center">
          <span className="material-symbols-outlined">add</span>
        </Link>
        <Link href="/collection" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">analytics</span>
          <span className="text-[10px] font-bold uppercase">Intel</span>
        </Link>
        <Link href="/marketplace" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">local_mall</span>
          <span className="text-[10px] font-bold uppercase">Market</span>
        </Link>
      </nav>

    </div>
  )
}

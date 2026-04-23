'use client'

import Image from 'next/image'
import Link from 'next/link'
import CollectionValueChart from './CollectionValueChart'

type Edition = {
  id: string
  edition_name: string
  cover_image?: string
  original_retail_price?: number
  estimated_value?: number
  book: { title: string; author: string } | null
  source: { name: string } | null
  changePct?: number
  changeAbs?: number
}

type SourceEntry = { name: string; count: number; value: number }

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtFull = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function IntelligenceView({
  featured,
  totalValue,
  totalRetail,
  editionCount,
  valuedCount,
  topGainers,
  topLosers,
  sourceList,
  valueOverTime,
  userName,
}: {
  featured: Edition | null
  totalValue: number
  totalRetail: number
  editionCount: number
  valuedCount: number
  topGainers: Edition[]
  topLosers: Edition[]
  sourceList: SourceEntry[]
  valueOverTime: { date: string; value: number }[]
  userName: string
}) {
  const appreciation = totalRetail > 0 ? ((totalValue - totalRetail) / totalRetail) * 100 : null
  const gainLoss = totalValue - totalRetail
  const maxSource = sourceList[0]?.value ?? 1

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
            { href: '/shelves',     label: 'The Vault',    icon: 'dashboard',    active: false },
            { href: '/shelves',     label: 'The Library',  icon: 'auto_stories', active: false },
            { href: '/collection',  label: 'Intelligence', icon: 'analytics',    active: true  },
            { href: '/marketplace', label: 'The Exchange', icon: 'local_mall',   active: false },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all duration-200 ${
                item.active
                  ? 'bg-violet-600/20 text-violet-100'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-3">
          <Link href="/browse" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
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
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
            <Link href="/shelves" className="hover:text-violet-300 transition-colors">The Vault</Link>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-violet-400">Intelligence Report</span>
          </div>
          <Link href="/profile" className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-600/50 flex items-center justify-center text-violet-300 text-sm font-bold">
            {userName.slice(0, 1).toUpperCase()}
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-6xl mx-auto space-y-16">

            {/* Hero bento */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Featured cover */}
              <div className="lg:col-span-5 relative group">
                <div className="absolute -inset-4 bg-violet-600/5 rounded-2xl blur-3xl group-hover:bg-violet-600/10 transition-all duration-700 pointer-events-none" />
                <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-[2/3] shadow-[inset_0_0_10px_rgba(0,0,0,0.5),15px_15px_30px_rgba(0,0,0,0.4)]">
                  {featured?.cover_image ? (
                    <Image src={featured.cover_image} alt={featured.book?.title ?? ''} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="300px" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm text-center p-4">
                      {featured?.book?.title ?? 'Add priced editions to see your top asset'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Stats */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {appreciation !== null && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        appreciation >= 0
                          ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                          : 'bg-red-400/10 text-red-400 border-red-400/20'
                      }`}>
                        {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}% Appreciation
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-violet-400/10 text-violet-400 text-[10px] font-bold uppercase tracking-widest border border-violet-400/20">
                      Active Portfolio
                    </span>
                  </div>
                  {featured ? (
                    <>
                      <h2 className="text-5xl font-bold tracking-tight text-white leading-[0.9]">{featured.book?.title}</h2>
                      <p className="text-xl text-slate-400 font-medium tracking-tight">
                        {featured.book?.author}{featured.source?.name ? ` · ${featured.source.name}` : ''}
                      </p>
                    </>
                  ) : (
                    <h2 className="text-4xl font-bold tracking-tight text-white">Your Intelligence Report</h2>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-xl bg-slate-900/60 border-l-2 border-violet-500/30 hover:bg-slate-900 transition-all">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">Portfolio Value</p>
                    <p className="text-3xl font-mono font-medium text-violet-300">{totalValue > 0 ? fmtFull(totalValue) : '—'}</p>
                  </div>
                  <div className="p-6 rounded-xl bg-slate-900/60 border-l-2 border-emerald-500/30 hover:bg-slate-900 transition-all">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">{gainLoss >= 0 ? 'Total Gain' : 'Total Loss'}</p>
                    <p className={`text-3xl font-mono font-medium ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {totalRetail > 0 ? `${gainLoss >= 0 ? '+' : ''}${fmtFull(gainLoss)}` : '—'}
                    </p>
                  </div>
                </div>

                {featured?.estimated_value && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">history_edu</span> Top Asset
                    </h3>
                    <div className="p-6 rounded-xl bg-slate-900/40 text-slate-400 text-sm leading-relaxed border border-slate-800/50">
                      <span className="text-white font-bold">{featured.edition_name}</span>
                      {featured.source?.name && <span className="text-violet-400"> · {featured.source.name}</span>}
                      <span className="text-slate-500"> — currently valued at </span>
                      <span className="font-mono text-emerald-400 font-bold">{fmtFull(featured.estimated_value)}</span>
                      {featured.original_retail_price && (
                        <span className="text-slate-600"> (retail: ${fmt(featured.original_retail_price)})</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/50 flex items-center justify-between flex-wrap gap-4">
                  {[
                    { label: 'Editions', value: String(editionCount) },
                    { label: 'Priced', value: String(valuedCount) },
                    { label: 'Sources', value: String(sourceList.length) },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-xl font-bold text-white font-mono">{s.value}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Link href="/shelves" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Back to Vault
                  </Link>
                  <Link href="/browse" className="px-6 py-3 rounded-xl border border-slate-700 font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add Edition
                  </Link>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="space-y-6">
              <div className="flex items-end justify-between border-b border-slate-800/50 pb-4">
                <h3 className="text-2xl font-bold tracking-tight text-white">Appreciation Intelligence</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {valueOverTime.length > 1 ? (
                    <CollectionValueChart data={valueOverTime} />
                  ) : (
                    <div className="h-64 bg-slate-900/60 border border-slate-800/50 rounded-xl flex items-center justify-center text-slate-600 text-sm">
                      Not enough price history data yet.
                    </div>
                  )}
                </div>
                <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8 flex flex-col justify-center gap-6">
                  {[
                    { label: 'Appreciation', value: appreciation !== null ? `${appreciation >= 0 ? '+' : ''}${appreciation.toFixed(1)}%` : '—', color: appreciation !== null && appreciation >= 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'Priced Editions', value: `${valuedCount} / ${editionCount}`, color: 'text-amber-400' },
                    { label: 'Top Source', value: sourceList[0]?.name ?? '—', color: 'text-violet-300' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{s.label}</span>
                      <span className={`font-mono font-bold text-sm ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                  <div className="h-px bg-slate-800" />
                  <div className="flex items-center gap-2 text-xs text-slate-500 leading-relaxed">
                    <span className="material-symbols-outlined text-sm shrink-0">info</span>
                    Values based on Mercari sales data and edition retail prices.
                  </div>
                </div>
              </div>
            </div>

            {/* Gainers / Losers */}
            {(topGainers.length > 0 || (topLosers.length > 0 && topLosers[0].changePct! < 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {topGainers.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                      <span className="material-symbols-outlined text-emerald-400 text-sm">trending_up</span> Top Gainers
                    </h3>
                    <div className="space-y-5">
                      {topGainers.map((e, i) => (
                        <Link key={e.id} href={`/edition/${e.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-violet-400 font-mono text-xs shrink-0">0{i + 1}</div>
                          {e.cover_image && (
                            <div className="w-7 h-10 relative bg-slate-800 rounded overflow-hidden shrink-0">
                              <Image src={e.cover_image} alt={e.edition_name} fill className="object-cover" sizes="28px" unoptimized />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-200 truncate">{e.book?.title}</p>
                            <p className="text-xs text-slate-500 truncate">{e.source?.name ?? e.edition_name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-emerald-400 font-mono text-sm font-bold">+{e.changePct!.toFixed(0)}%</p>
                            <p className="text-xs text-slate-600">+${e.changeAbs!.toFixed(0)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {topLosers.length > 0 && topLosers[0].changePct! < 0 && (
                  <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                      <span className="material-symbols-outlined text-red-400 text-sm">trending_down</span> Biggest Drops
                    </h3>
                    <div className="space-y-5">
                      {topLosers.filter(e => e.changePct! < 0).map((e, i) => (
                        <Link key={e.id} href={`/edition/${e.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-500 font-mono text-xs shrink-0">0{i + 1}</div>
                          {e.cover_image && (
                            <div className="w-7 h-10 relative bg-slate-800 rounded overflow-hidden shrink-0">
                              <Image src={e.cover_image} alt={e.edition_name} fill className="object-cover" sizes="28px" unoptimized />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-200 truncate">{e.book?.title}</p>
                            <p className="text-xs text-slate-500 truncate">{e.source?.name ?? e.edition_name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-red-400 font-mono text-sm font-bold">{e.changePct!.toFixed(0)}%</p>
                            <p className="text-xs text-slate-600">${e.changeAbs!.toFixed(0)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Value by source */}
            {sourceList.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Value by Source</h3>
                <div className="space-y-4">
                  {sourceList.map(s => (
                    <div key={s.name} className="flex items-center gap-4">
                      <div className="w-32 text-sm text-slate-300 truncate shrink-0">{s.name}</div>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(s.value / maxSource) * 100}%` }} />
                      </div>
                      <div className="text-right shrink-0 w-28">
                        <span className="text-sm font-mono text-violet-300 font-bold">${fmt(s.value)}</span>
                        <span className="text-xs text-slate-600 ml-1">({s.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editionCount === 0 && (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-xl text-slate-600">
                <span className="material-symbols-outlined text-4xl block mb-4">analytics</span>
                <p className="mb-3">Add editions to your shelves to see your intelligence report.</p>
                <Link href="/browse" className="text-violet-400 hover:text-violet-300 text-sm">Browse editions →</Link>
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
        <Link href="/shelves" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">auto_stories</span>
          <span className="text-[10px] font-bold uppercase">Library</span>
        </Link>
        <Link href="/browse" className="w-12 h-12 -mt-8 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center">
          <span className="material-symbols-outlined">add</span>
        </Link>
        <Link href="/collection" className="flex flex-col items-center gap-1 text-violet-400">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          <span className="text-[10px] font-bold uppercase">Intel</span>
        </Link>
        <Link href="/marketplace" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">local_mall</span>
          <span className="text-[10px] font-bold uppercase">Exchange</span>
        </Link>
      </nav>

    </div>
  )
}

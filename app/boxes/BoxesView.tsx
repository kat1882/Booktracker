'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type MonthLabel = { key: string; label: string; month: string; year: string }
type Edition = {
  id: string
  edition_name: string
  cover_image?: string
  estimated_value?: number
  original_retail_price?: number
  edition_type?: string
  book?: { id: string; title: string; author: string } | null
}
type SourceGroup = { source: { id: string; name: string }; editions: Edition[] }

const EDITION_BADGE: Record<string, { label: string; color: string }> = {
  signed:           { label: 'Signed',       color: 'bg-amber-900/40 text-amber-400 border-amber-700/40' },
  subscription_box: { label: 'Sub Box',       color: 'bg-violet-900/40 text-violet-400 border-violet-700/40' },
  illustrated:      { label: 'Illustrated',   color: 'bg-blue-900/40 text-blue-400 border-blue-700/40' },
  limited:          { label: 'Limited',       color: 'bg-rose-900/40 text-rose-400 border-rose-700/40' },
}

export default function BoxesView({
  monthLabels,
  selectedMonth,
  selectedYear,
  grouped,
}: {
  monthLabels: MonthLabel[]
  selectedMonth: string
  selectedYear: string
  grouped: SourceGroup[]
}) {
  const router = useRouter()
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  function goToMonth(month: string, year: string) {
    router.push(`/boxes?month=${month}&year=${year}`)
  }

  const totalEditions = grouped.reduce((s, g) => s + g.editions.length, 0)
  const displayMonth = selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e131f] flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col py-6 px-4 hidden md:flex border-r border-slate-800/50">
        <div className="mb-10 px-4">
          <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Box Registry</p>
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
          <Link href="/boxes" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg bg-violet-600/20 text-violet-100 transition-all duration-200">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
            <span className="font-medium text-sm">Box Registry</span>
          </Link>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-3">
          <Link href="/browse" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>
            Add to Collection
          </Link>
          <Link href="/profile" className="px-4 py-2 flex items-center gap-3 text-slate-500 hover:text-slate-200 text-sm transition-colors rounded-lg hover:bg-slate-800">
            <span className="material-symbols-outlined text-lg">person</span>
            My Profile
          </Link>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-white font-semibold">Box Registry</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-violet-300 font-mono">{displayMonth} {selectedYear}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">{grouped.length} boxes · {totalEditions} editions</span>
            <Link href="/browse" className="hidden lg:flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 text-sm text-slate-500 hover:text-slate-200 hover:border-slate-700 transition-colors w-52">
              <span className="material-symbols-outlined text-sm">search</span>
              Search archives…
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-10">

            {/* Page header */}
            <div className="mb-10">
              <p className="text-violet-400 uppercase tracking-[0.2em] text-xs font-bold mb-2 font-mono">Monthly Drops</p>
              <h1 className="text-4xl font-bold tracking-tight text-white">The Box Registry</h1>
              <p className="text-slate-400 mt-2 max-w-2xl">A definitive index of premium monthly book editions — tracking exclusives from the world's leading boutique publishers.</p>
            </div>

            {/* Month selector */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-violet-400">Curation Timeline</p>
              </div>
              <div className="flex overflow-x-auto gap-3 pb-3 no-scrollbar -mx-1 px-1">
                {monthLabels.map(m => {
                  const isSelected = m.month === selectedMonth && m.year === selectedYear
                  return (
                    <button
                      key={m.key}
                      onClick={() => goToMonth(m.month, m.year)}
                      className={`flex-none px-6 py-3 rounded-xl font-mono text-sm font-bold transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-violet-600/30 text-violet-200 border border-violet-500/50 shadow-lg shadow-violet-900/20'
                          : 'bg-slate-900/60 border border-slate-800/50 text-slate-400 hover:border-violet-500/30 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Source sections */}
            {grouped.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-xl text-slate-600">
                <p>No editions found for {displayMonth} {selectedYear}.</p>
              </div>
            ) : (
              <div className="space-y-16">
                {grouped.map(({ source, editions }) => (
                  <section key={source.id}>
                    <div className="flex items-end justify-between mb-6 pb-4 border-b border-slate-800/50">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">{source.name}</h3>
                        <p className="text-slate-500 font-mono text-xs mt-1 uppercase tracking-widest">
                          {editions.length} edition{editions.length !== 1 ? 's' : ''} this month
                        </p>
                      </div>
                      <Link href={`/boxes/${encodeURIComponent(source.name)}`} className="text-violet-400 text-sm font-semibold flex items-center gap-1 hover:text-violet-300 transition-colors">
                        View Archive <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {editions.map(ed => {
                        const value = ed.estimated_value ?? ed.original_retail_price
                        const badge = ed.edition_type ? EDITION_BADGE[ed.edition_type] : null

                        return (
                          <Link key={ed.id} href={`/edition/${ed.id}`} className="group block">
                            <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-xl ring-1 ring-white/5 group-hover:ring-violet-500/50 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-violet-900/40">
                              {ed.cover_image ? (
                                <Image
                                  src={ed.cover_image}
                                  alt={ed.book?.title ?? ''}
                                  fill
                                  className="object-cover"
                                  sizes="160px"
                                  unoptimized
                                />
                              ) : (
                                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-600 text-xs text-center p-3">
                                  {ed.book?.title?.slice(0, 30)}
                                </div>
                              )}
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                <span className="text-white text-xs font-bold leading-tight line-clamp-2">{ed.book?.title}</span>
                                {value && <span className="text-emerald-400 font-mono text-xs font-bold mt-1">${fmt(Number(value))}</span>}
                              </div>
                              {/* Edition type badge */}
                              {badge && (
                                <div className="absolute top-2 left-2">
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <h4 className="text-white font-bold text-xs leading-tight line-clamp-2 group-hover:text-violet-300 transition-colors">
                                {ed.book?.title ?? 'Unknown'}
                              </h4>
                              <p className="text-slate-500 text-[10px] truncate mt-0.5">{ed.book?.author}</p>
                              {value && (
                                <p className="text-emerald-400 font-mono text-xs font-semibold mt-1">${fmt(Number(value))}</p>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </section>
                ))}
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
        <Link href="/boxes" className="flex flex-col items-center gap-1 text-violet-400">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          <span className="text-[10px] font-bold uppercase">Boxes</span>
        </Link>
        <Link href="/marketplace" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">local_mall</span>
          <span className="text-[10px] font-bold uppercase">Market</span>
        </Link>
      </nav>

    </div>
  )
}

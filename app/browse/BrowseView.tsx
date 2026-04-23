'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ReportPricingButton from '@/app/components/ReportPricingButton'

type Edition = {
  id: string
  edition_name: string
  cover_image?: string
  estimated_value?: number
  set_size?: number
  book_id: string
  book_title: string
  book_author: string
  book_genre?: string
  source_name: string
  source_type: string
}

type Filters = {
  q: string
  sourceType: string
  genre: string
  priceMin: number | null
  priceMax: number | null
  sort: string
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  subscription_box: 'Subscription Box',
  retail: 'Retail Exclusive',
  standard: 'Standard',
}

const GENRES = ['fantasy', 'romance', 'thriller', 'horror', 'sci-fi', 'historical', 'contemporary', 'ya']

const QUICK_SEARCHES = ['OwlCrate', 'Illumicrate', 'signed', 'romance', 'fantasy']

const SOURCE_BADGE: Record<string, string> = {
  subscription_box: 'bg-primary/20 text-primary border-primary/30',
  retail:           'bg-amber-500/20 text-amber-300 border-amber-500/30',
  standard:         'bg-slate-700/40 text-slate-400 border-slate-600/30',
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function buildUrl(filters: Partial<Filters> & { page?: number }) {
  const p = new URLSearchParams()
  if (filters.q) p.set('q', filters.q)
  if (filters.sourceType) p.set('type', filters.sourceType)
  if (filters.genre) p.set('genre', filters.genre)
  if (filters.priceMin != null) p.set('priceMin', String(filters.priceMin))
  if (filters.priceMax != null) p.set('priceMax', String(filters.priceMax))
  if (filters.sort && filters.sort !== 'value') p.set('sort', filters.sort)
  if (filters.page && filters.page > 1) p.set('page', String(filters.page))
  const s = p.toString()
  return `/browse${s ? `?${s}` : ''}`
}

export default function BrowseView({
  editions,
  trending,
  totalCount,
  totalPages,
  currentPage,
  filters,
}: {
  editions: Edition[]
  trending: Edition[]
  totalCount: number
  totalPages: number
  currentPage: number
  filters: Filters
}) {
  const router = useRouter()
  const [search, setSearch] = useState(filters.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('shelfworth_searches') ?? '[]')
      setRecentSearches(stored.slice(0, 5))
    } catch {}
  }, [])

  useEffect(() => {
    setSearch(filters.q)
  }, [filters.q])

  function navigate(overrides: Partial<Filters> & { page?: number }) {
    const merged = { ...filters, page: 1, ...overrides }
    router.push(buildUrl(merged))
  }

  function handleSearch(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        // Save to recent searches
        try {
          const stored: string[] = JSON.parse(localStorage.getItem('shelfworth_searches') ?? '[]')
          const updated = [val.trim(), ...stored.filter(s => s !== val.trim())].slice(0, 5)
          localStorage.setItem('shelfworth_searches', JSON.stringify(updated))
          setRecentSearches(updated)
        } catch {}
      }
      navigate({ q: val.trim() })
    }, 400)
  }

  const showInsights = !filters.q && !filters.sourceType && !filters.genre && currentPage === 1

  return (
    <div className="lg:pl-64 pt-20 min-h-screen bg-[#0e131f]">
      <div className="px-6 md:px-8 max-w-7xl mx-auto pb-20">

        {/* Search bar */}
        <section className="mt-8 mb-10 flex flex-col items-center">
          <div className="w-full max-w-3xl relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-xl">search</span>
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search editions, authors, or subscription boxes…"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-5 pl-14 pr-6 text-on-surface text-base focus:ring-2 focus:ring-violet-600/50 focus:border-violet-600/50 focus:bg-slate-800/80 transition-all shadow-2xl outline-none"
            />
          </div>
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            <span className="text-slate-500 text-sm py-1.5">Quick:</span>
            {QUICK_SEARCHES.map(qs => (
              <button key={qs}
                onClick={() => handleSearch(qs)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-medium transition-colors text-slate-300">
                {qs}
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-8">

          {/* Filters sidebar */}
          <aside className="w-full md:w-56 shrink-0 space-y-8">

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Source Type</h3>
              <div className="space-y-2">
                {[['', 'All'], ['subscription_box', 'Subscription Box'], ['retail', 'Retail Exclusive']].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-3 cursor-pointer group">
                    <div onClick={() => navigate({ sourceType: val })}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${filters.sourceType === val ? 'border-violet-500 bg-violet-600/20' : 'border-slate-600 group-hover:border-violet-500'}`}>
                      {filters.sourceType === val && <span className="material-symbols-outlined text-[10px] text-violet-400">check</span>}
                    </div>
                    <span className={`text-sm ${filters.sourceType === val ? 'text-violet-300' : 'text-slate-400'}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Genre</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {GENRES.map(g => (
                  <button key={g}
                    onClick={() => navigate({ genre: filters.genre === g ? '' : g })}
                    className={`py-1.5 rounded text-[11px] font-medium capitalize transition-colors ${filters.genre === g ? 'bg-violet-600/20 border border-violet-600/40 text-violet-300' : 'bg-slate-800/60 hover:bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Price Range</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  defaultValue={filters.priceMin ?? ''}
                  onBlur={e => navigate({ priceMin: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  defaultValue={filters.priceMax ?? ''}
                  onBlur={e => navigate({ priceMax: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {(filters.q || filters.sourceType || filters.genre || filters.priceMin || filters.priceMax) && (
              <button onClick={() => router.push('/browse')}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
                Clear all filters
              </button>
            )}
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">

            {/* Header */}
            <div className="flex justify-between items-end mb-6 border-b border-slate-800/50 pb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Archive Explorer</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {totalCount.toLocaleString()} edition{totalCount !== 1 ? 's' : ''}
                  {filters.q && <> matching <span className="text-violet-400 italic">&ldquo;{filters.q}&rdquo;</span></>}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 text-xs">Sort:</span>
                {[['value', 'Value'], ['title', 'Title'], ['new', 'Newest']].map(([val, label]) => (
                  <button key={val}
                    onClick={() => navigate({ sort: val })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filters.sort === val || (!filters.sort && val === 'value') ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Edition grid */}
            {editions.length === 0 ? (
              <div className="text-center py-24 text-slate-600">
                <span className="material-symbols-outlined text-4xl block mb-3">search_off</span>
                <p>No editions found. Try a different search or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
                {editions.map(ed => (
                  <Link key={ed.id} href={`/book/${ed.book_id}`} className="group cursor-pointer">
                    <div className="aspect-[2/3] bg-slate-900 rounded-lg mb-3 overflow-hidden relative shadow-lg group-hover:shadow-violet-900/20 transition-all duration-300">
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <span className="w-full bg-violet-600 py-1.5 rounded text-white text-[11px] font-bold text-center">View Details</span>
                      </div>
                      {/* Source badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${SOURCE_BADGE[ed.source_type] ?? SOURCE_BADGE.standard}`}>
                          {ed.source_name.replace(/\s+(book\s+box|box)\s*$/i, '').slice(0, 16)}
                        </span>
                      </div>
                      {ed.cover_image ? (
                        <Image
                          src={ed.cover_image}
                          alt={ed.book_title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-xs text-center p-2">{ed.book_title}</div>
                      )}
                      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] pointer-events-none" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-100 text-sm leading-tight line-clamp-1 group-hover:text-violet-300 transition-colors">
                        {ed.book_title}
                      </h4>
                      <p className="text-slate-500 text-xs line-clamp-1">{ed.book_author}</p>
                      <div className="flex items-center justify-between pt-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-medium text-slate-200">
                            {ed.estimated_value ? fmt(ed.estimated_value / (ed.set_size ?? 1)) : '—'}
                          </span>
                          {(ed.set_size ?? 1) > 1 && (
                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full">{ed.set_size}×</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {ed.estimated_value && (ed.estimated_value / (ed.set_size ?? 1)) > 100 && (
                            <div className="flex items-center gap-0.5 text-emerald-400 font-mono text-[10px]">
                              <span className="material-symbols-outlined text-[10px]">trending_up</span>
                              High Value
                            </div>
                          )}
                          <ReportPricingButton editionId={ed.id} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-10">
                {currentPage > 1 && (
                  <Link href={buildUrl({ ...filters, page: currentPage - 1 })}
                    className="px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors">←</Link>
                )}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 6, currentPage - 3)) + i
                  return (
                    <Link key={p} href={buildUrl({ ...filters, page: p })}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${p === currentPage ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>
                      {p}
                    </Link>
                  )
                })}
                {currentPage < totalPages && (
                  <Link href={buildUrl({ ...filters, page: currentPage + 1 })}
                    className="px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors">→</Link>
                )}
              </div>
            )}

            {/* Personal Archive Insights — shown on empty search */}
            {showInsights && (
              <section className="mt-20">
                <h2 className="text-xl font-bold mb-6 text-white">Archive Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Recent Searches */}
                  <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800/50">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="material-symbols-outlined text-violet-400">history</span>
                      <h3 className="font-bold text-base text-white">Recent Searches</h3>
                    </div>
                    {recentSearches.length === 0 ? (
                      <p className="text-slate-600 text-sm">No searches yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentSearches.map(s => (
                          <button key={s} onClick={() => handleSearch(s)}
                            className="w-full flex justify-between items-center group hover:bg-slate-800 px-2 py-1.5 -mx-2 rounded transition-colors text-left">
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white">{s}</span>
                            <span className="material-symbols-outlined text-slate-600 text-sm group-hover:text-slate-400">north_west</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Trending */}
                  <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-3xl rounded-full -mr-16 -mt-16" />
                    <div className="flex items-center gap-3 mb-5">
                      <span className="material-symbols-outlined text-emerald-400">auto_graph</span>
                      <h3 className="font-bold text-base text-white">Highest Value Editions</h3>
                    </div>
                    <div className="space-y-3">
                      {trending.slice(0, 4).map(ed => (
                        <Link key={ed.id} href={`/book/${ed.book_id}`}
                          className="flex items-center gap-3 group hover:bg-slate-800 p-1.5 -mx-1.5 rounded transition-colors">
                          <div className="w-10 h-10 rounded bg-slate-800 overflow-hidden shrink-0 relative">
                            {ed.cover_image && <Image src={ed.cover_image} alt="" fill className="object-cover opacity-80" unoptimized sizes="40px" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 group-hover:text-white line-clamp-1">{ed.book_title}</p>
                            <p className="text-[10px] font-mono text-emerald-400">{ed.estimated_value ? fmt(ed.estimated_value / (ed.set_size ?? 1)) : '—'}</p>
                          </div>
                          <span className="material-symbols-outlined text-slate-600 text-sm group-hover:text-violet-400 transition-colors">chevron_right</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'

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
  photos: string[]
  book: { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string; google_books_id?: string } | null
  edition: { id: string; edition_name: string; edition_type: string; cover_image?: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
}

const PAGE_SIZE = 30

const CONDITION_BADGE: Record<string, string> = {
  'Near Mint': 'bg-emerald-500 text-black',
  'Fine':      'bg-green-500 text-black',
  'Very Good': 'bg-blue-500 text-white',
  'Good':      'bg-yellow-500 text-black',
  'Fair':      'bg-orange-500 text-white',
  'Poor':      'bg-red-600 text-white',
}

const EDITION_LABEL: Record<string, string> = {
  signed:           'Signed',
  subscription_box: 'Sub Box',
  illustrated:      'Illustrated',
  standard:         'Standard',
  limited:          'Limited',
}

type SortKey = 'value_desc' | 'value_asc' | 'title_az' | 'author_az' | 'recent'
type FilterKey = 'all' | 'signed' | 'special' | 'for_sale' | 'preordered' | 'want_to_read' | 'read'

export default function LibraryView({
  entries,
  stats,
  onOpenDetails,
}: {
  entries: ShelfEntry[]
  stats: { totalValue: number; totalRetail: number; owned: number }
  onOpenDetails: (entry: ShelfEntry) => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let list = [...entries]

    // Quick filter
    if (filter === 'signed')       list = list.filter(e => e.edition?.edition_type === 'signed')
    if (filter === 'special')      list = list.filter(e => e.edition?.edition_type !== 'standard')
    if (filter === 'for_sale')     list = list.filter(e => e.for_sale)
    if (filter === 'preordered')   list = list.filter(e => e.reading_status === 'preordered')
    if (filter === 'want_to_read') list = list.filter(e => e.reading_status === 'want_to_read')
    if (filter === 'read')         list = list.filter(e => e.reading_status === 'read')

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.book?.title?.toLowerCase().includes(q) ||
        e.book?.author?.toLowerCase().includes(q) ||
        e.edition?.edition_name?.toLowerCase().includes(q) ||
        e.edition?.source?.name?.toLowerCase().includes(q)
      )
    }

    // Sort
    const val = (e: ShelfEntry) => Number(e.edition?.estimated_value ?? e.edition?.original_retail_price ?? 0)
    if (sort === 'value_desc') list.sort((a, b) => val(b) - val(a))
    if (sort === 'value_asc')  list.sort((a, b) => val(a) - val(b))
    if (sort === 'title_az')   list.sort((a, b) => (a.book?.title ?? '').localeCompare(b.book?.title ?? ''))
    if (sort === 'author_az')  list.sort((a, b) => (a.book?.author ?? '').localeCompare(b.book?.author ?? ''))

    return list
  }, [entries, filter, sort, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const filteredValue = filtered.reduce((s, e) => s + Number(e.edition?.estimated_value ?? e.edition?.original_retail_price ?? 0), 0)
  const appreciation = stats.totalRetail > 0 ? ((stats.totalValue - stats.totalRetail) / stats.totalRetail) * 100 : null
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  function handleFilterClick(f: FilterKey) {
    setFilter(f)
    setPage(1)
  }

  const QUICK_FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',          label: 'All' },
    { key: 'preordered',   label: 'Preordered' },
    { key: 'signed',       label: 'Signed' },
    { key: 'special',      label: 'Special Editions' },
    { key: 'for_sale',     label: 'For Sale' },
    { key: 'want_to_read', label: 'Want to Read' },
    { key: 'read',         label: 'Read' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 px-8 py-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <p className="text-violet-400 uppercase tracking-[0.2em] text-xs font-bold mb-2 font-mono">My Collection</p>
          <h1 className="text-4xl font-bold tracking-tight text-white">The Library</h1>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-900/60 border border-slate-800/50 p-4 rounded-xl">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mr-1">Filter:</span>
            {QUICK_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => handleFilterClick(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === f.key
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search title, author…"
                className="bg-slate-800 border border-slate-700 rounded-full pl-8 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 w-48"
              />
            </div>
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Sort:</span>
            <select
              value={sort}
              onChange={e => { setSort(e.target.value as SortKey); setPage(1) }}
              className="bg-transparent border-none text-sm font-semibold text-violet-400 focus:ring-0 cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="value_desc">Value: High → Low</option>
              <option value="value_asc">Value: Low → High</option>
              <option value="title_az">Title A–Z</option>
              <option value="author_az">Author A–Z</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-500 mb-6 font-mono">
          {filtered.length} {filtered.length === 1 ? 'edition' : 'editions'}
          {search && ` matching "${search}"`}
          {filter !== 'all' && ` · filtered`}
        </p>

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-800 rounded-xl text-slate-600">
            <p>No editions match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {visible.map(entry => {
              const coverUrl = entry.edition?.cover_image
                ?? (entry.book?.cover_ol_id ? `https://covers.openlibrary.org/b/id/${entry.book.cover_ol_id}-M.jpg` : null)
              const value = entry.edition?.estimated_value ?? entry.edition?.original_retail_price
              const condBadge = entry.condition ? CONDITION_BADGE[entry.condition] : null
              const editionLabel = entry.edition?.edition_type ? (EDITION_LABEL[entry.edition.edition_type] ?? entry.edition.edition_type) : null
              const source = entry.edition?.source?.name

              return (
                <div
                  key={entry.id}
                  className="group cursor-pointer"
                  onClick={() => onOpenDetails(entry)}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-violet-900/40 ring-1 ring-white/5 group-hover:ring-violet-500/50">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={entry.book?.title ?? ''}
                        fill
                        className="object-cover"
                        sizes="160px"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-600 text-xs text-center p-2">
                        {entry.book?.title?.slice(0, 30)}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      {condBadge && (
                        <span className={`${condBadge} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight w-fit`}>
                          {entry.condition}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-white font-bold text-sm leading-tight tracking-tight group-hover:text-violet-300 transition-colors line-clamp-2">
                      {entry.book?.title ?? 'Unknown'}
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">{entry.book?.author}</p>
                    {source && <p className="text-violet-400 text-xs mt-0.5 truncate">{source}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-emerald-400 text-xs font-mono font-semibold">
                        {value ? `$${fmt(Number(value))}` : '—'}
                      </span>
                      {editionLabel && editionLabel !== 'Standard' && (
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">{editionLabel}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer stats + pagination */}
      <footer className="border-t border-white/5 bg-slate-950/30 px-8 py-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Filtered Value</p>
              <p className="font-mono text-xl text-violet-400">{filteredValue > 0 ? `$${fmt(filteredValue)}` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Volumes</p>
              <p className="font-mono text-xl text-white">{filtered.length}</p>
            </div>
            {appreciation !== null && (
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Appreciation</p>
                <p className={`font-mono text-xl ${appreciation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}%
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors text-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const n = i + 1
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`px-3 py-2 rounded-lg font-mono text-sm transition-colors ${
                      page === n
                        ? 'bg-violet-600/20 text-violet-300'
                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {String(n).padStart(2, '0')}
                  </button>
                )
              })}
              {totalPages > 7 && <span className="text-slate-600 px-1">…</span>}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors text-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

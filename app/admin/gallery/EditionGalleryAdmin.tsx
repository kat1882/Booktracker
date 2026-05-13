'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Edition {
  id: string
  edition_name: string
  edition_type: string | null
  cover_image: string | null
  release_month: string | null
  source: { id: string; name: string } | null
  book: { title: string; author: string } | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS  = ['2022','2023','2024','2025','2026','2027']
const TYPES  = ['subscription_box','exclusive','signed','illustrated','deluxe','collectors','limited','standard','other']

function QuickEditPanel({
  edition,
  sources,
  onSaved,
  onClose,
}: {
  edition: Edition
  sources: { id: string; name: string }[]
  onSaved: (updated: Partial<Edition>) => void
  onClose: () => void
}) {
  const [name,   setName]   = useState(edition.edition_name)
  const [cover,  setCover]  = useState(edition.cover_image ?? '')
  const [month,  setMonth]  = useState(edition.release_month ?? '')
  const [type,   setType]   = useState(edition.edition_type ?? '')
  const [srcId,  setSrcId]  = useState(edition.source?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(edition.cover_image ?? '')

  async function save() {
    setSaving(true)
    const body: any = {
      edition_name: name.trim(),
      cover_image:  cover.trim() || null,
      release_month: month || null,
      edition_type: type || null,
      source_id:   srcId || null,
    }
    const res = await fetch(`/api/admin/editions/${edition.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      onSaved({
        edition_name:  name,
        cover_image:   cover || null,
        release_month: month || null,
        edition_type:  type || null,
        source:        sources.find(s => s.id === srcId) ?? null,
      })
    }
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-5 border-b border-slate-800">
          <div className="w-16 h-24 bg-slate-800 rounded-lg overflow-hidden relative shrink-0 ring-1 ring-white/10">
            {preview ? (
              <Image src={preview} alt="" fill className="object-cover" sizes="64px" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-[10px] text-center p-1">No cover</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold line-clamp-2">{edition.edition_name}</p>
            {edition.book && <p className="text-slate-400 text-sm mt-0.5">{edition.book.title} · {edition.book.author}</p>}
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors text-xl leading-none shrink-0">✕</button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Edition Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inp} />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Cover Image URL</label>
            <input
              value={cover}
              onChange={e => { setCover(e.target.value); setPreview(e.target.value) }}
              placeholder="https://…"
              className={inp}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Release Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className={inp}>
                <option value="">—</option>
                {YEARS.flatMap(y => MONTHS.map(m => (
                  <option key={`${m} ${y}`} value={`${m} ${y}`}>{m} {y}</option>
                )))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Edition Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className={inp}>
                <option value="">—</option>
                {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Source / Box</label>
            <select value={srcId} onChange={e => setSrcId(e.target.value)} className={inp}>
              <option value="">— No source —</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditionGalleryAdmin({
  editions: initialEditions,
  totalCount,
  page,
  pageSize,
  activeFilter,
  activeSource,
  searchQuery,
  noCovers,
  noMonths,
  noSources,
  sources,
}: {
  editions: Edition[]
  totalCount: number
  page: number
  pageSize: number
  activeFilter: string
  activeSource: string
  searchQuery: string
  noCovers: number
  noMonths: number
  noSources: number
  sources: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [editions, setEditions] = useState<Edition[]>(initialEditions)
  const [editing, setEditing] = useState<Edition | null>(null)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [, startTransition] = useTransition()

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.filter && params.filter !== 'all') sp.set('filter', params.filter)
    if (params.source) sp.set('source', params.source)
    if (params.page && params.page !== '1') sp.set('page', params.page)
    if (params.q) sp.set('q', params.q)
    startTransition(() => router.push(`/admin/gallery?${sp.toString()}`))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ filter: activeFilter, source: activeSource, q: searchInput })
  }

  function handleSaved(id: string, updated: Partial<Edition>) {
    setEditions(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e))
    setEditing(null)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  const filters = [
    { key: 'all',       label: 'All',              count: null },
    { key: 'no_cover',  label: 'Missing Cover',     count: noCovers,  cls: 'text-red-400' },
    { key: 'no_month',  label: 'Missing Month',     count: noMonths,  cls: 'text-amber-400' },
    { key: 'no_source', label: 'No Source',         count: noSources, cls: 'text-slate-400' },
  ]

  return (
    <>
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">search</span>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search edition names…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
          Search
        </button>
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); navigate({ filter: activeFilter, source: activeSource }) }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => navigate({ filter: f.key, source: activeSource, q: searchQuery })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeFilter === f.key
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {f.label}
            {f.count != null && (
              <span className={`text-[10px] font-bold ${activeFilter === f.key ? 'text-violet-300' : (f as any).cls ?? 'text-slate-500'}`}>
                {f.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}

        {/* Source filter */}
        <select
          value={activeSource}
          onChange={e => navigate({ filter: activeFilter, source: e.target.value, q: searchQuery })}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500"
        >
          <option value="">All sources</option>
          {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>

        <span className="ml-auto text-xs text-slate-500 self-center">
          {totalCount.toLocaleString()} editions
        </span>
      </div>

      {/* Grid */}
      {editions.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-600 text-sm">
          No editions match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {editions.map(ed => {
            const missingCover = !ed.cover_image
            const missingMonth = !ed.release_month

            return (
              <button
                key={ed.id}
                onClick={() => setEditing(ed)}
                className="group text-left"
              >
                <div className={`relative aspect-[2/3] rounded-lg overflow-hidden ring-1 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:ring-violet-500/60 ${
                  missingCover ? 'ring-red-900/60 bg-red-950/20' : 'ring-white/5 bg-slate-800'
                }`}>
                  {ed.cover_image ? (
                    <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover" sizes="120px" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-red-900/60 text-lg">hide_image</span>
                      <span className="text-[8px] text-red-900/60 font-bold uppercase">No cover</span>
                    </div>
                  )}

                  {/* Flag badges */}
                  <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                    {missingMonth && (
                      <span className="bg-amber-600/80 text-[7px] font-bold uppercase px-1 py-0.5 rounded text-white leading-none">
                        no month
                      </span>
                    )}
                  </div>

                  {/* Edit overlay */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xl">edit</span>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                  {ed.edition_name}
                </p>
                {ed.source?.name && (
                  <p className="text-[8px] text-violet-500 truncate">{ed.source.name}</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => navigate({ filter: activeFilter, source: activeSource, page: String(page - 1) })}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-slate-500 text-xs">Page {page} of {totalPages}</span>
          <button
            onClick={() => navigate({ filter: activeFilter, source: activeSource, page: String(page + 1) })}
            disabled={page >= totalPages}
            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Quick edit modal */}
      {editing && (
        <QuickEditPanel
          edition={editing}
          sources={sources}
          onSaved={updated => handleSaved(editing.id, updated)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

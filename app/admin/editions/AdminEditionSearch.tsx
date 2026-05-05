'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Edition {
  id: string
  book_id: string
  edition_name: string
  edition_type: string | null
  cover_image: string | null
  original_retail_price: number | null
  estimated_value: number | null
  price_override: number | null
  isbn: string | null
  set_size: number
  publisher: string | null
  release_month: string | null
  print_run_size: number | null
  cover_artist: string | null
  edge_treatment: string | null
  binding: string | null
  foiling: string | null
  signature_type: string | null
  extras: string | null
  notes: string | null
  sku: string | null
  mercari_median: number | null
  ebay_median: number | null
  value_updated_at: string | null
  book: { id: string; title: string; author: string } | null
  source: { id: string; name: string } | null
}

type FormState = Partial<Edition & { author: string }>

const EDITION_TYPES = [
  'subscription_box', 'signed', 'illustrated', 'collectors',
  'special_edition', 'standard', 'other',
]

const SEARCH_FIELDS = [
  { value: 'edition', label: 'Edition name' },
  { value: 'title',   label: 'Book title' },
  { value: 'author',  label: 'Author' },
  { value: 'source',  label: 'Source' },
]

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const inp = 'w-full bg-[#1a202c] border-none rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all placeholder-slate-600'
const label = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1'

export default function AdminEditionSearch({
  initialEditions,
  sources,
  initialQuery,
  initialField,
}: {
  initialEditions: Edition[]
  sources: { id: string; name: string }[]
  initialQuery: string
  initialField: string
}) {
  const [q, setQ] = useState(initialQuery)
  const [field, setField] = useState(initialField)
  const [editions, setEditions] = useState<Edition[]>(initialEditions)
  const [selected, setSelected] = useState<Edition | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<Edition[]>([])

  // Track recently accessed in state
  function selectEdition(ed: Edition) {
    setSelected(ed)
    setPreviewUrl(ed.cover_image)
    setSaved(false)
    setForm({
      edition_name: ed.edition_name,
      edition_type: ed.edition_type ?? '',
      cover_image: ed.cover_image ?? '',
      original_retail_price: ed.original_retail_price ?? undefined,
      estimated_value: ed.estimated_value ?? undefined,
      price_override: ed.price_override ?? undefined,
      isbn: ed.isbn ?? '',
      set_size: ed.set_size ?? 1,
      publisher: ed.publisher ?? '',
      release_month: ed.release_month ?? '',
      print_run_size: ed.print_run_size ?? undefined,
      cover_artist: ed.cover_artist ?? '',
      edge_treatment: ed.edge_treatment ?? '',
      binding: ed.binding ?? '',
      foiling: ed.foiling ?? '',
      signature_type: ed.signature_type ?? '',
      extras: ed.extras ?? '',
      notes: ed.notes ?? '',
      sku: ed.sku ?? '',
      author: ed.book?.author ?? '',
    })
    setRecent(prev => [ed, ...prev.filter(r => r.id !== ed.id)].slice(0, 5))
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const params = new URLSearchParams({ q, field })
    const res = await fetch(`/api/admin/editions/search?${params}`)
    const data = await res.json()
    setEditions(data.editions ?? [])
    setLoading(false)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    const ed = selected

    const payload: Record<string, unknown> = {}
    const strFields: (keyof Edition)[] = [
      'edition_name', 'edition_type', 'cover_image', 'isbn', 'publisher',
      'release_month', 'cover_artist', 'edge_treatment', 'binding', 'foiling',
      'signature_type', 'extras', 'notes', 'sku',
    ]
    for (const f of strFields) {
      if (form[f] !== undefined) payload[f] = (form[f] as string) || null
    }
    const numFields: (keyof Edition)[] = ['original_retail_price', 'estimated_value', 'print_run_size']
    for (const f of numFields) {
      if (form[f] !== undefined) payload[f] = (form[f] as number) || null
    }
    if ('price_override' in form) payload.price_override = form.price_override || null
    if (form.set_size !== undefined) payload.set_size = form.set_size ?? 1

    const saves: Promise<Response>[] = [
      fetch(`/api/admin/editions/${ed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    ]

    const authorChanged = form.author?.trim() && form.author.trim() !== ed.book?.author
    if (authorChanged && ed.book_id) {
      saves.push(fetch(`/api/admin/books/${ed.book_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: form.author!.trim() }),
      }))
    }

    const [edRes] = await Promise.all(saves)
    if (edRes.ok) {
      const updated = { ...ed, ...payload } as Edition
      if (authorChanged && form.author) updated.book = { ...ed.book!, author: form.author.trim() }
      setSelected(updated)
      setEditions(prev => prev.map(e => e.id === ed.id ? updated : e))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Delete "${selected.edition_name}"? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/editions/${selected.id}`, { method: 'DELETE' })
    if (res.ok) {
      setEditions(prev => prev.filter(e => e.id !== selected.id))
      setSelected(null)
    }
    setDeleting(false)
  }

  const marketValue = selected?.price_override ?? selected?.estimated_value

  return (
    <div className="flex h-full -mx-8 -my-8 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── LEFT: Registry Selector ── */}
      <div className="w-[380px] shrink-0 bg-[#161c28] border-r border-white/5 flex flex-col h-full">
        <div className="p-5 border-b border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Registry Selector</p>
          <form onSubmit={search} className="space-y-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Query master registry…"
                className="w-full bg-[#242a36] border-none rounded-lg py-2 pl-9 pr-3 text-sm font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={field}
                onChange={e => setField(e.target.value)}
                className="flex-1 bg-[#242a36] border-none rounded-lg py-1.5 px-2 text-xs text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {SEARCH_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <button type="submit" disabled={loading}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                {loading ? '…' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {editions.map(ed => (
            <button
              key={ed.id}
              onClick={() => selectEdition(ed)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 ${
                selected?.id === ed.id
                  ? 'bg-[#242a36] ring-1 ring-violet-600/50'
                  : 'hover:bg-[#1f2533]'
              }`}
            >
              <div className="w-10 h-14 relative bg-slate-800 rounded-sm overflow-hidden shrink-0 shadow-sm">
                {ed.cover_image
                  ? <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover" sizes="40px" unoptimized />
                  : <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-[8px] text-center p-1">no cover</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{ed.edition_name}</p>
                <p className="text-[10px] text-slate-500 truncate">{ed.book?.author}</p>
                {ed.isbn && <p className="text-[9px] font-mono text-violet-400 mt-0.5">{ed.isbn}</p>}
              </div>
            </button>
          ))}

          {editions.length === 0 && (
            <p className="text-center text-slate-600 text-xs py-8">No results — try a search above</p>
          )}
        </div>

        {recent.length > 0 && (
          <div className="border-t border-white/5 p-4 space-y-1">
            <p className="text-[10px] font-mono text-slate-600 uppercase mb-2">Recently Accessed</p>
            {recent.map(r => (
              <button key={r.id} onClick={() => selectEdition(r)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group transition-colors text-left">
                <span className="material-symbols-outlined text-slate-600 text-sm">history</span>
                <span className="text-xs text-slate-400 group-hover:text-slate-200 truncate flex-1">{r.edition_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: Editor ── */}
      <div className="flex-1 overflow-y-auto bg-[#0e131f]">
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-slate-800 block mb-3">menu_book</span>
              <p className="text-slate-600 text-sm">Select an edition from the registry to edit</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
                  <span>Registry</span>
                  <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                  <span className="text-violet-400">Entry Editor</span>
                </nav>
                <h2 className="text-3xl font-black tracking-tight text-white">Edit Archive Entry</h2>
              </div>
              <div className="flex items-center gap-3">
                {saved && <span className="text-xs text-emerald-400 font-mono">✓ Changes published</span>}
                <button onClick={() => setSelected(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-white/5 transition-all">
                  Close
                </button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-violet-700 hover:bg-violet-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-violet-900/30 hover:scale-[1.02] disabled:opacity-50 transition-all">
                  {saving ? 'Publishing…' : 'Publish Updates'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Left col: cover + meta */}
              <div className="col-span-12 lg:col-span-4 space-y-5">
                <div className="aspect-[2/3] w-full bg-[#161c28] rounded-xl overflow-hidden shadow-2xl relative group">
                  {previewUrl ? (
                    <Image src={previewUrl} alt={selected.edition_name} fill className="object-cover" sizes="300px" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                      <span className="material-symbols-outlined text-4xl">image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <p className="flex flex-col items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest">
                      <span className="material-symbols-outlined text-3xl">upload_file</span>
                      Update URL below
                    </p>
                  </div>
                  {(selected.price_override ?? selected.estimated_value) && (
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-emerald-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-lg">
                        {fmt(selected.price_override ?? selected.estimated_value)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 bg-[#161c28] rounded-xl space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Telemetry</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase mb-0.5">Archive ID</p>
                      <p className="font-mono text-violet-400 text-[10px] truncate">{selected.id.slice(0, 14)}…</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase mb-0.5">Last Sync</p>
                      <p className="font-mono text-slate-300 text-[10px]">
                        {selected.value_updated_at
                          ? new Date(selected.value_updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase mb-0.5">Mercari</p>
                      <p className="font-mono text-blue-400 text-[10px]">{fmt(selected.mercari_median)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase mb-0.5">eBay</p>
                      <p className="font-mono text-slate-300 text-[10px]">{fmt(selected.ebay_median)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right col: form sections */}
              <div className="col-span-12 lg:col-span-8 space-y-6">

                {/* Identity */}
                <div className="p-7 bg-[#161c28] rounded-2xl space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400 text-lg">edit_note</span>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">Identity &amp; Credentials</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label className={label}>Edition Title</label>
                      <input value={form.edition_name ?? ''} onChange={e => setForm(f => ({ ...f, edition_name: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Author <span className="text-slate-700 normal-case">(updates all editions)</span></label>
                      <input value={form.author ?? ''} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>ISBN-13 Registry</label>
                      <input value={form.isbn ?? ''} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} className={`${inp} font-mono`} />
                    </div>
                    <div>
                      <label className={label}>Edition Type</label>
                      <select value={form.edition_type ?? ''} onChange={e => setForm(f => ({ ...f, edition_type: e.target.value }))} className={inp}>
                        <option value="">—</option>
                        {EDITION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Publisher</label>
                      <input value={form.publisher ?? ''} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Release Month</label>
                      <input value={form.release_month ?? ''} onChange={e => setForm(f => ({ ...f, release_month: e.target.value }))} placeholder="e.g. January 2025" className={inp} />
                    </div>
                    <div>
                      <label className={label}>SKU</label>
                      <input value={form.sku ?? ''} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className={`${inp} font-mono`} />
                    </div>
                    <div className="col-span-2">
                      <label className={label}>Cover Image URL</label>
                      <input
                        value={form.cover_image ?? ''}
                        onChange={e => { setForm(f => ({ ...f, cover_image: e.target.value })); setPreviewUrl(e.target.value || null) }}
                        className={inp}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                </div>

                {/* Valuation */}
                <div className="p-7 bg-[#161c28] rounded-2xl space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">database</span>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">Valuation &amp; Distribution</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    <div>
                      <label className={label}>Original Retail ($)</label>
                      <input type="number" step="0.01" value={form.original_retail_price ?? ''} onChange={e => setForm(f => ({ ...f, original_retail_price: parseFloat(e.target.value) || undefined }))} className={`${inp} font-mono`} />
                    </div>
                    <div>
                      <label className={label}>Est. Market Value ($)</label>
                      <input type="number" step="0.01" value={form.estimated_value ?? ''} onChange={e => setForm(f => ({ ...f, estimated_value: parseFloat(e.target.value) || undefined }))} className={`${inp} font-mono text-emerald-400`} />
                    </div>
                    <div>
                      <label className={label}>Print Run Size</label>
                      <input type="number" value={form.print_run_size ?? ''} onChange={e => setForm(f => ({ ...f, print_run_size: parseInt(e.target.value) || undefined }))} className={`${inp} font-mono`} />
                    </div>
                    <div>
                      <label className={label}>📌 Price Override ($)</label>
                      <div className="flex gap-2">
                        <input type="number" step="0.01" value={form.price_override ?? ''} onChange={e => setForm(f => ({ ...f, price_override: parseFloat(e.target.value) || undefined }))} className={`${inp} font-mono border border-amber-700/40 bg-amber-900/10`} placeholder="Pins a custom price" />
                        {form.price_override && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, price_override: undefined }))}
                            className="px-2 text-xs text-slate-500 hover:text-red-400 bg-[#1a202c] rounded-lg transition-colors shrink-0">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={label}>Set Size <span className="text-slate-700 normal-case">(1 = single)</span></label>
                      <input type="number" min="1" value={form.set_size ?? 1} onChange={e => setForm(f => ({ ...f, set_size: parseInt(e.target.value) || 1 }))} className={`${inp} font-mono`} />
                    </div>
                  </div>
                </div>

                {/* Physical details */}
                <div className="p-7 bg-[#161c28] rounded-2xl space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-lg">auto_awesome</span>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">Physical Specifications</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    <div>
                      <label className={label}>Binding</label>
                      <input value={form.binding ?? ''} onChange={e => setForm(f => ({ ...f, binding: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Foiling</label>
                      <input value={form.foiling ?? ''} onChange={e => setForm(f => ({ ...f, foiling: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Edge Treatment</label>
                      <input value={form.edge_treatment ?? ''} onChange={e => setForm(f => ({ ...f, edge_treatment: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Cover Artist</label>
                      <input value={form.cover_artist ?? ''} onChange={e => setForm(f => ({ ...f, cover_artist: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Signature Type</label>
                      <input value={form.signature_type ?? ''} onChange={e => setForm(f => ({ ...f, signature_type: e.target.value }))} className={inp} />
                    </div>
                    <div className="col-span-3">
                      <label className={label}>Extras / Inclusions</label>
                      <input value={form.extras ?? ''} onChange={e => setForm(f => ({ ...f, extras: e.target.value }))} placeholder="e.g. art print, bookmark, enamel pin" className={inp} />
                    </div>
                    <div className="col-span-3">
                      <label className={label}>Curator Notes</label>
                      <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={`${inp} resize-none`} />
                    </div>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="p-6 bg-red-950/20 border border-red-900/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-red-400">Danger Zone</h4>
                    <p className="text-xs text-slate-500 mt-1">Permanently remove this volume from the Shelfworth master registry.</p>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 border border-red-700/40 text-red-400 rounded-lg text-xs font-bold hover:bg-red-900/40 disabled:opacity-50 transition-all"
                  >
                    {deleting ? 'Decommissioning…' : 'Decommission Archive'}
                  </button>
                </div>

              </div>
            </div>
            <div className="h-16" />
          </div>
        )}
      </div>
    </div>
  )
}

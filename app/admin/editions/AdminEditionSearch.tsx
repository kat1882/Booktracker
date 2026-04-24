'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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

const fmt = (n: number | null | undefined) => n != null ? `$${Number(n).toFixed(0)}` : '—'

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
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)
  const [field, setField] = useState(initialField)
  const [editions, setEditions] = useState<Edition[]>(initialEditions)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/editions?q=${encodeURIComponent(q)}&field=${field}`)
  }

  function startEdit(ed: Edition) {
    setEditing(ed.id)
    setPreviewUrl(ed.cover_image)
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
    setSaved(null)
  }

  async function save(id: string) {
    setSaving(true)
    const ed = editions.find(e => e.id === id)

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
      fetch(`/api/admin/editions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    ]

    const authorChanged = form.author?.trim() && form.author.trim() !== ed?.book?.author
    if (authorChanged && ed?.book_id) {
      saves.push(fetch(`/api/admin/books/${ed.book_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: form.author!.trim() }),
      }))
    }

    const [edRes] = await Promise.all(saves)
    if (edRes.ok) {
      setEditions(prev => prev.map(e => {
        if (e.id !== id) return e
        const updated = { ...e, ...payload } as Edition
        if (authorChanged && form.author) updated.book = { ...e.book!, author: form.author.trim() }
        return updated
      }))
      setSaved(id)
      setEditing(null)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this edition? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/editions/${id}`, { method: 'DELETE' })
    if (res.ok) setEditions(prev => prev.filter(e => e.id !== id))
    setDeleting(null)
  }

  const inp = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500'

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <select
          value={field}
          onChange={e => setField(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 shrink-0"
        >
          {SEARCH_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={`Search by ${SEARCH_FIELDS.find(f => f.value === field)?.label ?? 'edition name'}…`}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
        <button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <p className="text-xs text-slate-600 mb-4">{editions.length} result{editions.length !== 1 ? 's' : ''}</p>

      <div className="flex flex-col gap-3">
        {editions.map(ed => (
          <div key={ed.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Summary row */}
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-14 relative bg-slate-800 rounded shrink-0 overflow-hidden">
                {ed.cover_image && <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover" sizes="40px" unoptimized />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{ed.edition_name}</p>
                <p className="text-xs text-slate-500 truncate">{ed.book?.title} by {ed.book?.author} — {ed.source?.name}</p>
                <div className="flex gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                  {ed.edition_type && <span className="capitalize">{ed.edition_type.replace(/_/g, ' ')}</span>}
                  {ed.original_retail_price && <span>Retail: {fmt(ed.original_retail_price)}</span>}
                  {(ed.price_override ?? ed.estimated_value) != null && (
                    <span className={ed.price_override ? 'text-amber-400' : 'text-emerald-600'}>
                      {ed.price_override ? '📌 ' : ''}{fmt(ed.price_override ?? ed.estimated_value)}
                    </span>
                  )}
                  {(ed.set_size ?? 1) > 1 && <span className="text-amber-400">{ed.set_size}-book set</span>}
                  {ed.mercari_median && <span className="text-blue-400">Mercari: {fmt(ed.mercari_median)}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                {saved === ed.id && <span className="text-xs text-emerald-400">✓ Saved</span>}
                <button
                  onClick={() => editing === ed.id ? setEditing(null) : startEdit(ed)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                >
                  {editing === ed.id ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(ed.id)}
                  disabled={deleting === ed.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-900/30 disabled:opacity-40 transition-colors"
                >
                  {deleting === ed.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Edit form */}
            {editing === ed.id && (
              <div className="border-t border-slate-800 p-5 bg-slate-950 space-y-5">

                {/* Cover preview */}
                {previewUrl && (
                  <div className="flex gap-4 items-start">
                    <div className="w-20 h-28 relative bg-slate-800 rounded-lg overflow-hidden shrink-0">
                      <Image src={previewUrl} alt="Cover preview" fill className="object-cover" sizes="80px" unoptimized />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Cover preview — update URL below to change</p>
                  </div>
                )}

                {/* Section: Identity */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Identity</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Edition Name</label>
                      <input value={form.edition_name ?? ''} onChange={e => setForm(f => ({ ...f, edition_name: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Author <span className="text-slate-600">(updates all editions of this book)</span></label>
                      <input value={form.author ?? ''} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Edition Type</label>
                      <select value={form.edition_type ?? ''} onChange={e => setForm(f => ({ ...f, edition_type: e.target.value }))} className={inp}>
                        <option value="">—</option>
                        {EDITION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Publisher</label>
                      <input value={form.publisher ?? ''} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Release Month</label>
                      <input value={form.release_month ?? ''} onChange={e => setForm(f => ({ ...f, release_month: e.target.value }))} placeholder="e.g. January 2025" className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">ISBN</label>
                      <input value={form.isbn ?? ''} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">SKU</label>
                      <input value={form.sku ?? ''} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className={inp} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-slate-500 mb-1 block">Cover Image URL</label>
                      <input
                        value={form.cover_image ?? ''}
                        onChange={e => { setForm(f => ({ ...f, cover_image: e.target.value })); setPreviewUrl(e.target.value || null) }}
                        className={inp}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Physical */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Physical Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Binding</label>
                      <input value={form.binding ?? ''} onChange={e => setForm(f => ({ ...f, binding: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Foiling</label>
                      <input value={form.foiling ?? ''} onChange={e => setForm(f => ({ ...f, foiling: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Edge Treatment</label>
                      <input value={form.edge_treatment ?? ''} onChange={e => setForm(f => ({ ...f, edge_treatment: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Cover Artist</label>
                      <input value={form.cover_artist ?? ''} onChange={e => setForm(f => ({ ...f, cover_artist: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Signature Type</label>
                      <input value={form.signature_type ?? ''} onChange={e => setForm(f => ({ ...f, signature_type: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Print Run Size</label>
                      <input type="number" value={form.print_run_size ?? ''} onChange={e => setForm(f => ({ ...f, print_run_size: parseInt(e.target.value) || undefined }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Set Size <span className="text-slate-600">(1 = single book)</span></label>
                      <input type="number" min="1" step="1" value={form.set_size ?? 1} onChange={e => setForm(f => ({ ...f, set_size: parseInt(e.target.value) || 1 }))} className={inp} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-slate-500 mb-1 block">Extras</label>
                      <input value={form.extras ?? ''} onChange={e => setForm(f => ({ ...f, extras: e.target.value }))} placeholder="e.g. art print, bookmark, enamel pin" className={inp} />
                    </div>
                  </div>
                </div>

                {/* Section: Pricing */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Pricing</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Original Retail ($)</label>
                      <input type="number" step="0.01" value={form.original_retail_price ?? ''} onChange={e => setForm(f => ({ ...f, original_retail_price: parseFloat(e.target.value) || undefined }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Est. Market Value ($)</label>
                      <input type="number" step="0.01" value={form.estimated_value ?? ''} onChange={e => setForm(f => ({ ...f, estimated_value: parseFloat(e.target.value) || undefined }))} className={inp} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        📌 Price Override ($)
                        <span className="text-slate-600 ml-1">— never auto-updated</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number" step="0.01"
                          value={form.price_override ?? ''}
                          onChange={e => setForm(f => ({ ...f, price_override: parseFloat(e.target.value) || undefined }))}
                          placeholder="e.g. 75.00"
                          className="flex-1 bg-slate-900 border border-amber-700/60 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                        {form.price_override && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, price_override: undefined }))}
                            className="text-xs text-slate-500 hover:text-red-400 px-2 border border-slate-700 rounded-lg transition-colors">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {(ed.mercari_median || ed.ebay_median) && (
                    <p className="text-xs text-slate-600 mt-2">
                      Scraped data — Mercari: {fmt(ed.mercari_median)} · eBay: {fmt(ed.ebay_median)}
                      {ed.value_updated_at && ` · Updated ${new Date(ed.value_updated_at).toLocaleDateString()}`}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                  <textarea
                    value={form.notes ?? ''}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                <button
                  onClick={() => save(ed.id)}
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg font-semibold transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        ))}

        {editions.length === 0 && (
          <p className="text-center text-slate-600 py-12 text-sm">No editions found.</p>
        )}
      </div>
    </div>
  )
}

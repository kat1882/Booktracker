'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Edition {
  id: string
  edition_name: string
  edition_type: string | null
  cover_image: string | null
  original_retail_price: number | null
  estimated_value: number | null
  isbn: string | null
  book: { title: string; author: string } | null
  source: { name: string } | null
}

const EDITION_TYPES = ['subscription_box', 'signed', 'illustrated', 'collectors', 'standard', 'other']

export default function AdminEditionSearch({
  initialEditions,
  sources,
  initialQuery,
}: {
  initialEditions: Edition[]
  sources: { id: string; name: string }[]
  initialQuery: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [editions, setEditions] = useState<Edition[]>(initialEditions)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Edition & { source_id: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function search(q: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/editions/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setEditions(data.editions ?? [])
    setLoading(false)
  }

  function startEdit(ed: Edition) {
    setEditing(ed.id)
    setForm({
      edition_name: ed.edition_name,
      edition_type: ed.edition_type ?? '',
      cover_image: ed.cover_image ?? '',
      original_retail_price: ed.original_retail_price ?? undefined,
      estimated_value: ed.estimated_value ?? undefined,
      isbn: ed.isbn ?? '',
    })
    setSaved(null)
  }

  async function save(id: string) {
    setSaving(true)
    const payload: Record<string, unknown> = {}
    if (form.edition_name !== undefined) payload.edition_name = form.edition_name
    if (form.edition_type !== undefined) payload.edition_type = form.edition_type || null
    if (form.cover_image !== undefined) payload.cover_image = form.cover_image || null
    if (form.original_retail_price !== undefined) payload.original_retail_price = form.original_retail_price || null
    if (form.estimated_value !== undefined) payload.estimated_value = form.estimated_value || null
    if (form.isbn !== undefined) payload.isbn = form.isbn || null

    const res = await fetch(`/api/admin/editions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setEditions(prev => prev.map(e => e.id === id ? { ...e, ...payload } as Edition : e))
      setSaved(id)
      setEditing(null)
    }
    setSaving(false)
  }

  return (
    <div>
      <form
        onSubmit={e => { e.preventDefault(); search(query) }}
        className="flex gap-3 mb-6"
      >
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by edition name…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
        <button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {editions.map(ed => (
          <div key={ed.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Row */}
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-14 relative bg-gray-800 rounded shrink-0 overflow-hidden">
                {ed.cover_image && <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover" sizes="40px" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{ed.edition_name}</p>
                <p className="text-xs text-gray-500 truncate">{ed.book?.title} — {ed.source?.name}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-600">
                  {ed.edition_type && <span className="capitalize">{ed.edition_type.replace('_', ' ')}</span>}
                  {ed.isbn && <span>ISBN: {ed.isbn}</span>}
                  {ed.original_retail_price && <span>Retail: ${ed.original_retail_price}</span>}
                  {ed.estimated_value && <span className="text-emerald-600">Market: ${ed.estimated_value}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {saved === ed.id && <span className="text-xs text-green-400 self-center">✓ Saved</span>}
                <button
                  onClick={() => editing === ed.id ? setEditing(null) : startEdit(ed)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                >
                  {editing === ed.id ? 'Cancel' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Edit form */}
            {editing === ed.id && (
              <div className="border-t border-gray-800 p-4 bg-gray-950">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Edition Name</label>
                    <input
                      value={form.edition_name ?? ''}
                      onChange={e => setForm(f => ({ ...f, edition_name: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Edition Type</label>
                    <select
                      value={form.edition_type ?? ''}
                      onChange={e => setForm(f => ({ ...f, edition_type: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="">—</option>
                      {EDITION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ISBN</label>
                    <input
                      value={form.isbn ?? ''}
                      onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Original Retail Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.original_retail_price ?? ''}
                      onChange={e => setForm(f => ({ ...f, original_retail_price: parseFloat(e.target.value) || undefined }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Est. Market Value ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.estimated_value ?? ''}
                      onChange={e => setForm(f => ({ ...f, estimated_value: parseFloat(e.target.value) || undefined }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Cover Image URL</label>
                    <input
                      value={form.cover_image ?? ''}
                      onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => save(ed.id)}
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        ))}

        {editions.length === 0 && !loading && (
          <p className="text-center text-gray-600 py-12">No editions found. Try a different search.</p>
        )}
      </div>
    </div>
  )
}

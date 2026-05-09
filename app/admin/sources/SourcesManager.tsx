'use client'

import Image from 'next/image'
import { useState } from 'react'

interface Source {
  id: string
  name: string
  type: string | null
  website: string | null
  logo_url: string | null
  brand: string | null
  tagline: string | null
  ships_from: string | null
  ships_to: string | null
  book_type: string | null
  genres: string | null
  sub_frequency: string | null
  what_you_get: string | null
  cost: string | null
  sub_renews: string | null
  sub_ships: string | null
  sub_cycle_example: string | null
  skip_notes: string | null
  additional_notes: string | null
}

const SOURCE_TYPES = ['subscription_box', 'retail', 'publisher', 'standard', 'other']

const TYPE_BADGE: Record<string, string> = {
  subscription_box: 'bg-violet-900/40 text-violet-300',
  retail: 'bg-amber-900/40 text-amber-300',
  publisher: 'bg-blue-900/40 text-blue-300',
  standard: 'bg-slate-800 text-slate-400',
  other: 'bg-slate-800 text-slate-400',
}

const inp = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500'

export default function SourcesManager({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState<Source[]>(initialSources)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Source>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', type: '', website: '', logo_url: '', brand: '', tagline: '', ships_from: '', ships_to: '', book_type: '', genres: '', sub_frequency: '', what_you_get: '', cost: '', sub_renews: '', sub_ships: '', sub_cycle_example: '', skip_notes: '', additional_notes: '' })
  const [createSaving, setCreateSaving] = useState(false)
  const [search, setSearch] = useState('')

  function startEdit(s: Source) {
    setEditing(s.id)
    setForm({ name: s.name, type: s.type ?? '', website: s.website ?? '', logo_url: s.logo_url ?? '', brand: s.brand ?? '', tagline: s.tagline ?? '', ships_from: s.ships_from ?? '', ships_to: s.ships_to ?? '', book_type: s.book_type ?? '', genres: s.genres ?? '', sub_frequency: s.sub_frequency ?? '', what_you_get: s.what_you_get ?? '', cost: s.cost ?? '', sub_renews: s.sub_renews ?? '', sub_ships: s.sub_ships ?? '', sub_cycle_example: s.sub_cycle_example ?? '', skip_notes: s.skip_notes ?? '', additional_notes: s.additional_notes ?? '' })
    setSaved(null)
  }

  async function save(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type: form.type || null, website: form.website || null, logo_url: form.logo_url || null, brand: form.brand || null, tagline: form.tagline || null, ships_from: form.ships_from || null, ships_to: form.ships_to || null, book_type: form.book_type || null, genres: form.genres || null, sub_frequency: form.sub_frequency || null, what_you_get: form.what_you_get || null, cost: form.cost || null, sub_renews: form.sub_renews || null, sub_ships: form.sub_ships || null, sub_cycle_example: form.sub_cycle_example || null, skip_notes: form.skip_notes || null, additional_notes: form.additional_notes || null }),
    })
    if (res.ok) {
      setSources(prev => prev.map(s => s.id === id ? { ...s, ...form, type: form.type || null, website: form.website || null, logo_url: form.logo_url || null, brand: form.brand || null, tagline: form.tagline || null, ships_from: form.ships_from || null, ships_to: form.ships_to || null, book_type: form.book_type || null, genres: form.genres || null, sub_frequency: form.sub_frequency || null, what_you_get: form.what_you_get || null, cost: form.cost || null, sub_renews: form.sub_renews || null, sub_ships: form.sub_ships || null, sub_cycle_example: form.sub_cycle_example || null, skip_notes: form.skip_notes || null, additional_notes: form.additional_notes || null } : s))
      setSaved(id)
      setEditing(null)
    }
    setSaving(false)
  }

  async function handleCreate() {
    if (!newForm.name.trim()) return
    setCreateSaving(true)
    const res = await fetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newForm.name.trim(), type: newForm.type || null, website: newForm.website || null, logo_url: newForm.logo_url || null, brand: newForm.brand || null, tagline: newForm.tagline || null, ships_from: newForm.ships_from || null, ships_to: newForm.ships_to || null, book_type: newForm.book_type || null, genres: newForm.genres || null, sub_frequency: newForm.sub_frequency || null, what_you_get: newForm.what_you_get || null, cost: newForm.cost || null, sub_renews: newForm.sub_renews || null, sub_ships: newForm.sub_ships || null, sub_cycle_example: newForm.sub_cycle_example || null, skip_notes: newForm.skip_notes || null, additional_notes: newForm.additional_notes || null }),
    })
    if (res.ok) {
      const { source } = await res.json()
      setSources(prev => [...prev, source].sort((a, b) => a.name.localeCompare(b.name)))
      setNewForm({ name: '', type: '', website: '', logo_url: '' })
      setCreating(false)
    }
    setCreateSaving(false)
  }

  const filtered = sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{sources.length} sources</p>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add Source
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">search</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sources…"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-slate-900 border border-violet-700/40 rounded-xl p-5 mb-5">
          <p className="text-sm font-semibold text-white mb-4">New Source</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Name *</label>
              <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. OwlCrate" className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Type</label>
              <select value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                <option value="">—</option>
                {SOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Website</label>
              <input value={newForm.website} onChange={e => setNewForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Logo URL</label>
              <input value={newForm.logo_url} onChange={e => setNewForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://…/logo.png" className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Brand (for grouping multi-box brands)</label>
              <input value={newForm.brand} onChange={e => setNewForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. OwlCrate" className={inp} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createSaving || !newForm.name.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
              {createSaving ? 'Creating…' : 'Create Source'}
            </button>
            <button onClick={() => setCreating(false)} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 rounded-lg transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Source list */}
      <div className="flex flex-col gap-2">
        {filtered.map(s => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              {/* Logo / initial */}
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center">
                {s.logo_url ? (
                  <Image src={s.logo_url} alt={s.name} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                ) : (
                  <span className="text-slate-400 text-sm font-bold">{s.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  {s.type && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[s.type] ?? 'bg-slate-800 text-slate-400'}`}>
                      {s.type.replace(/_/g, ' ')}
                    </span>
                  )}
                  {s.brand && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">{s.brand}</span>}
                  {saved === s.id && <span className="text-xs text-emerald-400">✓ Saved</span>}
                </div>
                {s.website && <p className="text-xs text-slate-600 mt-0.5 truncate">{s.website}</p>}
              </div>
              <button
                onClick={() => editing === s.id ? setEditing(null) : startEdit(s)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors shrink-0"
              >
                {editing === s.id ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing === s.id && (
              <div className="border-t border-slate-800 p-4 bg-slate-950">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Name</label>
                    <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Type</label>
                    <select value={form.type ?? ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                      <option value="">—</option>
                      {SOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Website</label>
                    <input value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Logo URL</label>
                    <input value={form.logo_url ?? ''} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://…/logo.png" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Brand (for grouping multi-box brands)</label>
                    <input value={form.brand ?? ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. OwlCrate" className={inp} />
                  </div>
                </div>
                {/* Subscription Info */}
                <p className="text-xs font-semibold text-slate-400 mt-4 mb-2 uppercase tracking-widest">Subscription Info</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Tagline / Description</label>
                    <input value={form.tagline ?? ''} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder='e.g. "Monthly romance hardcovers"' className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ships From</label>
                    <input value={form.ships_from ?? ''} onChange={e => setForm(f => ({ ...f, ships_from: e.target.value }))} placeholder="UK, USA" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ships To</label>
                    <input value={form.ships_to ?? ''} onChange={e => setForm(f => ({ ...f, ships_to: e.target.value }))} placeholder="Worldwide" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Book Type</label>
                    <input value={form.book_type ?? ''} onChange={e => setForm(f => ({ ...f, book_type: e.target.value }))} placeholder="Hardcovers" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Genres</label>
                    <input value={form.genres ?? ''} onChange={e => setForm(f => ({ ...f, genres: e.target.value }))} placeholder="Fantasy, Romantasy" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Frequency</label>
                    <input value={form.sub_frequency ?? ''} onChange={e => setForm(f => ({ ...f, sub_frequency: e.target.value }))} placeholder="Monthly / Quarterly" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">What You Get</label>
                    <input value={form.what_you_get ?? ''} onChange={e => setForm(f => ({ ...f, what_you_get: e.target.value }))} placeholder="1 Hardcover + goodies" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Cost</label>
                    <input value={form.cost ?? ''} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="$30 USD + shipping" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Sub Renews</label>
                    <input value={form.sub_renews ?? ''} onChange={e => setForm(f => ({ ...f, sub_renews: e.target.value }))} placeholder="4th of the month" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Sub Ships</label>
                    <input value={form.sub_ships ?? ''} onChange={e => setForm(f => ({ ...f, sub_ships: e.target.value }))} placeholder="By end of month" className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Cycle Example</label>
                    <input value={form.sub_cycle_example ?? ''} onChange={e => setForm(f => ({ ...f, sub_cycle_example: e.target.value }))} placeholder="April box renews Apr 4th, ships by end of April" className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Skip / Cancel Policy</label>
                    <input value={form.skip_notes ?? ''} onChange={e => setForm(f => ({ ...f, skip_notes: e.target.value }))} placeholder="Skip by 3rd of month · 4 skips/year" className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Additional Notes</label>
                    <input value={form.additional_notes ?? ''} onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))} placeholder="Other options, combo boxes, etc." className={inp} />
                  </div>
                </div>
                <button onClick={() => save(s.id)} disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate-600 text-sm text-center py-8">No sources match "{search}"</p>
        )}
      </div>
    </div>
  )
}

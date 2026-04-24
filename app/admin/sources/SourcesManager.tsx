'use client'

import { useState } from 'react'

interface Source {
  id: string
  name: string
  type: string | null
  website: string | null
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
  const [newForm, setNewForm] = useState({ name: '', type: '', website: '' })
  const [createSaving, setCreateSaving] = useState(false)

  function startEdit(s: Source) {
    setEditing(s.id)
    setForm({ name: s.name, type: s.type ?? '', website: s.website ?? '' })
    setSaved(null)
  }

  async function save(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type: form.type || null, website: form.website || null }),
    })
    if (res.ok) {
      setSources(prev => prev.map(s => s.id === id ? { ...s, ...form, type: form.type || null, website: form.website || null } : s))
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
      body: JSON.stringify({ name: newForm.name.trim(), type: newForm.type || null, website: newForm.website || null }),
    })
    if (res.ok) {
      const { source } = await res.json()
      setSources(prev => [...prev, source].sort((a, b) => a.name.localeCompare(b.name)))
      setNewForm({ name: '', type: '', website: '' })
      setCreating(false)
    }
    setCreateSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">{sources.length} sources</p>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add Source
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-slate-900 border border-violet-700/40 rounded-xl p-5 mb-5">
          <p className="text-sm font-semibold text-white mb-4">New Source</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createSaving || !newForm.name.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
              {createSaving ? 'Creating…' : 'Create Source'}
            </button>
            <button onClick={() => setCreating(false)} className="text-sm text-slate-500 hover:text-slate-300 px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Source list */}
      <div className="flex flex-col gap-2">
        {sources.map(s => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  {s.type && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[s.type] ?? 'bg-slate-800 text-slate-400'}`}>
                      {s.type.replace(/_/g, ' ')}
                    </span>
                  )}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
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
                </div>
                <button onClick={() => save(s.id)} disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

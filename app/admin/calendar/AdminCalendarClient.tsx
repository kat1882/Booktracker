'use client'

import { useState } from 'react'

interface CalendarEntry {
  id: string
  book_title: string
  author?: string
  release_date: string
  edition_type?: string
  notes?: string
  cover_image_url?: string
  edition_id?: string
  source: { id: string; name: string } | null
}

interface Source { id: string; name: string }

interface Props {
  initialEntries: CalendarEntry[]
  sources: Source[]
}

const BLANK = {
  source_id: '', book_title: '', author: '', release_date: '', edition_type: '',
  notes: '', cover_image_url: '', edition_id: '',
}

export default function AdminCalendarClient({ initialEntries, sources }: Props) {
  const [entries, setEntries] = useState<CalendarEntry[]>(initialEntries)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState('')

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.entry) {
      const src = sources.find(s => s.id === form.source_id)
      setEntries(prev => [...prev, { ...data.entry, source: src ? { id: src.id, name: src.name } : null }]
        .sort((a, b) => a.release_date.localeCompare(b.release_date)))
      setForm(BLANK)
      setMsg('Added!')
    } else {
      setMsg('Error: ' + data.error)
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this entry?')) return
    await fetch('/api/admin/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function processReleases() {
    setProcessing(true)
    const res = await fetch('/api/calendar/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: '' }),
    })
    const data = await res.json()
    setMsg(`Processed ${data.processed} entries, added ${data.added} to collections`)
    setProcessing(false)
    setTimeout(() => setMsg(''), 5000)
  }

  return (
    <div className="space-y-8">
      {/* Add form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Add Release</h2>
        <form onSubmit={addEntry} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Source / Box</label>
            <select
              value={form.source_id}
              onChange={e => setForm(f => ({ ...f, source_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">— No source —</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Book Title *</label>
            <input required value={form.book_title} onChange={e => setForm(f => ({ ...f, book_title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Author</label>
            <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Release Date *</label>
            <input type="date" required value={form.release_date} onChange={e => setForm(f => ({ ...f, release_date: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Edition Type</label>
            <select value={form.edition_type} onChange={e => setForm(f => ({ ...f, edition_type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">—</option>
              <option value="subscription_box">Subscription Box</option>
              <option value="signed">Signed</option>
              <option value="illustrated">Illustrated</option>
              <option value="limited">Limited</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Cover Image URL</label>
            <input value={form.cover_image_url} onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Edition ID (if exists)</label>
            <input value={form.edition_id} onChange={e => setForm(f => ({ ...f, edition_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="uuid" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
              {saving ? 'Adding…' : 'Add Entry'}
            </button>
            {msg && <p className="text-sm text-emerald-400">{msg}</p>}
          </div>
        </form>
      </div>

      {/* Process button */}
      <div className="flex items-center gap-4">
        <button onClick={processReleases} disabled={processing}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 px-5 py-2 rounded-lg transition-colors disabled:opacity-50">
          {processing ? 'Processing…' : 'Process Released Entries → Auto-add to Subscribed Collections'}
        </button>
      </div>

      {/* Entry list */}
      <div className="space-y-2">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-start gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {entry.source && <span className="text-xs text-violet-400 font-medium">{entry.source.name}</span>}
                <span className="text-xs text-gray-600">{entry.release_date}</span>
              </div>
              <p className="text-sm text-white font-medium mt-0.5">{entry.book_title}</p>
              {entry.author && <p className="text-xs text-gray-500">{entry.author}</p>}
              {entry.notes && <p className="text-xs text-gray-600 mt-1">{entry.notes}</p>}
              {entry.edition_id && (
                <p className="text-xs text-emerald-500 mt-0.5">✓ Linked to edition</p>
              )}
            </div>
            <button onClick={() => deleteEntry(entry.id)}
              className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0">
              ✕
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-center text-gray-600 py-8">No entries yet.</p>
        )}
      </div>
    </div>
  )
}

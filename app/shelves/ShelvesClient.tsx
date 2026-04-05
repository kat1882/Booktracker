'use client'

import { useState } from 'react'
import ShelfCard from './ShelfCard'
import Link from 'next/link'

interface ShelfEntry {
  id: string
  reading_status: string
  rating: number | null
  date_read: string | null
  date_started: string | null
  book: { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string; google_books_id?: string } | null
  edition: { id: string; cover_image?: string; edition_name?: string; source?: { name: string } } | null
}

interface Stats {
  total: number
  read: number
  reading: number
  wantToRead: number
  readThisYear: number
  avgRating: number | null
  collectionValue: number | null
}

const STATUS_LABELS: Record<string, string> = {
  reading: 'Currently Reading',
  want_to_read: 'Want to Read',
  read: 'Read',
  dnf: 'Did Not Finish',
}

const STATUS_COLORS: Record<string, string> = {
  reading: 'text-green-400',
  want_to_read: 'text-blue-400',
  read: 'text-violet-400',
  dnf: 'text-gray-500',
}

export default function ShelvesClient({ initialEntries, stats }: { initialEntries: ShelfEntry[]; stats: Stats }) {
  const [entries, setEntries] = useState<ShelfEntry[]>(initialEntries)
  const [activeShelf, setActiveShelf] = useState<string>('all')

  async function handleUpdate(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/shelf/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    }
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/shelf/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  const shelves = ['reading', 'want_to_read', 'read', 'dnf']
  const filtered = activeShelf === 'all'
    ? entries
    : entries.filter(e => e.reading_status === activeShelf)

  const grouped = filtered.reduce<Record<string, ShelfEntry[]>>((acc, e) => {
    const s = e.reading_status ?? 'want_to_read'
    if (!acc[s]) acc[s] = []
    acc[s].push(e)
    return acc
  }, {})

  if (entries.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Your shelves are empty.</p>
        <Link href="/search" className="text-violet-400 hover:text-violet-300">Search for books to add →</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Books tracked</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-violet-400">{stats.read}</p>
          <p className="text-xs text-gray-500 mt-0.5">Books read</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.readThisYear}</p>
          <p className="text-xs text-gray-500 mt-0.5">Read this year</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Avg rating</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-emerald-400">
            {stats.collectionValue ? `£${stats.collectionValue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Est. collection value</p>
        </div>
      </div>

      {/* Shelf tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveShelf('all')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${activeShelf === 'all' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
        >
          All ({entries.length})
        </button>
        {shelves.map(s => {
          const count = entries.filter(e => e.reading_status === s).length
          if (!count) return null
          return (
            <button
              key={s}
              onClick={() => setActiveShelf(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${activeShelf === s ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              {STATUS_LABELS[s].split(' ')[0]} ({count})
            </button>
          )
        })}
      </div>

      {/* Shelves */}
      {(activeShelf === 'all' ? shelves : [activeShelf]).map(status => {
        const shelf = grouped[status]
        if (!shelf?.length) return null
        return (
          <section key={status} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className={`text-base font-semibold ${STATUS_COLORS[status]}`}>
                {STATUS_LABELS[status]}
              </h2>
              <span className="text-sm text-gray-600">{shelf.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {shelf.map(entry => (
                <ShelfCard
                  key={entry.id}
                  entry={entry}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

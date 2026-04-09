'use client'

import { useState } from 'react'

interface Book {
  id: string
  title: string
  author: string
  edition_count?: number
}

export default function BookMergeTool() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [canonical, setCanonical] = useState<Book | null>(null)
  const [duplicate, setDuplicate] = useState<Book | null>(null)
  const [merging, setMerging] = useState(false)
  const [merged, setMerged] = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch(`/api/admin/books/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data.books ?? [])
    setLoading(false)
  }

  async function merge() {
    if (!canonical || !duplicate || canonical.id === duplicate.id) return
    if (!confirm(`Merge all editions from "${duplicate.title}" into "${canonical.title}" and delete the duplicate? This cannot be undone.`)) return
    setMerging(true)
    const res = await fetch('/api/admin/books/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepId: canonical.id, deleteId: duplicate.id }),
    })
    if (res.ok) {
      setMerged(`Merged "${duplicate.title}" → "${canonical.title}"`)
      setResults(prev => prev.filter(b => b.id !== duplicate.id))
      setDuplicate(null)
    } else {
      const err = await res.json()
      alert(`Merge failed: ${err.error}`)
    }
    setMerging(false)
  }

  return (
    <div>
      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); search() }} className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search book title…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
        <button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {merged && (
        <div className="bg-green-900/30 border border-green-800 rounded-xl p-4 mb-6 text-sm text-green-400">
          ✓ {merged}
        </div>
      )}

      {/* Selection summary */}
      {(canonical || duplicate) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Keep (canonical)</p>
              {canonical
                ? <p className="text-sm font-medium text-green-400 truncate">{canonical.title} <span className="text-gray-500 font-normal">by {canonical.author}</span></p>
                : <p className="text-sm text-gray-600 italic">Click a book below to set as keeper</p>}
            </div>
            <span className="text-gray-600 text-lg">→</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Delete (duplicate)</p>
              {duplicate
                ? <p className="text-sm font-medium text-red-400 truncate">{duplicate.title} <span className="text-gray-500 font-normal">by {duplicate.author}</span></p>
                : <p className="text-sm text-gray-600 italic">Right-click a book to set as duplicate</p>}
            </div>
            <button
              onClick={merge}
              disabled={!canonical || !duplicate || canonical.id === duplicate.id || merging}
              className="bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors shrink-0"
            >
              {merging ? 'Merging…' : 'Merge →'}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex flex-col gap-2">
        {results.map(book => (
          <div
            key={book.id}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
              canonical?.id === book.id ? 'bg-green-900/20 border-green-800' :
              duplicate?.id === book.id ? 'bg-red-900/20 border-red-800' :
              'bg-gray-900 border-gray-800'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{book.title}</p>
              <p className="text-xs text-gray-500">{book.author}</p>
              {book.edition_count !== undefined && (
                <p className="text-xs text-gray-600 mt-0.5">{book.edition_count} edition{book.edition_count !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setCanonical(book)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  canonical?.id === book.id
                    ? 'bg-green-700 border-green-600 text-white'
                    : 'border-gray-700 text-gray-400 hover:text-green-400 hover:border-green-800'
                }`}
              >
                Keep
              </button>
              <button
                onClick={() => setDuplicate(book)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  duplicate?.id === book.id
                    ? 'bg-red-800 border-red-700 text-white'
                    : 'border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-900'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {results.length === 0 && !loading && query && (
          <p className="text-center text-gray-600 py-10">No books found.</p>
        )}
      </div>
    </div>
  )
}

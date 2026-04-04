'use client'
import { useState } from 'react'
import Image from 'next/image'

interface OLBook {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  subject?: string[]
  open_library_id?: string
}

type ShelfStatus = 'read' | 'reading' | 'want_to_read'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OLBook[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Record<string, ShelfStatus>>({})

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,first_publish_year,cover_i,subject`
    )
    const data = await res.json()
    setResults(data.docs ?? [])
    setLoading(false)
  }

  async function addToShelf(book: OLBook, status: ShelfStatus) {
    const key = book.key
    setAdding(key)
    const payload = {
      book: {
        title: book.title,
        author: book.author_name?.[0] ?? 'Unknown',
        first_publish_year: book.first_publish_year,
        open_library_id: book.key.replace('/works/', ''),
        cover_ol_id: book.cover_i?.toString() ?? null,
        genre: book.subject?.[0] ?? null,
      },
      status,
    }
    const res = await fetch('/api/books/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) setAdded(prev => ({ ...prev, [key]: status }))
    else {
      const err = await res.json()
      if (err.error === 'Not authenticated') window.location.href = '/auth/login'
    }
    setAdding(null)
  }

  const coverUrl = (coverId?: number) =>
    coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Search Books</h1>

      <form onSubmit={search} className="flex gap-3 mb-8">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, author, or ISBN..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {results.map(book => {
          const cover = coverUrl(book.cover_i)
          const addedStatus = added[book.key]
          const isAdding = adding === book.key

          return (
            <div key={book.key} className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="w-16 shrink-0">
                <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden">
                  {cover ? (
                    <Image src={cover} alt={book.title} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">?</div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white leading-tight">{book.title}</h3>
                {book.author_name?.[0] && (
                  <p className="text-sm text-gray-400 mt-0.5">{book.author_name[0]}</p>
                )}
                {book.first_publish_year && (
                  <p className="text-xs text-gray-600 mt-0.5">{book.first_publish_year}</p>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  {addedStatus ? (
                    <span className="text-xs text-violet-400 font-medium py-1.5">
                      ✓ Added to {addedStatus.replace('_', ' ')}
                    </span>
                  ) : (
                    <>
                      {(['want_to_read', 'reading', 'read'] as ShelfStatus[]).map(status => (
                        <button
                          key={status}
                          disabled={isAdding}
                          onClick={() => addToShelf(book, status)}
                          className="text-xs bg-gray-800 hover:bg-violet-600 disabled:opacity-50 text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition-colors capitalize"
                        >
                          {isAdding ? '...' : status.replace('_', ' ')}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {results.length === 0 && !loading && query && (
        <p className="text-center text-gray-500 py-16">No results found.</p>
      )}
      {results.length === 0 && !loading && !query && (
        <p className="text-center text-gray-500 py-16">Search for any book to add it to your shelves.</p>
      )}
    </div>
  )
}

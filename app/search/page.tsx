'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(() => import('@/app/components/BarcodeScanner'), { ssr: false })

interface GBBook {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publishedDate?: string
    description?: string
    categories?: string[]
    pageCount?: number
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    industryIdentifiers?: { type: string; identifier: string }[]
  }
}

interface DBBook {
  id: string
  title: string
  author: string
  cover_image?: string
  genre?: string
  first_publish_year?: number
  google_books_id?: string
}

// Unified result shown in the list
interface BookResult {
  key: string
  href: string
  title: string
  author: string
  year?: string
  genre?: string
  cover?: string
  isInDB: boolean
  gbBook?: GBBook  // only for GB results (for add-to-shelf)
}

type ShelfStatus = 'read' | 'reading' | 'want_to_read'

const GENRES = [
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Romance', value: 'romance' },
  { label: 'Sci-Fi', value: 'science fiction' },
  { label: 'Thriller', value: 'thriller' },
  { label: 'Horror', value: 'horror' },
  { label: 'Mystery', value: 'mystery' },
  { label: 'YA', value: 'young adult' },
  { label: 'Historical', value: 'historical fiction' },
]

function cleanCover(url?: string) {
  if (!url) return null
  return url.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
}

function SearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [genre, setGenre] = useState(searchParams.get('genre') ?? '')
  const [results, setResults] = useState<BookResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Record<string, ShelfStatus>>({})
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const g = searchParams.get('genre') ?? ''
    setQuery(q)
    setGenre(g)
    if (q) doSearch(q, g)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  async function doSearch(q: string, g: string) {
    if (!q.trim()) return
    setLoading(true)

    const fullQuery = g ? `${q} subject:${g}` : q

    // Run both searches in parallel
    const [gbRes, dbRes] = await Promise.all([
      fetch(`/api/books/search?q=${encodeURIComponent(fullQuery)}`).then(r => r.json()),
      fetch(`/api/books/db-search?q=${encodeURIComponent(q)}`).then(r => r.json()),
    ])

    const gbBooks: GBBook[] = gbRes.books ?? []
    const dbBooks: DBBook[] = dbRes.books ?? []

    // Build a set of google_books_ids that exist in DB so we don't duplicate
    const dbGbIds = new Set(dbBooks.map(b => b.google_books_id).filter(Boolean))

    const merged: BookResult[] = []

    // DB books first (they have special editions)
    for (const db of dbBooks) {
      merged.push({
        key: `db_${db.id}`,
        href: `/book/${db.id}`,
        title: db.title,
        author: db.author,
        year: db.first_publish_year ? String(db.first_publish_year) : undefined,
        genre: db.genre ?? undefined,
        cover: db.cover_image,
        isInDB: true,
      })
    }

    // Google Books results — skip any already covered by DB
    for (const gb of gbBooks) {
      if (dbGbIds.has(gb.id)) continue
      const info = gb.volumeInfo
      merged.push({
        key: `gb_${gb.id}`,
        href: `/book/gb_${gb.id}`,
        title: info.title,
        author: info.authors?.[0] ?? 'Unknown',
        year: info.publishedDate?.slice(0, 4),
        genre: info.categories?.[0]?.split('/')[0].trim().toLowerCase(),
        cover: cleanCover(info.imageLinks?.thumbnail) ?? undefined,
        isInDB: false,
        gbBook: gb,
      })
    }

    setResults(merged)
    setLoading(false)
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const params = new URLSearchParams()
    params.set('q', query.trim())
    if (genre) params.set('genre', genre)
    router.push(`/search?${params.toString()}`)
  }

  function handleGenreToggle(value: string) {
    const newGenre = genre === value ? '' : value
    setGenre(newGenre)
    if (query.trim()) {
      const params = new URLSearchParams()
      params.set('q', query.trim())
      if (newGenre) params.set('genre', newGenre)
      router.push(`/search?${params.toString()}`)
    } else {
      setGenre(newGenre)
    }
  }

  async function addToShelf(result: BookResult, status: ShelfStatus) {
    if (!result.gbBook) return
    setAdding(result.key)
    const info = result.gbBook.volumeInfo
    const isbn = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
      ?? info.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier

    const res = await fetch('/api/books/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book: {
          title: info.title,
          author: info.authors?.[0] ?? 'Unknown',
          google_books_id: result.gbBook.id,
          cover_image: cleanCover(info.imageLinks?.thumbnail) ?? null,
          synopsis: info.description ?? null,
          genre: info.categories?.[0]?.split('/')[0].trim().toLowerCase() ?? null,
          page_count: info.pageCount ?? null,
          isbn: isbn ?? null,
          first_publish_year: info.publishedDate ? parseInt(info.publishedDate) : null,
        },
        status,
      }),
    })
    if (res.ok) setAdded(prev => ({ ...prev, [result.key]: status }))
    else {
      const err = await res.json()
      if (err.error === 'Not authenticated') window.location.href = '/auth/login'
    }
    setAdding(null)
  }

  const currentSearchUrl = `/search?${searchParams.toString()}`

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, author, or ISBN…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          title="Scan barcode"
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-4 py-3 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m12-12h-3a1 1 0 00-1 1v3m4 9h-3a1 1 0 01-1-1v-3M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01" />
          </svg>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onResult={result => {
            setScanning(false)
            if (result.type === 'edition') {
              router.push(`/edition/${result.id}`)
            } else {
              router.push(`/book/${result.id}`)
            }
          }}
        />
      )}

      {/* Genre filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {GENRES.map(g => (
          <button
            key={g.value}
            onClick={() => handleGenreToggle(g.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              genre === g.value
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
            }`}
          >
            {g.label}
          </button>
        ))}
        {genre && (
          <button
            onClick={() => handleGenreToggle(genre)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-800 transition-colors"
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex flex-col gap-4">
        {results.map(result => {
          const addedStatus = added[result.key]
          const isAdding = adding === result.key

          return (
            <div key={result.key} className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <Link href={`${result.href}?from=${encodeURIComponent(currentSearchUrl)}`} className="w-16 shrink-0">
                <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                  {result.cover ? (
                    <Image src={result.cover} alt={result.title} fill className="object-cover" sizes="64px" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-1">{result.title}</div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <Link
                    href={`${result.href}?from=${encodeURIComponent(currentSearchUrl)}`}
                    className="font-semibold text-white leading-tight hover:text-violet-300 transition-colors line-clamp-2"
                  >
                    {result.title}
                  </Link>
                  {result.isInDB && (
                    <span className="shrink-0 text-[10px] bg-violet-900/50 text-violet-300 border border-violet-700/50 px-1.5 py-0.5 rounded-full mt-0.5">
                      Special editions
                    </span>
                  )}
                </div>
                {result.author && <p className="text-sm text-gray-400 mt-0.5">{result.author}</p>}
                {result.year && <p className="text-xs text-gray-600 mt-0.5">{result.year}</p>}
                {result.genre && <p className="text-xs text-gray-600">{result.genre}</p>}

                {/* Add to shelf — only for Google Books results */}
                {result.gbBook && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {addedStatus ? (
                      <span className="text-xs text-violet-400 font-medium py-1.5">
                        ✓ Added to {addedStatus.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <>
                        {(['want_to_read', 'reading', 'read'] as ShelfStatus[]).map(status => (
                          <button
                            key={status}
                            disabled={isAdding}
                            onClick={() => addToShelf(result, status)}
                            className="text-xs bg-gray-800 hover:bg-violet-600 disabled:opacity-50 text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition-colors capitalize"
                          >
                            {isAdding ? '…' : status.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {results.length === 0 && !loading && query && (
        <p className="text-center text-gray-500 py-16">No results found.</p>
      )}
      {results.length === 0 && !loading && !query && (
        <p className="text-center text-gray-500 py-16">Search for any book to see all editions and special variants.</p>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  )
}

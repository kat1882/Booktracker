'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(() => import('@/app/components/BarcodeScanner'), { ssr: false })

interface DBBook {
  id: string
  title: string
  author: string
  cover_image?: string
  genre?: string
  first_publish_year?: number
}

function SearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [results, setResults] = useState<DBBook[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
    if (q) doSearch(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  async function doSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    const res = await fetch(`/api/books/db-search?q=${encodeURIComponent(q)}`).then(r => r.json())
    setResults(res.books ?? [])
    setLoading(false)
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const currentSearchUrl = `/search?${searchParams.toString()}`

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title or author…"
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

      <div className="flex flex-col gap-4">
        {results.map(book => (
          <Link
            key={book.id}
            href={`/book/${book.id}?from=${encodeURIComponent(currentSearchUrl)}`}
            className="flex gap-4 bg-gray-900 border border-gray-800 hover:border-violet-500 rounded-xl p-4 transition-colors"
          >
            <div className="w-16 shrink-0">
              <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden">
                {book.cover_image ? (
                  <Image src={book.cover_image} alt={book.title} fill className="object-cover" sizes="64px" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-1">{book.title}</div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
              {book.author && <p className="text-sm text-gray-400 mt-0.5">{book.author}</p>}
              {book.genre && <p className="text-xs text-gray-600 mt-0.5 capitalize">{book.genre}</p>}
            </div>
          </Link>
        ))}
      </div>

      {results.length === 0 && !loading && query && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-3">No results found for &ldquo;{query}&rdquo;.</p>
          <p className="text-sm text-gray-600 mb-4">This book may not be in our database yet.</p>
          <Link href="/submit" className="text-violet-400 hover:text-violet-300 text-sm border border-violet-800 hover:border-violet-600 px-4 py-2 rounded-lg transition-colors">
            Submit a book or edition →
          </Link>
        </div>
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

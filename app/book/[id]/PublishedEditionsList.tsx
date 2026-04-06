'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export interface PublishedEditionData {
  isbn: string | null
  format: string | null
  publisher: string | null
  year: string | null
  coverUrl: string | null
  pages: number | null
  language: string | null
  title: string | null
}

interface BookMeta {
  title: string
  author: string
  google_books_id?: string
  open_library_id?: string
  cover_image?: string | null
  synopsis?: string | null
  genre?: string | null
  page_count?: number | null
}

const STATUSES = [
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read ✓' },
]

const STATUS_LABELS: Record<string, string> = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  read: 'Read',
}

export default function PublishedEditionsList({
  editions,
  bookId,
  bookMeta,
  isLoggedIn,
}: {
  editions: PublishedEditionData[]
  bookId: string | null
  bookMeta: BookMeta
  isLoggedIn: boolean
}) {
  // Track shelf status per edition index
  const [statuses, setStatuses] = useState<Record<number, string>>({})
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [loading, setLoading] = useState<number | null>(null)
  const router = useRouter()

  async function handleAdd(index: number, edition: PublishedEditionData, status: string) {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    setLoading(index)
    setOpenMenu(null)

    const res = await fetch('/api/shelf/add-published-edition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        book_meta: bookMeta,
        isbn: edition.isbn,
        format: edition.format,
        publisher: edition.publisher,
        year: edition.year,
        cover_url: edition.coverUrl,
        status,
      }),
    })

    if (res.ok) {
      setStatuses(prev => ({ ...prev, [index]: status }))
    }
    setLoading(null)
  }

  return (
    <div className="flex flex-col divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
      {editions.map((edition, i) => {
        const currentStatus = statuses[i] ?? null
        const isLoading = loading === i
        const menuOpen = openMenu === i

        return (
          <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-900/50 transition-colors">
            {/* Small cover */}
            <div className="w-8 h-12 relative bg-gray-800 rounded overflow-hidden shrink-0">
              {edition.coverUrl ? (
                <Image src={edition.coverUrl} alt={edition.title ?? ''} fill className="object-cover" sizes="32px" unoptimized />
              ) : (
                <div className="absolute inset-0 bg-gray-800" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {edition.format && <span className="text-sm font-medium text-white">{edition.format}</span>}
                {edition.publisher && <span className="text-sm text-gray-400">{edition.publisher}</span>}
                {edition.year && <span className="text-sm text-gray-500">{edition.year}</span>}
                {edition.language && edition.language !== 'English' && (
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{edition.language}</span>
                )}
                {edition.pages && (
                  <span className="text-xs text-gray-600">{edition.pages} pages</span>
                )}
              </div>
              {edition.isbn && <p className="text-xs text-gray-600 mt-0.5 font-mono">ISBN: {edition.isbn}</p>}
            </div>

            {/* Add to shelf button */}
            <div className="relative shrink-0">
              {currentStatus ? (
                <button
                  onClick={() => setOpenMenu(menuOpen ? null : i)}
                  className="text-xs bg-violet-900/50 border border-violet-700/50 text-violet-300 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-900 transition-colors"
                >
                  ✓ {STATUS_LABELS[currentStatus]}
                </button>
              ) : (
                <button
                  onClick={() => setOpenMenu(menuOpen ? null : i)}
                  disabled={isLoading}
                  className="text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? '…' : '+ I own this'}
                </button>
              )}

              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleAdd(i, edition, s.value)}
                      className="w-full text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

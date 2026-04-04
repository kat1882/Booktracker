'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'want_to_read' | 'reading' | 'read'

const LABELS: Record<Status, string> = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  read: 'Read',
}

interface Props {
  book: {
    title: string
    author: string
    google_books_id?: string
    open_library_id?: string
    cover_image?: string | null
    cover_ol_id?: string | null
    synopsis?: string | null
    genre?: string | null
    page_count?: number | null
  }
  currentStatus: string | null
  isLoggedIn: boolean
}

export default function AddToShelfButton({ book, currentStatus, isLoggedIn }: Props) {
  const [status, setStatus] = useState<string | null>(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAdd(newStatus: Status) {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    setLoading(true)
    const res = await fetch('/api/books/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, status: newStatus }),
    })
    if (res.ok) { setStatus(newStatus); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(LABELS) as Status[]).map(s => (
        <button
          key={s}
          disabled={loading}
          onClick={() => handleAdd(s)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            status === s
              ? 'bg-violet-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {status === s ? `✓ ${LABELS[s]}` : LABELS[s]}
        </button>
      ))}
    </div>
  )
}

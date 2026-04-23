'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'preordered', label: 'Preordered' },
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
]

export default function AddEditionToShelfButton({ editionId, bookId, initialStatus, isLoggedIn }: {
  editionId: string
  bookId: string
  initialStatus: string | null
  isLoggedIn: boolean
}) {
  const [status, setStatus] = useState<string | null>(initialStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAdd(newStatus: string) {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    setLoading(true)
    const res = await fetch('/api/shelf/add-edition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: editionId, book_id: bookId, status: newStatus }),
    })
    if (res.ok) setStatus(newStatus)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map(s => (
        <button
          key={s.value}
          disabled={loading}
          onClick={() => handleAdd(s.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            status === s.value
              ? 'bg-violet-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
          }`}
        >
          {status === s.value ? `✓ ${s.label}` : s.label}
        </button>
      ))}
    </div>
  )
}

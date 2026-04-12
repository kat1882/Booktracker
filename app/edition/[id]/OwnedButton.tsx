'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OwnedButton({ editionId, bookId, initialOwned, isLoggedIn }: {
  editionId: string
  bookId: string
  initialOwned: boolean
  isLoggedIn: boolean
}) {
  const [owned, setOwned] = useState(initialOwned)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    setLoading(true)
    const next = !owned
    const res = await fetch('/api/shelf/own-edition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: editionId, book_id: bookId, owned: next }),
    })
    if (res.ok) setOwned(next)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
        owned
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
          : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600'
      }`}
    >
      {owned ? '✓ I own this edition' : 'I own this edition'}
    </button>
  )
}

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
      className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1 min-h-[72px] ${
        owned
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-emerald-600/50'
      }`}
    >
      <span className="text-xl">{owned ? '✓' : '📦'}</span>
      <span>{owned ? 'Owned' : 'I own this'}</span>
    </button>
  )
}

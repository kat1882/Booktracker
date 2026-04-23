'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WishlistButton({ editionId, initialWishlisted, isLoggedIn }: {
  editionId: string
  initialWishlisted: boolean
  isLoggedIn: boolean
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    setLoading(true)
    const method = wishlisted ? 'DELETE' : 'POST'
    const res = await fetch('/api/wishlist', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: editionId }),
    })
    if (res.ok) setWishlisted(v => !v)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1 min-h-[72px] ${
        wishlisted
          ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/30'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-pink-600/50'
      }`}
    >
      <span className="text-xl">{wishlisted ? '♥' : '♡'}</span>
      <span>{wishlisted ? 'Wanted' : 'Want this'}</span>
    </button>
  )
}

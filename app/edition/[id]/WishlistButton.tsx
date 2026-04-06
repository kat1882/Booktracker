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
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
        wishlisted
          ? 'bg-pink-600 text-white hover:bg-pink-700'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
      }`}
    >
      <span>{wishlisted ? '♥' : '♡'}</span>
      {wishlisted ? 'On Wish List' : 'Want this Edition'}
    </button>
  )
}

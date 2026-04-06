'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WishlistRemoveButton({ editionId }: { editionId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function remove() {
    setLoading(true)
    await fetch('/api/wishlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: editionId }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={remove}
      disabled={loading}
      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-900/80 text-gray-400 hover:text-red-400 hover:bg-gray-800 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
      title="Remove from wish list"
    >
      ✕
    </button>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ListItemRemoveButton({ listId, editionId }: { listId: string; editionId: string }) {
  const [removing, setRemoving] = useState(false)
  const router = useRouter()

  async function remove() {
    setRemoving(true)
    await fetch(`/api/lists/${listId}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: editionId }),
    })
    router.refresh()
    setRemoving(false)
  }

  return (
    <button
      onClick={remove}
      disabled={removing}
      className="absolute top-2 right-2 w-6 h-6 bg-gray-900/90 border border-gray-700 rounded-full text-gray-500 hover:text-red-400 hover:border-red-800 text-xs transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center"
    >
      {removing ? '…' : '✕'}
    </button>
  )
}

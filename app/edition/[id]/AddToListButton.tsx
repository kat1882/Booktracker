'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UserList {
  id: string
  name: string
}

export default function AddToListButton({ editionId, isLoggedIn }: { editionId: string; isLoggedIn: boolean }) {
  const [lists, setLists] = useState<UserList[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn || !open) return
    fetch('/api/lists').then(r => r.json()).then(d => setLists(d.lists ?? []))
  }, [open, isLoggedIn])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function addToList(listId: string) {
    setLoading(true)
    await fetch(`/api/lists/${listId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: editionId }),
    })
    setAdded(prev => ({ ...prev, [listId]: true }))
    setLoading(false)
  }

  if (!isLoggedIn) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
      >
        + Add to List
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden py-1">
          {lists.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No lists yet.{' '}
              <a href="/lists" className="text-violet-400 hover:underline">Create one →</a>
            </div>
          ) : (
            lists.map(list => (
              <button
                key={list.id}
                disabled={loading || added[list.id]}
                onClick={() => addToList(list.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                  added[list.id]
                    ? 'text-violet-400 bg-violet-900/20'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="truncate">{list.name}</span>
                {added[list.id] && <span className="text-xs ml-2 shrink-0">✓</span>}
              </button>
            ))
          )}
          <div className="border-t border-gray-800 mt-1 pt-1">
            <a href="/lists" className="block px-4 py-2.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Manage lists →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Source {
  id: string
  name: string
  type: string
}

interface Props {
  sources: Source[]
  initialSubs: string[]
  isLoggedIn: boolean
}

export default function CalendarClient({ sources, initialSubs, isLoggedIn }: Props) {
  const [subs, setSubs] = useState<Set<string>>(new Set(initialSubs))
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function toggle(sourceId: string) {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }
    setLoading(sourceId)
    const subscribed = subs.has(sourceId)
    const method = subscribed ? 'DELETE' : 'POST'

    await fetch('/api/calendar/subscribe', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId }),
    })

    setSubs(prev => {
      const next = new Set(prev)
      subscribed ? next.delete(sourceId) : next.add(sourceId)
      return next
    })
    setLoading(null)
  }

  return (
    <div className="mb-8 mt-4">
      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
        Subscribe to auto-add releases to your collection
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map(s => {
          const subscribed = subs.has(s.id)
          const busy = loading === s.id
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              disabled={busy}
              className={`text-sm px-4 py-2 rounded-full border font-medium transition-colors disabled:opacity-50 ${
                subscribed
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-violet-500 hover:text-violet-300'
              }`}
            >
              {busy ? '…' : subscribed ? `✓ ${s.name}` : s.name}
            </button>
          )
        })}
      </div>
      {isLoggedIn && subs.size > 0 && (
        <p className="text-xs text-gray-600 mt-2">
          New editions from your subscribed boxes will be added to your "Want to Read" shelf automatically when released.
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'

interface UserList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  item_count: number
}

export default function ListsClient({ initialLists }: { initialLists: UserList[] }) {
  const [lists, setLists] = useState<UserList[]>(initialLists)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPublic, setNewPublic] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, is_public: newPublic }),
    })
    if (res.ok) {
      const { list } = await res.json()
      setLists(prev => [{ ...list, item_count: 0 }, ...prev])
      setNewName('')
      setNewDesc('')
      setNewPublic(false)
      setShowCreate(false)
    }
    setCreating(false)
  }

  async function deleteList(id: string, name: string) {
    if (!confirm(`Delete list "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    if (res.ok) setLists(prev => prev.filter(l => l.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      {/* Create button / form */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3 border-2 border-dashed border-gray-800 hover:border-violet-600 text-gray-500 hover:text-violet-400 rounded-xl text-sm font-medium transition-colors mb-6"
        >
          + Create a new list
        </button>
      ) : (
        <form onSubmit={createList} className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">New List</h3>
          <div className="flex flex-col gap-3 mb-4">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="List name (e.g. Signed Editions I Own)"
              autoFocus
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={newPublic}
                onChange={e => setNewPublic(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-violet-600 focus:ring-violet-500"
              />
              Make this list public
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating || !newName.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
              {creating ? 'Creating…' : 'Create List'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-white px-4 py-2 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Lists */}
      {lists.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          No lists yet. Create one to start curating your collection.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lists.map(list => (
            <div key={list.id} className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors group">
              <Link href={`/lists/${list.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">{list.name}</p>
                  {list.is_public && <span className="text-xs text-gray-600 border border-gray-800 px-1.5 py-0.5 rounded">Public</span>}
                </div>
                {list.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{list.description}</p>}
                <p className="text-xs text-gray-600 mt-1">{list.item_count} edition{list.item_count !== 1 ? 's' : ''}</p>
              </Link>
              <button
                onClick={() => deleteList(list.id, list.name)}
                disabled={deleting === list.id}
                className="text-gray-700 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100 shrink-0"
              >
                {deleting === list.id ? '…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

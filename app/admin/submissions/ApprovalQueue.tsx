'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Submission {
  id: string
  created_at: string
  book_title: string
  book_author: string
  edition_name: string
  edition_type: string
  source_name: string
  cover_image_url?: string
  release_month?: string
  original_retail_price?: number
  isbn?: string
  notes?: string
  submitter_email?: string
  status: string
}

export default function ApprovalQueue({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectionNote, setRejectionNote] = useState<Record<string, string>>({})

  async function handleDecision(id: string, action: 'approve' | 'reject') {
    setLoading(id)
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejection_reason: rejectionNote[id] ?? null }),
    })
    if (res.ok) {
      setSubmissions(prev => prev.filter(s => s.id !== id))
    } else {
      alert('Action failed — check console')
    }
    setLoading(null)
  }

  if (submissions.length === 0) {
    return (
      <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center text-gray-600 text-sm">
        No pending submissions.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {submissions.map(sub => (
        <div key={sub.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 p-5">
            {/* Cover preview */}
            <div className="w-16 h-24 shrink-0 bg-gray-800 rounded-lg overflow-hidden relative">
              {sub.cover_image_url ? (
                <Image src={sub.cover_image_url} alt={sub.edition_name} fill className="object-cover" sizes="64px" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs text-center p-1">No cover</div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <p className="font-semibold text-white">{sub.edition_name}</p>
                  <p className="text-sm text-gray-400">{sub.book_title} <span className="text-gray-600">by</span> {sub.book_author}</p>
                </div>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full shrink-0 capitalize">
                  {sub.edition_type.replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-2">
                <span>Source: <span className="text-gray-300">{sub.source_name}</span></span>
                {sub.release_month && <span>Release: <span className="text-gray-300">{sub.release_month}</span></span>}
                {sub.original_retail_price && <span>Price: <span className="text-gray-300">£{sub.original_retail_price}</span></span>}
                {sub.isbn && <span>ISBN: <span className="text-gray-300 font-mono">{sub.isbn}</span></span>}
              </div>

              {sub.notes && (
                <p className="text-xs text-gray-500 mt-2 italic">{sub.notes}</p>
              )}

              {sub.cover_image_url && (
                <p className="text-xs text-gray-600 mt-1 truncate">Cover: <a href={sub.cover_image_url} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-400">{sub.cover_image_url}</a></p>
              )}

              <p className="text-xs text-gray-600 mt-2">
                Submitted {new Date(sub.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {sub.submitter_email && <> by {sub.submitter_email}</>}
              </p>
            </div>
          </div>

          {/* Action row */}
          <div className="border-t border-gray-800 px-5 py-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="Rejection reason (optional)"
              value={rejectionNote[sub.id] ?? ''}
              onChange={e => setRejectionNote(prev => ({ ...prev, [sub.id]: e.target.value }))}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            <button
              onClick={() => handleDecision(sub.id, 'reject')}
              disabled={loading === sub.id}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-900/40 text-red-400 hover:bg-red-900/60 disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => handleDecision(sub.id, 'approve')}
              disabled={loading === sub.id}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-green-900/40 text-green-400 hover:bg-green-900/60 disabled:opacity-50 transition-colors"
            >
              {loading === sub.id ? 'Processing…' : 'Approve'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

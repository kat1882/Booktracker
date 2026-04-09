'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Review {
  id: string
  body: string | null
  overall_rating: number | null
  physical_quality: number | null
  extras_quality: number | null
  value_for_money: number | null
  created_at: string
  username: string
}

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type={onChange ? 'button' : 'submit'}
          onClick={onChange ? () => onChange(n) : undefined}
          onMouseEnter={onChange ? () => setHover(n) : undefined}
          onMouseLeave={onChange ? () => setHover(0) : undefined}
          className={`text-lg leading-none transition-colors ${
            n <= (hover || value)
              ? 'text-amber-400'
              : 'text-gray-700'
          } ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          disabled={!onChange}
        >
          ★
        </button>
      ))}
    </div>
  )
}

const RATING_FIELDS = [
  { key: 'overall_rating', label: 'Overall' },
  { key: 'physical_quality', label: 'Physical Quality' },
  { key: 'extras_quality', label: 'Extras & Inserts' },
  { key: 'value_for_money', label: 'Value for Money' },
] as const

export default function EditionReviews({
  editionId,
  isLoggedIn,
  initialReviews,
}: {
  editionId: string
  isLoggedIn: boolean
  initialReviews: Review[]
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [showForm, setShowForm] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoggedIn) { router.push('/auth/login'); return }
    if (!ratings.overall_rating) return
    setSaving(true)

    const res = await fetch('/api/edition-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        edition_id: editionId,
        body: body.trim() || null,
        overall_rating: ratings.overall_rating ?? null,
        physical_quality: ratings.physical_quality ?? null,
        extras_quality: ratings.extras_quality ?? null,
        value_for_money: ratings.value_for_money ?? null,
      }),
    })

    if (res.ok) {
      setSaved(true)
      setShowForm(false)
      // Re-fetch reviews
      const data = await fetch(`/api/edition-review?edition_id=${editionId}`).then(r => r.json())
      setReviews(data.reviews ?? [])
    }
    setSaving(false)
  }

  const avgOverall = reviews.length
    ? (reviews.reduce((s, r) => s + (r.overall_rating ?? 0), 0) / reviews.filter(r => r.overall_rating).length).toFixed(1)
    : null

  return (
    <div className="mt-10 border-t border-gray-800 pt-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">
            Reviews
            {avgOverall && (
              <span className="ml-2 text-amber-400 text-base font-normal">★ {avgOverall}</span>
            )}
            {reviews.length > 0 && (
              <span className="ml-2 text-gray-500 text-sm font-normal">({reviews.length})</span>
            )}
          </h2>
          <p className="text-sm text-gray-500">Rate the edition itself — paper quality, extras, and more</p>
        </div>
        {!showForm && (
          <button
            onClick={() => isLoggedIn ? setShowForm(true) : router.push('/auth/login')}
            className="text-sm bg-gray-800 border border-gray-700 hover:border-violet-500 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
          >
            {saved ? '✓ Edit Review' : '+ Write a Review'}
          </button>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Your Review</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {RATING_FIELDS.map(f => (
              <div key={f.key}>
                <p className="text-xs text-gray-500 mb-1">{f.label}{f.key === 'overall_rating' ? ' *' : ''}</p>
                <Stars
                  value={ratings[f.key] ?? 0}
                  onChange={n => setRatings(prev => ({ ...prev, [f.key]: n }))}
                />
              </div>
            ))}
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share your thoughts about this edition…"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !ratings.overall_rating}
              className="text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-white px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-white">{review.username}</span>
                  <span className="text-xs text-gray-600 ml-2">{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
                {review.overall_rating && (
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`text-sm ${n <= review.overall_rating! ? 'text-amber-400' : 'text-gray-700'}`}>★</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-ratings */}
              {(review.physical_quality || review.extras_quality || review.value_for_money) && (
                <div className="flex flex-wrap gap-3 mb-2">
                  {review.physical_quality && (
                    <div className="text-xs text-gray-500">
                      Physical <span className="text-amber-400">{'★'.repeat(review.physical_quality)}{'☆'.repeat(5 - review.physical_quality)}</span>
                    </div>
                  )}
                  {review.extras_quality && (
                    <div className="text-xs text-gray-500">
                      Extras <span className="text-amber-400">{'★'.repeat(review.extras_quality)}{'☆'.repeat(5 - review.extras_quality)}</span>
                    </div>
                  )}
                  {review.value_for_money && (
                    <div className="text-xs text-gray-500">
                      Value <span className="text-amber-400">{'★'.repeat(review.value_for_money)}{'☆'.repeat(5 - review.value_for_money)}</span>
                    </div>
                  )}
                </div>
              )}

              {review.body && (
                <p className="text-sm text-gray-300 leading-relaxed">{review.body}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
          No reviews yet. Be the first to review this edition.
        </div>
      )}
    </div>
  )
}

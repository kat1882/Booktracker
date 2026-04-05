'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubmitForm({ userEmail }: { userEmail?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const data = {
      book_title: (form.elements.namedItem('book_title') as HTMLInputElement).value.trim(),
      book_author: (form.elements.namedItem('book_author') as HTMLInputElement).value.trim(),
      edition_name: (form.elements.namedItem('edition_name') as HTMLInputElement).value.trim(),
      edition_type: (form.elements.namedItem('edition_type') as HTMLSelectElement).value,
      source_name: (form.elements.namedItem('source_name') as HTMLInputElement).value.trim(),
      cover_image_url: (form.elements.namedItem('cover_image_url') as HTMLInputElement).value.trim() || null,
      release_month: (form.elements.namedItem('release_month') as HTMLInputElement).value.trim() || null,
      original_retail_price: (form.elements.namedItem('original_retail_price') as HTMLInputElement).value
        ? parseFloat((form.elements.namedItem('original_retail_price') as HTMLInputElement).value)
        : null,
      isbn: (form.elements.namedItem('isbn') as HTMLInputElement).value.trim() || null,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value.trim() || null,
      submitter_email: (form.elements.namedItem('submitter_email') as HTMLInputElement).value.trim() || null,
    }

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 text-center">
        <p className="text-green-400 text-lg font-semibold mb-2">Submission received!</p>
        <p className="text-gray-400 text-sm">Thanks for contributing. We review submissions within a few days and will add approved editions to the database.</p>
        <button
          onClick={() => { setSuccess(false) }}
          className="mt-6 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          Submit another edition
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Book info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Book Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Book Title <span className="text-red-400">*</span></label>
            <input
              name="book_title"
              required
              placeholder="e.g. A Court of Thorns and Roses"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Author <span className="text-red-400">*</span></label>
            <input
              name="book_author"
              required
              placeholder="e.g. Sarah J. Maas"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* Edition info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Edition Details</h2>

        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Edition Name <span className="text-red-400">*</span></label>
          <input
            name="edition_name"
            required
            placeholder="e.g. Illumicrate March 2024 Exclusive Edition"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Edition Type <span className="text-red-400">*</span></label>
            <select
              name="edition_type"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">Select type…</option>
              <option value="subscription_box">Subscription Box</option>
              <option value="signed">Signed Edition</option>
              <option value="illustrated">Illustrated Edition</option>
              <option value="collectors">Collector&apos;s Edition</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Source / Retailer <span className="text-red-400">*</span></label>
            <input
              name="source_name"
              required
              placeholder="e.g. Illumicrate, FairyLoot, Waterstones"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Release Month</label>
            <input
              name="release_month"
              placeholder="e.g. March 2024"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Original Retail Price (£)</label>
            <input
              name="original_retail_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 35.99"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Cover Image URL</label>
            <input
              name="cover_image_url"
              type="url"
              placeholder="https://…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
            <p className="text-xs text-gray-600 mt-1">Paste a direct link to the cover image (Shopify, Bookshop, etc.)</p>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">ISBN (if known)</label>
            <input
              name="isbn"
              placeholder="e.g. 9781526654601"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Any extra details — sprayed edges, cover artist, goodies, special foiling, etc."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>
      </div>

      {/* Contact */}
      {!userEmail && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Your Email (optional)</h2>
          <input
            name="submitter_email"
            type="email"
            placeholder="So we can credit you when approved"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
        </div>
      )}
      {userEmail && <input type="hidden" name="submitter_email" value={userEmail} />}

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
      >
        {loading ? 'Submitting…' : 'Submit Edition'}
      </button>
    </form>
  )
}

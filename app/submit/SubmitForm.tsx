'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SubmitForm({ userEmail }: { userEmail?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null
    const ext = imageFile.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('submission-covers')
      .upload(filename, imageFile, { contentType: imageFile.type })
    if (error) {
      console.error('Upload error:', error)
      return null
    }
    const { data } = supabase.storage.from('submission-covers').getPublicUrl(filename)
    return data.publicUrl
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget

    // Upload image if file was selected
    let coverImageUrl: string | null = null
    if (uploadMode === 'upload' && imageFile) {
      coverImageUrl = await uploadImage()
      if (!coverImageUrl) {
        setError('Image upload failed. Please try again or use a URL instead.')
        setLoading(false)
        return
      }
    } else if (uploadMode === 'url') {
      coverImageUrl = (form.elements.namedItem('cover_image_url') as HTMLInputElement).value.trim() || null
    }

    const data = {
      book_title: (form.elements.namedItem('book_title') as HTMLInputElement).value.trim(),
      book_author: (form.elements.namedItem('book_author') as HTMLInputElement).value.trim(),
      edition_name: (form.elements.namedItem('edition_name') as HTMLInputElement).value.trim(),
      edition_type: (form.elements.namedItem('edition_type') as HTMLSelectElement).value,
      source_name: (form.elements.namedItem('source_name') as HTMLInputElement).value.trim(),
      cover_image_url: coverImageUrl,
      release_month: (form.elements.namedItem('release_month') as HTMLInputElement).value.trim() || null,
      original_retail_price: (form.elements.namedItem('original_retail_price') as HTMLInputElement).value
        ? parseFloat((form.elements.namedItem('original_retail_price') as HTMLInputElement).value)
        : null,
      isbn: (form.elements.namedItem('isbn') as HTMLInputElement).value.trim() || null,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value.trim() || null,
      submitter_email: (form.elements.namedItem('submitter_email') as HTMLInputElement)?.value.trim() || null,
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
          onClick={() => { setSuccess(false); setImagePreview(null); setImageFile(null) }}
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

        {/* Cover image — upload or URL */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Cover Image</label>

          {/* Toggle */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit mb-3">
            <button
              type="button"
              onClick={() => setUploadMode('upload')}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${uploadMode === 'upload' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Upload photo
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${uploadMode === 'url' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Paste URL
            </button>
          </div>

          {uploadMode === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="cursor-pointer border-2 border-dashed border-gray-700 hover:border-violet-600 rounded-xl transition-colors"
            >
              {imagePreview ? (
                <div className="relative flex items-center gap-4 p-4">
                  <div className="w-16 h-24 relative rounded-lg overflow-hidden shrink-0">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="64px" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{imageFile?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{imageFile ? (imageFile.size / 1024).toFixed(0) + ' KB' : ''}</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setImagePreview(null); setImageFile(null) }}
                      className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-2xl mb-2">📷</p>
                  <p className="text-sm text-gray-400">Tap to choose a photo, or drag and drop</p>
                  <p className="text-xs text-gray-600 mt-1">JPG, PNG or WebP · max 5 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div>
              <input
                name="cover_image_url"
                type="url"
                placeholder="https://…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
              <p className="text-xs text-gray-600 mt-1">Paste a direct link to the cover image</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1.5">ISBN (if known)</label>
          <input
            name="isbn"
            placeholder="e.g. 9781526654601"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
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

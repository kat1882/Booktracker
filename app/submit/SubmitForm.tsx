'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CONDITIONS = ['Near Mint', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor'] as const
type Condition = typeof CONDITIONS[number]

const CONDITION_STYLE: Record<Condition, string> = {
  'Near Mint': 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  'Fine':      'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  'Very Good': 'border-blue-500 text-blue-400 bg-blue-500/10',
  'Good':      'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  'Fair':      'border-orange-500 text-orange-400 bg-orange-500/10',
  'Poor':      'border-red-500 text-red-400 bg-red-500/5',
}

export default function SubmitForm({ userEmail }: { userEmail?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload')
  const [condition, setCondition] = useState<Condition | null>(null)
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
    if (error) return null
    const { data } = supabase.storage.from('submission-covers').getPublicUrl(filename)
    return data.publicUrl
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget

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
      <div className="text-center py-24 border border-dashed border-slate-800 rounded-2xl space-y-4">
        <span className="material-symbols-outlined text-5xl text-emerald-400 block" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <h3 className="text-2xl font-bold text-white">Submission Received</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
          Thanks for contributing to the archive. We review submissions within a few days and will add approved editions to the database.
        </p>
        <button
          onClick={() => { setSuccess(false); setImagePreview(null); setImageFile(null); setCondition(null) }}
          className="mt-4 text-sm text-violet-400 hover:text-violet-300 transition-colors font-semibold"
        >
          Submit another edition →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Cover image upload */}
        <section className="md:col-span-4 flex flex-col gap-4">
          <label className="text-xs font-bold uppercase tracking-widest text-violet-400">Visual Identity</label>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
            {(['upload', 'url'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setUploadMode(mode)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${uploadMode === mode ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {mode === 'upload' ? 'Upload photo' : 'Paste URL'}
              </button>
            ))}
          </div>

          {uploadMode === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="aspect-[2/3] w-full bg-slate-900 rounded-xl group relative cursor-pointer border-2 border-dashed border-slate-700 hover:border-violet-500 transition-all overflow-hidden"
            >
              {imagePreview ? (
                <>
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="280px" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-white text-2xl">upload_file</span>
                    <p className="text-white text-xs font-semibold">Replace image</p>
                    <button
                      type="button"
                      onClick={ev => { ev.stopPropagation(); setImagePreview(null); setImageFile(null) }}
                      className="text-red-400 text-xs hover:text-red-300 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-500 group-hover:text-violet-400 transition-colors">
                  <span className="material-symbols-outlined text-4xl">upload_file</span>
                  <div className="space-y-1">
                    <p className="font-bold text-sm">Drag cover photo</p>
                    <p className="text-xs opacity-60">High-res 2:3 format recommended</p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="aspect-[2/3] w-full bg-slate-900 rounded-xl border border-slate-700 flex flex-col justify-center p-6 gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-violet-400">Cover URL</label>
              <input
                name="cover_image_url"
                type="url"
                placeholder="https://…"
                className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none"
              />
              <p className="text-xs text-slate-600">Paste a direct link to the cover image</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>High quality cover art helps with authentication.</span>
          </div>
        </section>

        {/* Metadata & fields */}
        <section className="md:col-span-8 flex flex-col gap-8">

          {/* Core metadata */}
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-6">Core Metadata</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-300">Book Title <span className="text-red-400">*</span></label>
                <input name="book_title" required placeholder="e.g. A Court of Thorns and Roses"
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Author <span className="text-red-400">*</span></label>
                <input name="book_author" required placeholder="Full name"
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Source / Retailer <span className="text-red-400">*</span></label>
                <input name="source_name" required placeholder="e.g. Illumicrate, FairyLoot"
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Edition Name <span className="text-red-400">*</span></label>
                <input name="edition_name" required placeholder="e.g. Illumicrate March 2024 Exclusive"
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Edition Type <span className="text-red-400">*</span></label>
                <select name="edition_type" required
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all">
                  <option value="">Select type…</option>
                  <option value="subscription_box">Subscription Box</option>
                  <option value="signed">Signed Edition</option>
                  <option value="illustrated">Illustrated Edition</option>
                  <option value="collectors">Collector&apos;s Edition</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Release Month</label>
                <input name="release_month" placeholder="e.g. March 2024"
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">ISBN</label>
                <input name="isbn" placeholder="e.g. 9781526654601" className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 font-mono focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-6">Physical Condition</h3>
            <div className="flex flex-wrap gap-3">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(condition === c ? null : c)}
                  className={`px-5 py-2 rounded-full border font-bold text-xs transition-all ${
                    condition === c ? CONDITION_STYLE[c] : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Provenance */}
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-6">Provenance &amp; Notes</h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Edition Notes</label>
                <textarea name="notes" rows={4} placeholder="Sprayed edges, cover artist, special goodies, foiling details, print run size, etc."
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none resize-none leading-relaxed transition-all" />
              </div>
              {!userEmail && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Your Email (optional)</label>
                  <input name="submitter_email" type="email" placeholder="So we can credit you when approved"
                    className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
                </div>
              )}
            </div>
          </div>

          {/* Financial appraisal */}
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-6">Financial Appraisal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Original Retail Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-slate-500 text-sm">$</span>
                  <input name="original_retail_price" type="number" step="0.01" min="0" placeholder="0.00"
                    className="w-full bg-slate-800 border-none rounded-lg pl-8 pr-4 py-3 text-sm text-white placeholder-slate-600 font-mono focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-xl px-5 py-4">{error}</p>
          )}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Community Review</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Admin-curated archive</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-10 py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_8px_30px_rgba(124,58,237,0.4)] active:scale-95 transition-all"
            >
              {loading ? 'Submitting…' : 'Submit to Archive'}
            </button>
          </div>

        </section>
      </div>
    </form>
  )
}

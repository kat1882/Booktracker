'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SuggestCoverButton({
  editionId,
  editionName,
  bookTitle,
  bookAuthor,
  sourceName,
  editionType,
  isLoggedIn,
}: {
  editionId: string
  editionName: string
  bookTitle: string
  bookAuthor: string
  sourceName: string
  editionType: string
  isLoggedIn: boolean
}) {
  const [open, setOpen]       = useState(false)
  const [url, setUrl]         = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')
  const fileRef               = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setUrl('')
  }

  function handleUrl(v: string) {
    setUrl(v)
    setPreview(v || null)
    setFile(null)
  }

  async function submit() {
    if (!url && !file) { setError('Add an image URL or upload a file.'); return }
    setSaving(true)
    setError('')

    let coverUrl = url

    if (file) {
      const ext = file.name.split('.').pop()
      const filename = `suggest-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('submission-covers')
        .upload(filename, file, { contentType: file.type })
      if (uploadErr) { setError('Upload failed. Try a URL instead.'); setSaving(false); return }
      const { data } = supabase.storage.from('submission-covers').getPublicUrl(filename)
      coverUrl = data.publicUrl
    }

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        edition_id:        editionId,
        book_title:        bookTitle,
        book_author:       bookAuthor,
        edition_name:      editionName,
        edition_type:      editionType || 'other',
        source_name:       sourceName || 'Unknown',
        cover_image_url:   coverUrl,
        notes:             'Cover suggestion for existing edition',
      }),
    })

    setSaving(false)
    if (res.ok) { setDone(true); setOpen(false) }
    else { const d = await res.json(); setError(d.error ?? 'Something went wrong') }
  }

  if (done) {
    return (
      <p className="text-emerald-400 text-xs flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">check_circle</span>
        Cover suggestion submitted — thanks!
      </p>
    )
  }

  return (
    <div>
      <button
        onClick={() => { if (!isLoggedIn) { window.location.href = '/auth/login'; return } setOpen(o => !o) }}
        className="text-xs text-slate-500 hover:text-violet-400 transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
        {open ? 'Cancel' : 'Suggest a better cover'}
      </button>

      {open && (
        <div className="mt-3 bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium">Suggest a cover image for this edition</p>

          {/* Preview */}
          {preview && (
            <div className="w-24 h-36 relative rounded-lg overflow-hidden ring-1 ring-white/10">
              <Image src={preview} alt="preview" fill className="object-cover" unoptimized />
            </div>
          )}

          {/* URL input */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Paste image URL</label>
            <input
              value={url}
              onChange={e => handleUrl(e.target.value)}
              placeholder="https://…"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <p className="text-[10px] text-slate-600 text-center">— or —</p>

          {/* File upload */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-slate-600 hover:border-violet-500 rounded-lg py-2.5 text-xs text-slate-500 hover:text-violet-400 transition-colors"
          >
            {file ? `✓ ${file.name}` : 'Upload an image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={submit}
            disabled={saving || (!url && !file)}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            {saving ? 'Submitting…' : 'Submit for review'}
          </button>
          <p className="text-[10px] text-slate-600 text-center">Reviewed by admin before going live</p>
        </div>
      )}
    </div>
  )
}

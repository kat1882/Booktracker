'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const IMAGE_TYPE_LABELS = [
  'Cover', 'Spine', 'Back', 'Sprayed Edges', 'Foiling', 'Stenciled Edges',
  'Interior', 'Dust Jacket', 'Slipcase', 'Extras', 'Detail', 'Other',
]

interface GalleryImage {
  id: string
  image_url: string
  image_type: string | null
  is_primary: boolean
  sort_order: number
  uploaded_by: string | null
}

interface Props {
  editionId: string
  coverImage: string | null
  initialImages: GalleryImage[]
  isLoggedIn: boolean
  currentUserId: string | null
}

export default function EditionGallery({ editionId, coverImage, initialImages, isLoggedIn, currentUserId }: Props) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages)
  const [activeUrl, setActiveUrl] = useState<string | null>(
    initialImages.find(i => i.is_primary)?.image_url ?? initialImages[0]?.image_url ?? coverImage
  )
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [imageType, setImageType] = useState('Cover')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // All displayable images: DB images first, then cover as fallback
  const allImages: { url: string; label: string | null; id?: string; uploadedBy?: string | null }[] = [
    ...images.map(i => ({ url: i.image_url, label: i.image_type, id: i.id, uploadedBy: i.uploaded_by })),
  ]
  if (coverImage && !images.some(i => i.is_primary)) {
    allImages.unshift({ url: coverImage, label: 'Cover' })
  }
  const displayUrl = activeUrl ?? allImages[0]?.url ?? null

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop()
      const path = `${editionId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('edition-images')
        .upload(path, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('edition-images')
        .getPublicUrl(path)

      const nextOrder = images.length > 0 ? Math.max(...images.map(i => i.sort_order)) + 1 : 0

      const { data: inserted, error: insertError } = await supabase
        .from('edition_image')
        .insert({
          edition_id: editionId,
          image_url: publicUrl,
          image_type: imageType,
          is_primary: images.length === 0,
          sort_order: nextOrder,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setImages(prev => [...prev, inserted as GalleryImage])
      setActiveUrl(publicUrl)
      setShowUpload(false)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(imageId: string, imageUrl: string) {
    if (!confirm('Remove this photo?')) return

    // Delete from storage
    const path = imageUrl.split('/edition-images/')[1]
    if (path) await supabase.storage.from('edition-images').remove([path])

    // Delete from DB
    await supabase.from('edition_image').delete().eq('id', imageId)

    const updated = images.filter(i => i.id !== imageId)
    setImages(updated)
    if (activeUrl === imageUrl) {
      setActiveUrl(updated[0]?.image_url ?? coverImage ?? null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden">
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="Edition photo"
            fill
            className="object-cover"
            sizes="224px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">No image</div>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {allImages.map((img, i) => (
            <div key={img.id ?? `cover-${i}`} className="relative group">
              <button
                onClick={() => setActiveUrl(img.url)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                  activeUrl === img.url ? 'border-violet-500' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="relative w-full h-full">
                  <Image src={img.url} alt={img.label ?? 'photo'} fill className="object-cover" sizes="56px" />
                </div>
              </button>
              {img.label && (
                <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-gray-500 truncate">
                  {img.label}
                </span>
              )}
              {/* Delete button for uploader */}
              {img.id && (img.uploadedBy === currentUserId) && (
                <button
                  onClick={() => handleDelete(img.id!, img.url)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[10px] items-center justify-center hidden group-hover:flex"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {/* Add photo button */}
          {isLoggedIn && (
            <button
              onClick={() => setShowUpload(s => !s)}
              className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-700 hover:border-violet-500 flex items-center justify-center text-gray-500 hover:text-violet-400 transition-colors text-xl mt-0"
              title="Add photo"
            >
              +
            </button>
          )}
        </div>
      )}

      {/* Add photo button when no images yet */}
      {isLoggedIn && allImages.length === 0 && (
        <button
          onClick={() => setShowUpload(s => !s)}
          className="w-full py-2 rounded-lg border border-dashed border-gray-700 hover:border-violet-500 text-sm text-gray-500 hover:text-violet-400 transition-colors"
        >
          + Add photo
        </button>
      )}

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-white">Add a photo</p>
          <select
            value={imageType}
            onChange={e => setImageType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            {IMAGE_TYPE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleUpload}
            disabled={uploading}
            className="text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-600 file:text-white hover:file:bg-violet-500 disabled:opacity-50"
          />
          {uploading && <p className="text-xs text-gray-400">Uploading…</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={() => setShowUpload(false)}
            className="text-xs text-gray-500 hover:text-white self-start transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Edition {
  id: string
  edition_name: string
  cover_image?: string
  edition_type: string
  release_month?: string
  original_retail_price?: number
  estimated_value?: number
  source?: { name: string }
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  subscription_box: { label: 'Sub Box',     cls: 'bg-violet-900/60 text-violet-300' },
  exclusive:        { label: 'Exclusive',   cls: 'bg-violet-900/60 text-violet-300' },
  signed:           { label: 'Signed',      cls: 'bg-amber-900/60 text-amber-300' },
  illustrated:      { label: 'Illustrated', cls: 'bg-blue-900/60 text-blue-300' },
  deluxe:           { label: 'Deluxe',      cls: 'bg-emerald-900/60 text-emerald-300' },
  collectors:       { label: "Collector's", cls: 'bg-orange-900/60 text-orange-300' },
  limited:          { label: 'Limited',     cls: 'bg-rose-900/60 text-rose-300' },
}

function EditionCard({
  edition,
  coverFallback,
  isLoggedIn,
  initialWishlisted,
}: {
  edition: Edition
  coverFallback: string | null
  isLoggedIn: boolean
  initialWishlisted: boolean
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [wishing, setWishing]       = useState(false)
  const router = useRouter()
  const cover = edition.cover_image || coverFallback
  const price = edition.estimated_value ?? edition.original_retail_price
  const badge = edition.edition_type ? TYPE_BADGE[edition.edition_type] : null
  const fmt   = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) { router.push('/auth/login'); return }
    setWishing(true)
    const res = await fetch('/api/wishlist', {
      method: wishlisted ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: edition.id }),
    })
    if (res.ok) setWishlisted(v => !v)
    setWishing(false)
  }

  return (
    <Link href={`/edition/${edition.id}`} className="group block">
      {/* Cover art */}
      <div className="relative aspect-[2/3] bg-slate-800 rounded-xl overflow-hidden shadow-xl ring-1 ring-white/5 group-hover:ring-violet-500/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-violet-900/30">
        {cover ? (
          <Image
            src={cover}
            alt={edition.edition_name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="240px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs text-center p-3">
            No cover
          </div>
        )}

        {/* Gradient overlay always visible at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />

        {/* Edition type badge — top left */}
        {badge && (
          <div className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </div>
        )}

        {/* Wishlist button — top right */}
        <button
          onClick={toggleWishlist}
          disabled={wishing}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 text-sm
            ${wishlisted
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/40'
              : 'bg-slate-900/70 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-pink-600/20 hover:text-pink-400'
            }`}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {wishlisted ? '♥' : '♡'}
        </button>

        {/* Source + price at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          {edition.source?.name && (
            <p className="text-violet-300 text-[10px] font-bold uppercase tracking-wider truncate mb-0.5">
              {edition.source.name}
            </p>
          )}
          {price && (
            <p className="text-emerald-400 text-xs font-mono font-bold">{fmt(price)}</p>
          )}
        </div>
      </div>

      {/* Edition name below card */}
      <div className="mt-2.5 px-0.5">
        <p className="text-slate-300 text-xs font-medium leading-tight line-clamp-2 group-hover:text-white transition-colors">
          {edition.edition_name}
        </p>
        {edition.release_month && (
          <p className="text-slate-600 text-[10px] mt-0.5">{edition.release_month}</p>
        )}
      </div>
    </Link>
  )
}

export default function EditionsTabs({
  specialEditions,
  standardEditions,
  coverUrl,
  wishlistedIds,
  isLoggedIn,
}: {
  specialEditions: Edition[]
  standardEditions: Edition[]
  coverUrl: string | null
  wishlistedIds: Set<string>
  isLoggedIn: boolean
}) {
  const [tab, setTab] = useState<'special' | 'standard'>(
    specialEditions.length > 0 ? 'special' : 'standard'
  )
  const [filter, setFilter] = useState<string>('all')

  // Build source filter options from special editions
  const sources = [...new Set(specialEditions.map(e => e.source?.name).filter(Boolean))] as string[]

  const filtered = tab === 'special'
    ? (filter === 'all' ? specialEditions : specialEditions.filter(e => e.source?.name === filter))
    : standardEditions

  return (
    <section>
      {/* Tab switcher */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setTab('special')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === 'special' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Special Editions
            {specialEditions.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === 'special' ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {specialEditions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('standard')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === 'standard' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Published Editions
            {standardEditions.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === 'standard' ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {standardEditions.length}
              </span>
            )}
          </button>
        </div>

        {/* Source filter — only on special tab with multiple sources */}
        {tab === 'special' && sources.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All
            </button>
            {sources.map(src => (
              <button
                key={src}
                onClick={() => setFilter(src)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === src ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {src}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-600">
          <span className="material-symbols-outlined text-3xl block mb-3 text-slate-700">auto_stories</span>
          <p className="text-sm">{tab === 'special' ? 'No special editions found for this book.' : 'No published editions in the database yet.'}</p>
          <Link href="/submit" className="text-violet-400 hover:text-violet-300 text-sm mt-3 inline-block">
            Submit an edition →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {filtered.map(edition => (
              <EditionCard
                key={edition.id}
                edition={edition}
                coverFallback={coverUrl}
                isLoggedIn={isLoggedIn}
                initialWishlisted={wishlistedIds.has(edition.id)}
              />
            ))}
          </div>
          <div className="mt-5 text-center">
            <Link
              href={`/submit?book_title=${encodeURIComponent(filtered[0]?.edition_name ?? '')}&author=`}
              className="text-xs text-slate-700 hover:text-violet-400 transition-colors"
            >
              Don't see your edition? Submit it →
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface ShelfEntry {
  id: string
  reading_status: string
  rating: number | null
  date_read: string | null
  date_started: string | null
  condition: string | null
  purchase_price: number | null
  for_sale: boolean
  asking_price: number | null
  book: { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string; google_books_id?: string } | null
  edition: { id: string; cover_image?: string; edition_name?: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
}

const STATUS_OPTIONS = [
  { value: 'reading', label: 'Currently Reading' },
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'read', label: 'Read' },
  { value: 'dnf', label: 'Did Not Finish' },
]

const CONDITIONS = ['Near Mint', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor']

const CONDITION_COLORS: Record<string, string> = {
  'Near Mint': 'text-emerald-400',
  'Fine': 'text-green-400',
  'Very Good': 'text-blue-400',
  'Good': 'text-yellow-400',
  'Fair': 'text-orange-400',
  'Poor': 'text-red-400',
}

function StarRating({ rating, entryId, onUpdate }: { rating: number | null; entryId: string; onUpdate: (id: string, updates: Record<string, unknown>) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onUpdate(entryId, { rating: rating === star ? null : star })}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-sm leading-none"
        >
          <span className={(hovered || (rating ?? 0)) >= star ? 'text-yellow-400' : 'text-gray-700'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function ShelfCard({ entry, onUpdate, onRemove }: {
  entry: ShelfEntry
  onUpdate: (id: string, updates: Record<string, unknown>) => void
  onRemove: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [askingInput, setAskingInput] = useState('')
  const [showPriceEdit, setShowPriceEdit] = useState(false)
  const [showForSaleEdit, setShowForSaleEdit] = useState(false)

  const book = entry.book
  const edition = entry.edition

  const coverUrl = edition?.cover_image
    ?? (book?.cover_ol_id ? `https://covers.openlibrary.org/b/id/${book.cover_ol_id}-M.jpg` : null)

  const bookHref = book
    ? (book.google_books_id ? `/book/gb_${book.google_books_id}` : book.open_library_id ? `/book/${book.open_library_id}` : '#')
    : '#'

  const formatDate = (d: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function closeMenu() {
    setMenuOpen(false)
    setShowPriceEdit(false)
    setShowForSaleEdit(false)
  }

  return (
    <div className="group flex gap-3 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3 transition-colors relative">
      {/* Cover */}
      <Link href={bookHref} className="shrink-0">
        <div className="w-12 h-[72px] relative bg-gray-800 rounded-lg overflow-hidden">
          {coverUrl ? (
            <Image src={coverUrl} alt={book?.title ?? ''} fill className="object-cover" sizes="48px" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs text-center p-1">{book?.title?.slice(0,20)}</div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={bookHref} className="text-sm font-medium text-white hover:text-violet-300 transition-colors line-clamp-1">
          {book?.title ?? 'Unknown'}
        </Link>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{book?.author}</p>

        {edition?.source?.name && (
          <p className="text-xs text-violet-400 mt-0.5">{edition.source.name} edition</p>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {(edition?.estimated_value || edition?.original_retail_price) && (
            <span className="text-xs text-emerald-400">
              ${Number(edition.estimated_value ?? edition.original_retail_price).toFixed(0)}
              {edition.estimated_value && <span className="text-gray-600 ml-1">est.</span>}
            </span>
          )}
          {entry.purchase_price && (
            <span className="text-xs text-gray-500">paid ${Number(entry.purchase_price).toFixed(0)}</span>
          )}
          {entry.condition && (
            <span className={`text-xs font-medium ${CONDITION_COLORS[entry.condition] ?? 'text-gray-400'}`}>{entry.condition}</span>
          )}
          {entry.for_sale && (
            <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded font-medium">
              For Sale{entry.asking_price ? ` · $${Number(entry.asking_price).toFixed(0)}` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <StarRating rating={entry.rating} entryId={entry.id} onUpdate={onUpdate} />
          {entry.date_read && (
            <span className="text-xs text-gray-600">Read {formatDate(entry.date_read)}</span>
          )}
          {entry.reading_status === 'reading' && entry.date_started && (
            <span className="text-xs text-gray-600">Started {formatDate(entry.date_started)}</span>
          )}
        </div>
      </div>

      {/* Actions menu */}
      <div className="relative">
        <button
          onClick={() => { setMenuOpen(v => !v); setShowPriceEdit(false); setShowForSaleEdit(false) }}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-white transition-all p-1 rounded"
        >
          ···
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl min-w-[180px] overflow-hidden">
            {/* Move to shelf */}
            <p className="text-xs text-gray-500 px-3 pt-2.5 pb-1 font-medium">Move to</p>
            {STATUS_OPTIONS.filter(s => s.value !== entry.reading_status).map(opt => (
              <button
                key={opt.value}
                onClick={() => { onUpdate(entry.id, { reading_status: opt.value }); closeMenu() }}
                className="w-full text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 transition-colors"
              >
                {opt.label}
              </button>
            ))}

            {/* Condition */}
            <div className="border-t border-gray-700 mt-1">
              <p className="text-xs text-gray-500 px-3 pt-2.5 pb-1 font-medium">Condition</p>
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {CONDITIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => onUpdate(entry.id, { condition: entry.condition === c ? null : c })}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      entry.condition === c
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchase price */}
            <div className="border-t border-gray-700">
              {!showPriceEdit ? (
                <button
                  onClick={() => { setPriceInput(entry.purchase_price ? String(entry.purchase_price) : ''); setShowPriceEdit(true) }}
                  className="w-full text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 transition-colors"
                >
                  {entry.purchase_price ? `Paid: $${Number(entry.purchase_price).toFixed(2)}` : 'Set purchase price'}
                </button>
              ) : (
                <div className="px-3 py-2 flex gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-0 min-w-0"
                    autoFocus
                  />
                  <button
                    onClick={() => { onUpdate(entry.id, { purchase_price: priceInput ? parseFloat(priceInput) : null }); setShowPriceEdit(false) }}
                    className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* For sale */}
            <div className="border-t border-gray-700">
              {!entry.for_sale ? (
                !showForSaleEdit ? (
                  <button
                    onClick={() => { setAskingInput(''); setShowForSaleEdit(true) }}
                    className="w-full text-left text-sm text-amber-400 hover:bg-gray-700 px-3 py-2 transition-colors"
                  >
                    Mark for sale
                  </button>
                ) : (
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">Asking price</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={askingInput}
                        onChange={e => setAskingInput(e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-0 min-w-0"
                        autoFocus
                      />
                      <button
                        onClick={() => { onUpdate(entry.id, { for_sale: true, asking_price: askingInput ? parseFloat(askingInput) : null }); closeMenu() }}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded"
                      >
                        List
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <button
                  onClick={() => { onUpdate(entry.id, { for_sale: false, asking_price: null }); closeMenu() }}
                  className="w-full text-left text-sm text-gray-400 hover:bg-gray-700 hover:text-white px-3 py-2 transition-colors"
                >
                  Remove from sale
                </button>
              )}
            </div>

            {/* Remove */}
            <div className="border-t border-gray-700 mt-1">
              <button
                onClick={() => { onRemove(entry.id); closeMenu() }}
                className="w-full text-left text-sm text-red-400 hover:bg-red-900/30 px-3 py-2 transition-colors"
              >
                Remove from shelf
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

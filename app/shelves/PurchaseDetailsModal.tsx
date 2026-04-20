'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ShelfEntry {
  id: string
  condition: string | null
  purchase_price: number | null
  purchase_location: string | null
  purchase_date: string | null
  notes: string | null
  for_sale: boolean
  asking_price: number | null
  book: { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string; google_books_id?: string } | null
  edition: { id: string; cover_image?: string; edition_name?: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
}

const CONDITIONS = ['Near Mint', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor']

const CONDITION_COLORS: Record<string, string> = {
  'Near Mint': 'text-emerald-400 border-emerald-600 bg-emerald-900/30',
  'Fine': 'text-green-400 border-green-600 bg-green-900/30',
  'Very Good': 'text-blue-400 border-blue-600 bg-blue-900/30',
  'Good': 'text-yellow-400 border-yellow-600 bg-yellow-900/30',
  'Fair': 'text-orange-400 border-orange-600 bg-orange-900/30',
  'Poor': 'text-red-400 border-red-600 bg-red-900/30',
}

export default function PurchaseDetailsModal({
  entry,
  onClose,
  onUpdate,
}: {
  entry: ShelfEntry
  onClose: () => void
  onUpdate: (id: string, updates: Record<string, unknown>) => void
}) {
  const [condition, setCondition] = useState(entry.condition ?? '')
  const [purchasePrice, setPurchasePrice] = useState(entry.purchase_price ? String(entry.purchase_price) : '')
  const [purchaseLocation, setPurchaseLocation] = useState(entry.purchase_location ?? '')
  const [purchaseDate, setPurchaseDate] = useState(entry.purchase_date ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [forSale, setForSale] = useState(entry.for_sale)
  const [askingPrice, setAskingPrice] = useState(entry.asking_price ? String(entry.asking_price) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const book = entry.book
  const edition = entry.edition
  const coverUrl = edition?.cover_image
    ?? (book?.cover_ol_id ? `https://covers.openlibrary.org/b/id/${book.cover_ol_id}-M.jpg` : null)

  async function handleSave() {
    setSaving(true)
    const updates: Record<string, unknown> = {
      condition: condition || null,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      purchase_location: purchaseLocation || null,
      purchase_date: purchaseDate || null,
      notes: notes || null,
      for_sale: forSale,
      asking_price: forSale && askingPrice ? parseFloat(askingPrice) : null,
    }
    await onUpdate(entry.id, updates)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 600)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="w-12 h-[72px] relative bg-gray-800 rounded-lg overflow-hidden shrink-0">
            {coverUrl ? (
              <Image src={coverUrl} alt={book?.title ?? ''} fill className="object-cover" sizes="48px" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs text-center p-1">{book?.title?.slice(0, 15)}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm line-clamp-1">{book?.title ?? 'Unknown'}</p>
            <p className="text-xs text-gray-400">{book?.author}</p>
            {edition?.source?.name && <p className="text-xs text-violet-400 mt-0.5">{edition.source.name} edition</p>}
            {edition?.edition_name && !edition?.source?.name && <p className="text-xs text-gray-500 mt-0.5">{edition.edition_name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Market value reference */}
          {(edition?.estimated_value || edition?.original_retail_price) && (
            <div className="bg-gray-800 rounded-xl p-3 flex justify-between text-sm">
              <span className="text-gray-400">Retail Price</span>
              <span className="text-gray-300">{edition.original_retail_price ? `$${Number(edition.original_retail_price).toFixed(2)}` : '—'}</span>
              <span className="text-gray-400">Est. Value</span>
              <span className="text-emerald-400 font-medium">{edition.estimated_value ? `$${Number(edition.estimated_value).toFixed(2)}` : '—'}</span>
            </div>
          )}

          {/* Condition */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">Condition</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setCondition(condition === c ? '' : c)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    condition === c
                      ? (CONDITION_COLORS[c] ?? 'text-white border-violet-500 bg-violet-900/40')
                      : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Price Paid</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Date Purchased</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Where Purchased</label>
            <input
              type="text"
              placeholder="e.g. Illumicrate, eBay, local bookshop…"
              value={purchaseLocation}
              onChange={e => setPurchaseLocation(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Notes</label>
            <textarea
              placeholder="Signed copy, first print, notes on condition…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* For sale */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">List for sale</span>
              <button
                onClick={() => setForSale(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${forSale ? 'bg-amber-500' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${forSale ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {forSale && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Asking price"
                  value={askingPrice}
                  onChange={e => setAskingPrice(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white'
            }`}
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Details'}
          </button>
        </div>
      </div>
    </div>
  )
}

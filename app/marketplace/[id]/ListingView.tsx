'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

const CONDITION_COLOR: Record<string, string> = {
  'Near Mint': 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40',
  'Fine':      'text-emerald-400 bg-emerald-900/20 border-emerald-700/40',
  'Very Good': 'text-blue-400 bg-blue-900/20 border-blue-700/40',
  'Good':      'text-yellow-400 bg-yellow-900/20 border-yellow-700/40',
  'Fair':      'text-orange-400 bg-orange-900/20 border-orange-700/40',
  'Poor':      'text-red-400 bg-red-900/20 border-red-700/40',
}
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const fmtShort = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

type OwnedItem = {
  id: string
  condition: string | null
  book: { title: string; author: string } | null
  edition: { cover_image?: string; edition_name?: string; source?: { name: string } } | null
}

type Listing = {
  id: string
  asking_price: number
  condition: string | null
  notes: string | null
  photos: string[]
  user_id: string
  book: { id: string; title: string; author: string; cover_ol_id?: string } | null
  edition: { id: string; edition_name: string; edition_type: string; cover_image?: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
}

export default function ListingView({
  listing,
  sellerUsername,
  sellerJoinedYear,
  sellerCountry,
  sellerOtherListings,
  currentUserId,
  currentUsername,
  isPro,
}: {
  listing: Listing
  sellerUsername: string
  sellerJoinedYear: number | null
  sellerCountry: string | null
  sellerOtherListings: number
  currentUserId: string | null
  currentUsername: string | null
  isPro: boolean
}) {
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [contactTab, setContactTab] = useState<'message' | 'trade'>('message')

  // Message state
  const [message, setMessage] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [msgError, setMsgError] = useState('')

  // Trade state
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([])
  const [ownedLoading, setOwnedLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [tradeMessage, setTradeMessage] = useState('')
  const [tradeSending, setTradeSending] = useState(false)
  const [tradeSent, setTradeSent] = useState(false)
  const [tradeError, setTradeError] = useState('')

  const isOwnListing = currentUserId === listing.user_id
  const book = listing.book
  const edition = listing.edition
  const coverUrl = edition?.cover_image ?? (book?.cover_ol_id ? `https://covers.openlibrary.org/b/id/${book.cover_ol_id}-L.jpg` : null)
  const allPhotos = listing.photos?.length > 0 ? listing.photos : (coverUrl ? [coverUrl] : [])
  const condStyle = listing.condition ? (CONDITION_COLOR[listing.condition] ?? '') : ''

  // Load owned collection when switching to trade tab
  useEffect(() => {
    if (contactTab !== 'trade' || !currentUserId || ownedItems.length > 0) return
    setOwnedLoading(true)
    const supabase = createClient()
    supabase
      .from('user_collection')
      .select(`
        id, condition,
        book:book_id(title, author),
        edition:edition_id(cover_image, edition_name, source:source_id(name))
      `)
      .eq('user_id', currentUserId)
      .eq('owned', true)
      .order('id', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setOwnedItems((data ?? []) as unknown as OwnedItem[])
        setOwnedLoading(false)
      })
  }, [contactTab, currentUserId, ownedItems.length])

  async function handleSendMessage() {
    if (!message.trim()) return
    setSending(true)
    setMsgError('')
    const res = await fetch('/api/marketplace/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listing.id,
        to_user_id: listing.user_id,
        message: message.trim(),
        offer_price: offerPrice ? parseFloat(offerPrice) : null,
      }),
    })
    setSending(false)
    if (!res.ok) { const d = await res.json(); setMsgError(d.error ?? 'Something went wrong') }
    else { setSent(true); setMessage(''); setOfferPrice('') }
  }

  async function handleProposeTrade() {
    if (!selectedItem) return
    setTradeSending(true)
    setTradeError('')
    const res = await fetch('/api/marketplace/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offered_collection_id: selectedItem,
        requested_listing_id: listing.id,
        recipient_id: listing.user_id,
        message: tradeMessage.trim() || null,
      }),
    })
    setTradeSending(false)
    if (!res.ok) { const d = await res.json(); setTradeError(d.error ?? 'Something went wrong') }
    else { setTradeSent(true); setSelectedItem(null); setTradeMessage('') }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e131f] flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col py-6 px-4 hidden md:flex border-r border-slate-800/50">
        <div className="mb-10 px-4">
          <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">The Exchange</p>
        </div>
        <nav className="flex-1 space-y-1">
          {[
            { href: '/shelves',     label: 'The Vault',    icon: 'dashboard',   active: false },
            { href: '/shelves',     label: 'The Library',  icon: 'auto_stories',active: false },
            { href: '/collection',  label: 'Intelligence', icon: 'analytics',   active: false },
            { href: '/marketplace', label: 'The Exchange', icon: 'local_mall',  active: true  },
            { href: '/boxes',       label: 'Box Registry', icon: 'inventory_2', active: false },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all duration-200 ${item.active ? 'bg-violet-600/20 text-violet-100' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-3">
          <Link href="/browse" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>Add to Collection
          </Link>
          {currentUserId && (
            <Link href="/marketplace/inbox" className="px-4 py-2 flex items-center gap-3 text-slate-500 hover:text-slate-200 text-sm transition-colors rounded-lg hover:bg-slate-800">
              <span className="material-symbols-outlined text-lg">mail</span>My Inbox
            </Link>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center gap-3 shrink-0">
          <Link href="/marketplace" className="text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 text-sm">
            <span className="material-symbols-outlined text-sm">arrow_back</span>Exchange
          </Link>
          <span className="material-symbols-outlined text-slate-700 text-sm">chevron_right</span>
          <span className="text-white text-sm font-medium line-clamp-1">{book?.title ?? 'Listing'}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

              {/* Photos */}
              <div className="space-y-3">
                <div className="aspect-[2/3] relative bg-slate-800 rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => allPhotos.length > 0 && setLightbox(true)}>
                  {allPhotos[activePhoto] ? (
                    <Image src={allPhotos[activePhoto]} alt={book?.title ?? ''} fill className="object-cover" sizes="500px" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">No photo</div>
                  )}
                  {listing.photos?.length > 0 && (
                    <div className="absolute bottom-3 right-3 bg-slate-900/80 rounded-full px-2 py-1 text-xs text-slate-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                      {listing.photos.length} photo{listing.photos.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                {allPhotos.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {allPhotos.map((url, i) => (
                      <button key={url} onClick={() => setActivePhoto(i)}
                        className={`aspect-square relative rounded-lg overflow-hidden transition-all ${i === activePhoto ? 'ring-2 ring-violet-500' : 'opacity-60 hover:opacity-100'}`}>
                        <Image src={url} alt="" fill className="object-cover" sizes="80px" unoptimized />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-6">
                <div>
                  {edition?.source?.name && <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-1">{edition.source.name}</p>}
                  <h1 className="text-2xl font-bold tracking-tight text-white">{book?.title ?? 'Unknown'}</h1>
                  <p className="text-slate-400 mt-0.5">{book?.author}</p>
                  {edition?.edition_name && <p className="text-slate-500 text-sm mt-1">{edition.edition_name}</p>}
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Asking Price</p>
                    <p className="text-3xl font-black text-violet-300 font-mono">{fmt(listing.asking_price)}</p>
                  </div>
                  {listing.condition && (
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Condition</p>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${condStyle}`}>{listing.condition}</span>
                    </div>
                  )}
                </div>

                {(edition?.estimated_value || edition?.original_retail_price) && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Retail Price</p>
                      <p className="text-slate-200 font-medium">{edition.original_retail_price ? fmt(Number(edition.original_retail_price)) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Est. Market Value</p>
                      <p className="text-emerald-400 font-medium">{edition.estimated_value ? fmt(Number(edition.estimated_value)) : '—'}</p>
                    </div>
                  </div>
                )}

                {listing.notes && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Seller Notes</p>
                    <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/60 border border-slate-800 rounded-xl p-4">{listing.notes}</p>
                  </div>
                )}

                {/* Seller card */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-white font-black shrink-0">
                    {sellerUsername[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/user/${sellerUsername}`} className="text-white font-semibold text-sm hover:text-violet-300 transition-colors">@{sellerUsername}</Link>
                    <p className="text-slate-500 text-xs">{[sellerCountry, sellerJoinedYear ? `Member since ${sellerJoinedYear}` : null].filter(Boolean).join(' · ')}</p>
                    {sellerOtherListings > 0 && (
                      <Link href={`/user/${sellerUsername}`} className="text-violet-400 hover:text-violet-300 text-xs transition-colors">{sellerOtherListings} other listing{sellerOtherListings !== 1 ? 's' : ''}</Link>
                    )}
                  </div>
                  <Link href={`/user/${sellerUsername}`} className="text-slate-500 hover:text-violet-300 transition-colors" title="View profile">
                    <span className="material-symbols-outlined text-sm">person</span>
                  </Link>
                </div>

                {/* Action panel */}
                {isOwnListing ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                    <p className="text-slate-400 text-sm mb-3">This is your listing.</p>
                    <Link href="/shelves" className="text-violet-400 text-sm hover:text-violet-300">Manage in My Vault →</Link>
                  </div>
                ) : !currentUserId ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                    <p className="text-slate-400 text-sm mb-3">Sign in to contact this seller.</p>
                    <Link href="/auth/login" className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl font-semibold text-sm transition-colors">Sign In</Link>
                  </div>
                ) : !isPro ? (
                  <div className="bg-slate-800/50 border border-violet-700/30 rounded-xl p-5 text-center">
                    <span className="material-symbols-outlined text-violet-400 text-3xl block mb-2">lock</span>
                    <p className="text-white font-semibold mb-1">Pro Feature</p>
                    <p className="text-slate-400 text-sm mb-4">Upgrade to Pro to message sellers, make offers, and propose trades.</p>
                    <Link href="/settings?upgrade=1" className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl font-semibold text-sm transition-colors inline-block">
                      Upgrade to Pro
                    </Link>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex border-b border-slate-800">
                      <button onClick={() => setContactTab('message')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${contactTab === 'message' ? 'text-violet-300 bg-violet-600/10 border-b-2 border-violet-500' : 'text-slate-500 hover:text-slate-300'}`}>
                        <span className="material-symbols-outlined text-sm">mail</span>
                        Message / Offer
                      </button>
                      <button onClick={() => setContactTab('trade')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${contactTab === 'trade' ? 'text-amber-300 bg-amber-600/10 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
                        <span className="material-symbols-outlined text-sm">swap_horiz</span>
                        Propose Trade
                      </button>
                    </div>

                    <div className="p-5">
                      {/* ── MESSAGE TAB ── */}
                      {contactTab === 'message' && (
                        sent ? (
                          <div className="text-center py-4">
                            <span className="material-symbols-outlined text-emerald-400 text-3xl block mb-2">check_circle</span>
                            <p className="text-emerald-300 font-semibold">Message sent!</p>
                            <p className="text-slate-400 text-sm mt-1">@{sellerUsername} will see it in their inbox.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Make an Offer (optional)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                <input type="number" step="0.01" placeholder={listing.asking_price.toFixed(2)}
                                  value={offerPrice} onChange={e => setOfferPrice(e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Message</label>
                              <textarea placeholder={`Hi @${sellerUsername}, I'm interested in this edition…`}
                                value={message} onChange={e => setMessage(e.target.value)} rows={3}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none" />
                            </div>
                            {msgError && <p className="text-red-400 text-xs">{msgError}</p>}
                            <button onClick={handleSendMessage} disabled={sending || !message.trim()}
                              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
                              {sending ? 'Sending…' : 'Send Message'}
                            </button>
                          </div>
                        )
                      )}

                      {/* ── TRADE TAB ── */}
                      {contactTab === 'trade' && (
                        tradeSent ? (
                          <div className="text-center py-4">
                            <span className="material-symbols-outlined text-amber-400 text-3xl block mb-2">swap_horiz</span>
                            <p className="text-amber-300 font-semibold">Trade proposed!</p>
                            <p className="text-slate-400 text-sm mt-1">@{sellerUsername} can accept or decline in their inbox.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                                Choose an edition to offer from your collection
                              </label>
                              {ownedLoading ? (
                                <div className="py-6 text-center text-slate-600 text-sm">Loading your collection…</div>
                              ) : ownedItems.length === 0 ? (
                                <div className="py-6 text-center text-slate-600 text-sm">
                                  No owned editions in your collection yet.
                                  <Link href="/browse" className="text-violet-400 block mt-1 hover:text-violet-300">Add some →</Link>
                                </div>
                              ) : (
                                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                                  {ownedItems.map(item => {
                                    const cover = item.edition?.cover_image ?? null
                                    const isSelected = selectedItem === item.id
                                    return (
                                      <button key={item.id} onClick={() => setSelectedItem(isSelected ? null : item.id)}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${isSelected ? 'border-amber-500/60 bg-amber-900/20' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
                                        <div className="w-8 h-12 relative bg-slate-700 rounded overflow-hidden shrink-0">
                                          {cover ? (
                                            <Image src={cover} alt="" fill className="object-cover" sizes="32px" unoptimized />
                                          ) : (
                                            <div className="absolute inset-0 bg-slate-700" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white text-xs font-semibold line-clamp-1">{item.book?.title ?? 'Unknown'}</p>
                                          <p className="text-slate-400 text-[10px] truncate">{item.book?.author}</p>
                                          {item.edition?.source?.name && (
                                            <p className="text-violet-400 text-[10px] truncate">{item.edition.source.name}</p>
                                          )}
                                        </div>
                                        {item.condition && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 text-slate-400 border-slate-600">
                                            {item.condition}
                                          </span>
                                        )}
                                        {isSelected && (
                                          <span className="material-symbols-outlined text-amber-400 text-sm shrink-0">check_circle</span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {selectedItem && (
                              <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Message (optional)</label>
                                <textarea placeholder={`Hi @${sellerUsername}, I'd like to trade…`}
                                  value={tradeMessage} onChange={e => setTradeMessage(e.target.value)} rows={2}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none" />
                              </div>
                            )}

                            {tradeError && <p className="text-red-400 text-xs">{tradeError}</p>}

                            <button onClick={handleProposeTrade} disabled={tradeSending || !selectedItem}
                              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-sm">swap_horiz</span>
                              {tradeSending ? 'Sending…' : 'Propose Trade'}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Lightbox */}
      {lightbox && allPhotos[activePhoto] && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={() => setLightbox(false)}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-2xl max-h-[85vh] w-full h-full" onClick={e => e.stopPropagation()}>
            <Image src={allPhotos[activePhoto]} alt="" fill className="object-contain" unoptimized />
          </div>
          {allPhotos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {allPhotos.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setActivePhoto(i) }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === activePhoto ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

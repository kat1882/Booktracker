'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  message: string
  offer_price: number | null
  created_at: string
  is_mine: boolean
  sender_username: string
}

type Thread = {
  thread_id: string
  listing: {
    id: string
    asking_price: number
    book: { title: string; author: string } | null
    edition: { cover_image?: string; source?: { name: string } } | null
  } | null
  messages: Message[]
  last_at: string
  has_unread: boolean
  other_username: string
}

type TradeCollection = {
  id: string
  condition: string | null
  book: { title: string; author: string } | null
  edition: { cover_image?: string; edition_name?: string; source?: { name: string } } | null
}

type TradeListing = {
  id: string
  asking_price: number | null
  book: { title: string; author: string } | null
  edition: { cover_image?: string; edition_name?: string; source?: { name: string } } | null
}

type Trade = {
  id: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
  updated_at: string
  proposer_username?: string
  offered_collection: TradeCollection | null
  requested_listing: TradeListing | null
}

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-900/40 text-amber-400 border-amber-700/50',
  accepted:  'bg-emerald-900/40 text-emerald-400 border-emerald-700/50',
  declined:  'bg-red-900/40 text-red-400 border-red-700/50',
  cancelled: 'bg-slate-800 text-slate-500 border-slate-700',
}

function BookCover({ src, title }: { src?: string; title?: string }) {
  return (
    <div className="w-12 h-16 relative bg-slate-800 rounded-lg overflow-hidden shrink-0">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="48px" unoptimized />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-[10px] text-center p-1">
          {title?.slice(0, 12)}
        </div>
      )}
    </div>
  )
}

function ThreadCard({ thread, isReceived }: { thread: Thread; isReceived: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const cover = thread.listing?.edition?.cover_image ?? undefined
  const lastMsg = thread.messages[thread.messages.length - 1]
  const firstMsg = thread.messages[0]

  async function handleReply() {
    if (!reply.trim()) return
    setSending(true)
    setError('')
    const res = await fetch('/api/marketplace/inquiry/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: thread.thread_id, message: reply.trim() }),
    })
    setSending(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Something went wrong')
    } else {
      setReply('')
      setSent(true)
      setTimeout(() => { setSent(false); router.refresh() }, 1500)
    }
  }

  return (
    <div className={`bg-slate-900/60 border rounded-xl overflow-hidden transition-colors ${thread.has_unread ? 'border-violet-700/50' : 'border-slate-800'}`}>
      {/* Thread summary row — click to expand */}
      <button className="w-full text-left p-4 flex gap-4 hover:bg-slate-800/30 transition-colors" onClick={() => setExpanded(e => !e)}>
        <BookCover src={cover} title={thread.listing?.book?.title} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="text-white text-sm font-semibold line-clamp-1">
                {thread.listing?.book?.title ?? 'Unknown listing'}
              </p>
              <p className="text-slate-500 text-xs">
                {isReceived ? `from @${thread.other_username}` : `to @${thread.other_username}`}
                {' · '}{timeAgo(thread.last_at)}
                {' · '}{thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {thread.has_unread && <span className="w-2 h-2 rounded-full bg-violet-500" />}
              {firstMsg?.offer_price != null && (
                <span className="text-xs font-mono text-amber-400 font-bold">{fmt(firstMsg.offer_price)}</span>
              )}
              <span className={`material-symbols-outlined text-slate-600 text-base transition-transform ${expanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-sm line-clamp-1">{lastMsg?.message}</p>
        </div>
      </button>

      {/* Expanded thread */}
      {expanded && (
        <div className="border-t border-slate-800 px-4 pb-4">
          {/* Message history */}
          <div className="space-y-3 pt-4 pb-3">
            {thread.messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.is_mine ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${msg.is_mine ? 'bg-violet-600/20 border border-violet-700/30' : 'bg-slate-800/60 border border-slate-700/40'}`}>
                  {!msg.is_mine && (
                    <p className="text-[10px] text-slate-500 mb-1">@{msg.sender_username}</p>
                  )}
                  {msg.offer_price != null && (
                    <p className="text-xs text-amber-400 font-bold mb-1">Offer: {fmt(msg.offer_price)}</p>
                  )}
                  <p className="text-slate-200 text-sm">{msg.message}</p>
                  <p className="text-[10px] text-slate-600 mt-1 text-right">{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply box */}
          {sent ? (
            <p className="text-center text-emerald-400 text-sm py-2">Reply sent ✓</p>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder={`Reply to @${thread.other_username}…`}
                rows={2}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply() }}
              />
              <button
                onClick={handleReply}
                disabled={sending || !reply.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold px-4 rounded-lg transition-colors self-end pb-1"
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
          )}
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

          {thread.listing?.id && (
            <Link href={`/marketplace/${thread.listing.id}`} className="text-violet-400 text-xs hover:text-violet-300 mt-2 inline-flex items-center gap-0.5">
              View listing <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default function InboxView({
  received,
  sent,
  tradesReceived,
  tradesSent,
  currentUserId,
  userName,
}: {
  received: Thread[]
  sent: Thread[]
  tradesReceived: Trade[]
  tradesSent: Trade[]
  currentUserId: string
  userName: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'received' | 'sent' | 'trades'>('received')
  const [tradeTab, setTradeTab] = useState<'received' | 'sent'>('received')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const unreadCount = received.filter(t => t.has_unread).length
  const pendingTradeCount = tradesReceived.filter(t => t.status === 'pending').length

  async function handleTradeAction(id: string, status: 'accepted' | 'declined' | 'cancelled') {
    setActionLoading(id + status)
    await fetch(`/api/marketplace/trade/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActionLoading(null)
    router.refresh()
  }

  const threads = tab === 'received' ? received : sent

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e131f] flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col py-6 px-4 hidden md:flex border-r border-slate-800/50">
        <div className="mb-10 px-4">
          <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Inbox</p>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { href: '/shelves',           label: 'The Vault',    icon: 'dashboard',   active: false },
            { href: '/shelves',           label: 'The Library',  icon: 'auto_stories',active: false },
            { href: '/collection',        label: 'Intelligence', icon: 'analytics',   active: false },
            { href: '/marketplace',       label: 'The Exchange', icon: 'local_mall',  active: false },
            { href: '/marketplace/inbox', label: 'Inbox',        icon: 'mail',        active: true  },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all duration-200 ${
                item.active ? 'bg-violet-600/20 text-violet-100' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
              {item.label === 'Inbox' && (unreadCount + pendingTradeCount) > 0 && (
                <span className="ml-auto bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount + pendingTradeCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <Link href="/profile" className="px-4 py-2 flex items-center gap-3 text-slate-500 hover:text-slate-200 text-sm transition-colors rounded-lg hover:bg-slate-800">
            <span className="material-symbols-outlined text-lg">person</span>
            {userName}
          </Link>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">Inbox</h1>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {(['received', 'sent', 'trades'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize flex items-center gap-1.5 ${
                    tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {t}
                  {t === 'received' && unreadCount > 0 && (
                    <span className="bg-violet-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                  {t === 'trades' && pendingTradeCount > 0 && (
                    <span className="bg-amber-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">{pendingTradeCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <Link href="/marketplace" className="text-slate-500 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">storefront</span>
            Browse Exchange
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* ── INQUIRIES / THREADS ── */}
            {tab !== 'trades' && (
              threads.length === 0 ? (
                <div className="text-center py-24 text-slate-600">
                  <span className="material-symbols-outlined text-4xl block mb-3">mail</span>
                  <p>{tab === 'received' ? 'No messages received yet.' : "You haven't sent any messages yet."}</p>
                  {tab === 'sent' && (
                    <Link href="/marketplace" className="text-violet-400 text-sm hover:text-violet-300 mt-2 block">
                      Browse listings →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {threads.map(thread => (
                    <ThreadCard key={thread.thread_id} thread={thread} isReceived={tab === 'received'} />
                  ))}
                </div>
              )
            )}

            {/* ── TRADES ── */}
            {tab === 'trades' && (
              <>
                <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit mb-6">
                  {(['received', 'sent'] as const).map(t => (
                    <button key={t} onClick={() => setTradeTab(t)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize flex items-center gap-1.5 ${
                        tradeTab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {t}
                      {t === 'received' && pendingTradeCount > 0 && (
                        <span className="bg-amber-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">{pendingTradeCount}</span>
                      )}
                    </button>
                  ))}
                </div>

                {(() => {
                  const trades = tradeTab === 'received' ? tradesReceived : tradesSent
                  if (trades.length === 0) return (
                    <div className="text-center py-24 text-slate-600">
                      <span className="material-symbols-outlined text-4xl block mb-3">swap_horiz</span>
                      <p>{tradeTab === 'received' ? 'No trade proposals received yet.' : "You haven't proposed any trades yet."}</p>
                      {tradeTab === 'sent' && (
                        <Link href="/marketplace" className="text-amber-400 text-sm hover:text-amber-300 mt-2 block">
                          Browse listings to propose a trade →
                        </Link>
                      )}
                    </div>
                  )

                  return (
                    <div className="space-y-4">
                      {trades.map(trade => {
                        const offeredCover = trade.offered_collection?.edition?.cover_image
                        const requestedCover = trade.requested_listing?.edition?.cover_image
                        const isPending = trade.status === 'pending'

                        return (
                          <div key={trade.id} className={`bg-slate-900/60 border rounded-xl p-4 ${isPending && tradeTab === 'received' ? 'border-amber-700/50' : 'border-slate-800'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-slate-500 text-xs">
                                {tradeTab === 'received' ? `from @${trade.proposer_username}` : 'you proposed'}
                                {' · '}{timeAgo(trade.created_at)}
                              </p>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_BADGE[trade.status]}`}>
                                {trade.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <BookCover src={offeredCover} title={trade.offered_collection?.book?.title} />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Offering</p>
                                  <p className="text-white text-sm font-semibold line-clamp-1">{trade.offered_collection?.book?.title ?? '—'}</p>
                                  <p className="text-slate-500 text-xs line-clamp-1">{trade.offered_collection?.book?.author}</p>
                                  {trade.offered_collection?.condition && (
                                    <p className="text-xs text-slate-600 mt-0.5">{trade.offered_collection.condition}</p>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 text-slate-600">
                                <span className="material-symbols-outlined text-2xl">swap_horiz</span>
                              </div>

                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <BookCover src={requestedCover} title={trade.requested_listing?.book?.title} />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">For</p>
                                  <p className="text-white text-sm font-semibold line-clamp-1">{trade.requested_listing?.book?.title ?? '—'}</p>
                                  <p className="text-slate-500 text-xs line-clamp-1">{trade.requested_listing?.book?.author}</p>
                                  {trade.requested_listing?.id && (
                                    <Link href={`/marketplace/${trade.requested_listing.id}`} className="text-violet-400 text-[11px] hover:text-violet-300 mt-0.5 inline-flex items-center gap-0.5">
                                      View listing <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>

                            {trade.message && (
                              <p className="text-slate-400 text-sm mt-3 border-t border-slate-800 pt-3 line-clamp-3">{trade.message}</p>
                            )}

                            {isPending && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                                {tradeTab === 'received' ? (
                                  <>
                                    <button
                                      onClick={() => handleTradeAction(trade.id, 'accepted')}
                                      disabled={!!actionLoading}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                                    >
                                      {actionLoading === trade.id + 'accepted' ? 'Accepting…' : 'Accept Trade'}
                                    </button>
                                    <button
                                      onClick={() => handleTradeAction(trade.id, 'declined')}
                                      disabled={!!actionLoading}
                                      className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold py-2 rounded-lg transition-colors"
                                    >
                                      {actionLoading === trade.id + 'declined' ? 'Declining…' : 'Decline'}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleTradeAction(trade.id, 'cancelled')}
                                    disabled={!!actionLoading}
                                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                                  >
                                    {actionLoading === trade.id + 'cancelled' ? 'Cancelling…' : 'Cancel Proposal'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}

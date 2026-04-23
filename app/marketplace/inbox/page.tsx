import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import InboxView from './InboxView'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all inquiry messages the current user is party to
  const { data: allMessages } = await supabase
    .from('marketplace_inquiry')
    .select(`
      id, thread_id, message, offer_price, created_at, read_at,
      from_user_id, to_user_id,
      listing:listing_id(id, asking_price,
        book:book_id(title, author),
        edition:edition_id(cover_image, source:source_id(name))
      )
    `)
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order('created_at', { ascending: true })
    .limit(500)

  // Build username map for all other parties
  const otherUserIds = [...new Set(
    (allMessages ?? []).flatMap((m: any) =>
      [m.from_user_id, m.to_user_id].filter((id: string) => id !== user.id)
    )
  )]
  const { data: profiles } = otherUserIds.length
    ? await supabase.from('user_profile').select('id, username').in('id', otherUserIds)
    : { data: [] }
  const usernameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.username]))

  // Mark unread messages (addressed to current user) as read
  const unreadIds = (allMessages ?? [])
    .filter((m: any) => m.to_user_id === user.id && !m.read_at)
    .map((m: any) => m.id)
  if (unreadIds.length > 0) {
    await supabase.from('marketplace_inquiry')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  // Group messages into threads
  const threadMap = new Map<string, any>()
  for (const msg of (allMessages ?? [])) {
    const tid = msg.thread_id
    if (!threadMap.has(tid)) {
      threadMap.set(tid, {
        thread_id: tid,
        listing: msg.listing,
        messages: [],
        last_at: msg.created_at,
        has_unread: false,
        initiated_by_me: msg.from_user_id === user.id,
        other_user_id: msg.from_user_id === user.id ? msg.to_user_id : msg.from_user_id,
      })
    }
    const thread = threadMap.get(tid)
    thread.messages.push({
      ...msg,
      is_mine: msg.from_user_id === user.id,
      sender_username: usernameMap[msg.from_user_id] ?? 'collector',
    })
    thread.last_at = msg.created_at
    if (msg.to_user_id === user.id && !msg.read_at) thread.has_unread = true
  }

  const threads = [...threadMap.values()]
    .map(t => ({ ...t, other_username: usernameMap[t.other_user_id] ?? 'collector' }))
    .sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())

  const received = threads.filter(t => !t.initiated_by_me)
  const sent = threads.filter(t => t.initiated_by_me)

  // Fetch received trade proposals
  const { data: tradesReceived } = await supabase
    .from('trade_proposal')
    .select(`
      id, message, status, created_at, updated_at,
      offered_collection:offered_collection_id(
        id, condition,
        book:book_id(title, author),
        edition:edition_id(cover_image, edition_name, source:source_id(name))
      ),
      requested_listing:requested_listing_id(
        id, asking_price,
        book:book_id(title, author),
        edition:edition_id(cover_image, edition_name, source:source_id(name))
      ),
      proposer:proposer_id(id)
    `)
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const proposerIds = [...new Set((tradesReceived ?? []).map((t: any) => t.proposer?.id).filter(Boolean))]
  const { data: proposerProfiles } = proposerIds.length
    ? await supabase.from('user_profile').select('id, username').in('id', proposerIds)
    : { data: [] }
  const proposerUsernameMap = Object.fromEntries((proposerProfiles ?? []).map((p: any) => [p.id, p.username]))

  const tradesReceivedWithSender = (tradesReceived ?? []).map((t: any) => ({
    ...t,
    proposer_username: proposerUsernameMap[t.proposer?.id] ?? 'collector',
  }))

  // Fetch sent trade proposals
  const { data: tradesSent } = await supabase
    .from('trade_proposal')
    .select(`
      id, message, status, created_at, updated_at,
      offered_collection:offered_collection_id(
        id, condition,
        book:book_id(title, author),
        edition:edition_id(cover_image, edition_name, source:source_id(name))
      ),
      requested_listing:requested_listing_id(
        id, asking_price,
        book:book_id(title, author),
        edition:edition_id(cover_image, edition_name, source:source_id(name))
      )
    `)
    .eq('proposer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <InboxView
      received={received as any}
      sent={sent as any}
      tradesReceived={tradesReceivedWithSender as any}
      tradesSent={(tradesSent ?? []) as any}
      currentUserId={user.id}
      userName={user.email?.split('@')[0] ?? 'You'}
    />
  )
}

import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { thread_id, message } = await req.json()
  if (!thread_id || !message?.trim()) {
    return NextResponse.json({ error: 'Missing thread_id or message' }, { status: 400 })
  }

  // Find the root message to get listing_id and the other party
  const { data: root } = await supabase
    .from('marketplace_inquiry')
    .select('id, listing_id, from_user_id, to_user_id')
    .eq('thread_id', thread_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!root) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  // The reply recipient is whoever the current user is NOT
  const toUserId = root.from_user_id === user.id ? root.to_user_id : root.from_user_id
  if (toUserId === user.id) return NextResponse.json({ error: 'Cannot reply to yourself' }, { status: 400 })

  const { error } = await supabase.from('marketplace_inquiry').insert({
    thread_id,
    listing_id: root.listing_id,
    from_user_id: user.id,
    to_user_id: toUserId,
    message: message.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

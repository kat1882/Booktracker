import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { offered_collection_id, requested_listing_id, recipient_id, message } = await req.json()
  if (!offered_collection_id || !requested_listing_id || !recipient_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (recipient_id === user.id) {
    return NextResponse.json({ error: 'Cannot trade with yourself' }, { status: 400 })
  }

  // Verify the offered item belongs to the proposer
  const { data: owned } = await supabase
    .from('user_collection')
    .select('id')
    .eq('id', offered_collection_id)
    .eq('user_id', user.id)
    .single()
  if (!owned) return NextResponse.json({ error: 'You do not own that item' }, { status: 403 })

  const { error } = await supabase.from('trade_proposal').insert({
    proposer_id: user.id,
    recipient_id,
    offered_collection_id,
    requested_listing_id,
    message: message?.trim() || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

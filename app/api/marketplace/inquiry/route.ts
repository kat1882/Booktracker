import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, to_user_id, message, offer_price } = await req.json()
  if (!listing_id || !to_user_id || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (to_user_id === user.id) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  const { error } = await supabase.from('marketplace_inquiry').insert({
    listing_id,
    from_user_id: user.id,
    to_user_id,
    message: message.trim(),
    offer_price: offer_price ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

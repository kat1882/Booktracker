import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()
  if (!['accepted', 'declined', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Fetch the proposal to validate permissions
  const { data: proposal } = await supabase
    .from('trade_proposal')
    .select('proposer_id, recipient_id, status')
    .eq('id', id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (proposal.status !== 'pending') return NextResponse.json({ error: 'Already resolved' }, { status: 409 })

  // Only recipient can accept/decline; only proposer can cancel
  if (status === 'cancelled' && proposal.proposer_id !== user.id) {
    return NextResponse.json({ error: 'Only the proposer can cancel' }, { status: 403 })
  }
  if (['accepted', 'declined'].includes(status) && proposal.recipient_id !== user.id) {
    return NextResponse.json({ error: 'Only the recipient can accept or decline' }, { status: 403 })
  }

  const { error } = await supabase
    .from('trade_proposal')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

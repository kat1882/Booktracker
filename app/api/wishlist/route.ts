import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { edition_id } = await req.json()
  if (!edition_id) return NextResponse.json({ error: 'Missing edition_id' }, { status: 400 })

  // Ensure user_profile exists
  await supabase.from('user_profile').upsert({ id: user.id, username: user.email!.split('@')[0] }, { onConflict: 'id', ignoreDuplicates: true })

  const { error } = await supabase.from('user_wishlist').upsert(
    { user_id: user.id, edition_id },
    { onConflict: 'user_id,edition_id', ignoreDuplicates: true }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { edition_id } = await req.json()
  if (!edition_id) return NextResponse.json({ error: 'Missing edition_id' }, { status: 400 })

  const { error } = await supabase.from('user_wishlist')
    .delete()
    .eq('user_id', user.id)
    .eq('edition_id', edition_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

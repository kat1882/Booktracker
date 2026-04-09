import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { source_id } = await req.json()
  if (!source_id) return NextResponse.json({ error: 'Missing source_id' }, { status: 400 })

  const { error } = await supabase
    .from('user_box_subscription')
    .insert({ user_id: user.id, source_id })

  if (error && error.code !== '23505') // ignore duplicate
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { source_id } = await req.json()

  await supabase
    .from('user_box_subscription')
    .delete()
    .eq('user_id', user.id)
    .eq('source_id', source_id)

  return NextResponse.json({ ok: true })
}

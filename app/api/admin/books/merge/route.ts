import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { keepId, deleteId } = await request.json()
  if (!keepId || !deleteId || keepId === deleteId) return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })

  // Move all editions from duplicate to canonical
  const { error: edErr } = await supabase
    .from('edition')
    .update({ book_id: keepId })
    .eq('book_id', deleteId)

  if (edErr) return NextResponse.json({ error: edErr.message }, { status: 500 })

  // Move user_collection entries
  await supabase.from('user_collection').update({ book_id: keepId }).eq('book_id', deleteId)

  // Delete the duplicate book
  const { error: delErr } = await supabase.from('book').delete().eq('id', deleteId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

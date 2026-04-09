import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id: listId } = await params
  const { edition_id, notes } = await request.json()

  // Verify list belongs to user
  const { data: list } = await supabase.from('user_list').select('id').eq('id', listId).eq('user_id', user.id).single()
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  const { error } = await supabase
    .from('user_list_item')
    .upsert({ list_id: listId, edition_id, notes: notes ?? null }, { onConflict: 'list_id,edition_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id: listId } = await params
  const { edition_id } = await request.json()

  const { error } = await supabase
    .from('user_list_item')
    .delete()
    .eq('list_id', listId)
    .eq('edition_id', edition_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

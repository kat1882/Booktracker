import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { edition_id, book_id, status } = await request.json()

  // Ensure user_profile exists
  await supabase.from('user_profile').upsert(
    { id: user.id, username: user.email!.split('@')[0] },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Check if this edition is already on their shelf
  const { data: existing } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', user.id)
    .eq('edition_id', edition_id)
    .maybeSingle()

  if (existing) {
    await supabase.from('user_collection')
      .update({ reading_status: status })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_collection').insert({
      user_id: user.id,
      edition_id,
      book_id,
      reading_status: status,
    })
  }

  return NextResponse.json({ ok: true })
}

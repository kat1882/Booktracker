import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { edition_id, book_id, status, owned } = await request.json()

  if (!edition_id) {
    return NextResponse.json({ error: 'not_in_database', message: 'This edition is not in our database yet.' }, { status: 404 })
  }

  // Verify the edition actually exists
  const { data: edition } = await supabase
    .from('edition')
    .select('id')
    .eq('id', edition_id)
    .maybeSingle()

  if (!edition) {
    return NextResponse.json({ error: 'not_in_database', message: 'This edition is not in our database yet.' }, { status: 404 })
  }

  await supabase.from('user_profile').upsert(
    { id: user.id, username: user.email!.split('@')[0] },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const collectionData: Record<string, unknown> = { reading_status: owned ? null : status }
  if (owned) collectionData.owned = true

  const { data: existing } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', user.id)
    .eq('edition_id', edition_id)
    .maybeSingle()

  if (existing) {
    await supabase.from('user_collection').update(collectionData).eq('id', existing.id)
  } else {
    await supabase.from('user_collection').insert({
      user_id: user.id,
      edition_id,
      book_id,
      ...collectionData,
    })
  }

  return NextResponse.json({ ok: true, edition_id })
}

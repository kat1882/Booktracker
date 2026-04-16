import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { edition_id, book_id, owned } = await request.json()

  await supabase.from('user_profile').upsert(
    { id: user.id, username: user.email!.split('@')[0] },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data: existing } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', user.id)
    .eq('edition_id', edition_id)
    .maybeSingle()

  if (existing) {
    await supabase.from('user_collection').update({ owned }).eq('id', existing.id)
  } else {
    await supabase.from('user_collection').insert({
      user_id: user.id,
      edition_id,
      book_id,
      owned,
    })
  }

  revalidatePath('/shelves')
  return NextResponse.json({ ok: true })
}

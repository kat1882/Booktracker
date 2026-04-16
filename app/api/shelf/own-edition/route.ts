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

  // Look for existing entry by edition_id first, then fall back to book_id
  let existing: { id: string } | null = null

  const { data: byEdition } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', user.id)
    .eq('edition_id', edition_id)
    .maybeSingle()

  if (byEdition) {
    existing = byEdition
  } else {
    // Entry may have been created via "Add to Shelf" on the book page (no edition_id)
    const { data: byBook } = await supabase
      .from('user_collection')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', book_id)
      .maybeSingle()
    if (byBook) existing = byBook
  }

  let error
  if (existing) {
    // Update owned and also attach the edition_id if it wasn't set
    const { error: updateError } = await supabase
      .from('user_collection')
      .update({ owned, edition_id })
      .eq('id', existing.id)
    error = updateError
  } else {
    const { error: insertError } = await supabase
      .from('user_collection')
      .insert({ user_id: user.id, edition_id, book_id, owned })
    error = insertError
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/shelves')
  return NextResponse.json({ ok: true })
}

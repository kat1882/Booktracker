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

  // Find existing entry for this specific edition
  const { data: existing } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', user.id)
    .eq('edition_id', edition_id)
    .maybeSingle()

  let error
  if (existing) {
    const updateData: Record<string, unknown> = { owned }
    if (owned) {
      const { data: existingRow } = await supabase
        .from('user_collection')
        .select('reading_status')
        .eq('id', existing.id)
        .single()
      if (existingRow?.reading_status === 'want_to_read') {
        updateData.reading_status = null
      }
    }
    const { error: updateError } = await supabase
      .from('user_collection')
      .update(updateData)
      .eq('id', existing.id)
    error = updateError
  } else {
    // Remove any bare book-level entries (no edition) for this book so it
    // doesn't appear on both "Want to Read" and "Owned" shelves simultaneously
    if (owned) {
      await supabase
        .from('user_collection')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', book_id)
        .is('edition_id', null)
    }
    const { error: insertError } = await supabase
      .from('user_collection')
      .insert({ user_id: user.id, edition_id, book_id, owned })
    error = insertError
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/shelves')
  return NextResponse.json({ ok: true })
}

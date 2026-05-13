import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

const ALLOWED = ['edition_name', 'edition_type', 'cover_image', 'original_retail_price',
  'estimated_value', 'price_override', 'isbn', 'publisher', 'release_month', 'print_run_size',
  'cover_artist', 'edge_treatment', 'binding', 'foiling', 'signature_type', 'extras', 'notes', 'sku',
  'set_size', 'source_id']

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))

  if (Object.keys(updates).length === 0 && !body.book_author && !body.book_title) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('edition').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update the linked book's author/title if provided
  if (body.book_author || body.book_title) {
    const { data: ed } = await supabase.from('edition').select('book_id').eq('id', id).single()
    if (ed?.book_id) {
      const bookUpdates: Record<string, string> = {}
      if (body.book_author?.trim()) bookUpdates.author = body.book_author.trim()
      if (body.book_title?.trim())  bookUpdates.title  = body.book_title.trim()
      await supabase.from('book').update(bookUpdates).eq('id', ed.book_id)
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { error } = await supabase.from('edition').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

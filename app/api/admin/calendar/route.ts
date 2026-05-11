import { createClient } from '@/lib/supabase-server'
import { createClient as makeClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

function adminClient() {
  return makeClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id === ADMIN_USER_ID
}

export async function GET() {
  const admin = adminClient()
  const { data } = await admin
    .from('release_calendar')
    .select('*, source:source_id(id, name)')
    .order('release_date', { ascending: true })

  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminClient()
  const body = await req.json()

  let editionId = body.edition_id || null

  // Auto-create book + edition unless an edition_id was manually provided
  if (!editionId && body.book_title?.trim()) {
    const bookTitle  = body.book_title.trim()
    const author     = body.author?.trim() || 'Unknown'
    const sourceId   = body.source_id || null
    const setSize    = body.set_size ? Number(body.set_size) : null
    const edType     = body.edition_type || 'other'
    const coverImage = body.cover_image_url?.trim() || null

    // 1. Find or create book
    let bookId: string | null = null
    const { data: existingBook } = await admin
      .from('book')
      .select('id')
      .ilike('title', bookTitle)
      .ilike('author', author)
      .limit(1)
      .single()

    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: newBook } = await admin
        .from('book')
        .insert({ title: bookTitle, author })
        .select('id')
        .single()
      bookId = newBook?.id ?? null
    }

    // 2. Build edition name
    let editionName = bookTitle
    if (sourceId) {
      const { data: src } = await admin.from('source').select('name').eq('id', sourceId).single()
      if (src) editionName = `${bookTitle} (${src.name} Edition)`
    } else if (edType && edType !== 'other') {
      const typeLabel = edType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      editionName = `${bookTitle} – ${typeLabel.toUpperCase()} EDITION`
    }

    // 3. Create edition
    if (bookId) {
      const { data: newEdition } = await admin
        .from('edition')
        .insert({
          book_id:      bookId,
          source_id:    sourceId,
          edition_name: editionName,
          edition_type: edType,
          set_size:     setSize,
          cover_image:  coverImage,
        })
        .select('id')
        .single()
      editionId = newEdition?.id ?? null
    }
  }

  // 4. Save calendar entry
  const { data, error } = await admin
    .from('release_calendar')
    .insert({
      source_id:       body.source_id || null,
      book_title:      body.book_title,
      author:          body.author || null,
      release_date:    body.release_date,
      edition_type:    body.edition_type || null,
      notes:           body.notes || null,
      cover_image_url: body.cover_image_url || null,
      edition_id:      editionId,
      set_size:        body.set_size ? Number(body.set_size) : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data, edition_created: !!editionId && !body.edition_id })
}

export async function PATCH(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminClient()
  const body = await req.json()
  const { id, ...fields } = body
  const allowed = ['book_title','author','release_date','edition_type','notes','cover_image_url','edition_id','source_id','set_size']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  const { error } = await admin.from('release_calendar').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = adminClient()
  const { id } = await req.json()
  await admin.from('release_calendar').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}

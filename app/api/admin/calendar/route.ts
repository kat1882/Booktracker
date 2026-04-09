import { createClient } from '@/lib/supabase-server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id === ADMIN_USER_ID
}

export async function GET() {
  const { data } = await admin
    .from('release_calendar')
    .select('*, source:source_id(id, name)')
    .order('release_date', { ascending: true })

  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await admin
    .from('release_calendar')
    .insert({
      source_id: body.source_id || null,
      book_title: body.book_title,
      author: body.author || null,
      release_date: body.release_date,
      edition_type: body.edition_type || null,
      notes: body.notes || null,
      cover_image_url: body.cover_image_url || null,
      edition_id: body.edition_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function PATCH(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...fields } = body
  const allowed = ['book_title','author','release_date','edition_type','notes','cover_image_url','edition_id','source_id']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  const { error } = await admin.from('release_calendar').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  await admin.from('release_calendar').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}

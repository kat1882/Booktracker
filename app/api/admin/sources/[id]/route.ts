import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('name' in body && body.name?.trim()) updates.name = body.name.trim()
  if ('type' in body) updates.type = body.type || null
  if ('website' in body) updates.website = body.website?.trim() || null
  if ('logo_url' in body) updates.logo_url = body.logo_url?.trim() || null
  if ('brand' in body) updates.brand = body.brand?.trim() || null
  const infoFields = ['tagline','ships_from','ships_to','book_type','genres','sub_frequency','what_you_get','cost','sub_renews','sub_ships','sub_cycle_example','skip_notes','additional_notes']
  for (const f of infoFields) {
    if (f in body) updates[f] = body[f]?.trim() || null
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await supabase.from('source').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== process.env.CALENDAR_PROCESS_SECRET && process.env.CALENDAR_PROCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().slice(0, 10)

  const { data: released } = await adminSupabase
    .from('release_calendar')
    .select('id, source_id, edition_id')
    .lte('release_date', today)
    .not('edition_id', 'is', null)

  if (!released || released.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let added = 0

  for (const entry of released) {
    const { data: subs } = await adminSupabase
      .from('user_box_subscription')
      .select('user_id')
      .eq('source_id', entry.source_id)

    if (!subs || subs.length === 0) continue

    const rows = subs.map(s => ({
      user_id: s.user_id,
      edition_id: entry.edition_id,
      reading_status: 'want_to_read',
    }))

    await adminSupabase
      .from('user_collection')
      .upsert(rows, { onConflict: 'user_id,edition_id', ignoreDuplicates: true })

    added += rows.length
  }

  return NextResponse.json({ processed: released.length, added })
}

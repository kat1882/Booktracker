import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service-role client for admin operations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// This endpoint processes released calendar entries:
// - Finds entries where release_date <= today AND edition_id is set
// - Adds that edition to all subscribers' collections (reading_status = 'read' or leave uncategorised)
// Call via cron (Vercel Cron or external) or from admin panel
export async function POST(req: Request) {
  // Simple secret check so random people can't trigger it
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== process.env.CALENDAR_PROCESS_SECRET && process.env.CALENDAR_PROCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Find released entries that are linked to an edition
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
    // Get subscribers to this source
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

    // Upsert — skip if already in collection
    await adminSupabase
      .from('user_collection')
      .upsert(rows, { onConflict: 'user_id,edition_id', ignoreDuplicates: true })

    added += rows.length
  }

  return NextResponse.json({ processed: released.length, added })
}

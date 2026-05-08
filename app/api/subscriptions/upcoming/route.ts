import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userSubs } = await supabase.from('user_subscriptions').select('source_id').eq('user_id', user.id)
  const subscribedIds = (userSubs ?? []).map((s: any) => s.source_id)

  if (subscribedIds.length === 0) return NextResponse.json({ upcomingBySource: [] })

  const { data: sources } = await supabase.from('source').select('id, name').in('id', subscribedIds)
  const sourceMap = Object.fromEntries((sources ?? []).map((s: any) => [s.id, s]))

  const now = new Date()
  const months = [
    now.toLocaleString('en-US', { month: 'long' }),
    new Date(now.getFullYear(), now.getMonth() + 1).toLocaleString('en-US', { month: 'long' }),
  ]
  const years = [
    String(now.getFullYear()),
    String(new Date(now.getFullYear(), now.getMonth() + 1).getFullYear()),
  ]

  const results = await Promise.all(
    months.map((month, i) =>
      supabase
        .from('edition')
        .select('id, edition_name, cover_image, estimated_value, original_retail_price, source_id, book:book_id(title, author)')
        .in('source_id', subscribedIds)
        .ilike('edition_name', `%${month}%${years[i]}%`)
    )
  )

  const allEditions = results.flatMap(r => r.data ?? [])
  const bySource: Record<string, { source: any; editions: any[] }> = {}
  for (const ed of allEditions) {
    const src = sourceMap[(ed as any).source_id]
    if (!src) continue
    if (!bySource[src.id]) bySource[src.id] = { source: src, editions: [] }
    bySource[src.id].editions.push(ed)
  }

  return NextResponse.json({ upcomingBySource: Object.values(bySource) })
}

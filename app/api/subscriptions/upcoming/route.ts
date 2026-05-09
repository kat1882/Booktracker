import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userSubs } = await supabase.from('user_subscriptions').select('source_id').eq('user_id', user.id)
  const subscribedIds = new Set((userSubs ?? []).map((s: any) => s.source_id))

  if (subscribedIds.size === 0) return NextResponse.json({ upcomingBySource: [] })

  const { data: allSources } = await supabase
    .from('source')
    .select('id, name, brand')
    .eq('type', 'subscription_box')

  const sources = allSources ?? []

  // Expand to all sources sharing a brand with any subscribed source
  const subscribedBrands = new Set(
    sources.filter((s: any) => subscribedIds.has(s.id) && s.brand).map((s: any) => s.brand)
  )
  const expandedSourceIds = [...new Set([
    ...subscribedIds,
    ...sources.filter((s: any) => s.brand && subscribedBrands.has(s.brand)).map((s: any) => s.id),
  ])]

  const sourceMap = Object.fromEntries(sources.map((s: any) => [s.id, s]))

  const now = new Date()
  const months = [
    { month: now.toLocaleString('en-US', { month: 'long' }), year: String(now.getFullYear()) },
    { month: new Date(now.getFullYear(), now.getMonth() + 1).toLocaleString('en-US', { month: 'long' }), year: String(new Date(now.getFullYear(), now.getMonth() + 1).getFullYear()) },
  ]

  const monthFilter = months
    .flatMap(({ month, year }) => [
      `release_month.eq.${month} ${year}`,
      `edition_name.ilike.%${month}%${year}%`,
    ])
    .join(',')

  const { data: raw } = await supabase
    .from('edition')
    .select('id, edition_name, cover_image, estimated_value, original_retail_price, source_id, book:book_id(title, author)')
    .in('source_id', expandedSourceIds)
    .or(monthFilter)

  // Deduplicate
  const seen = new Set<string>()
  const allEditions = (raw ?? []).filter((ed: any) => {
    if (seen.has(ed.id)) return false
    seen.add(ed.id)
    return true
  })

  const bySource: Record<string, { source: any; editions: any[] }> = {}
  for (const ed of allEditions) {
    const src = sourceMap[(ed as any).source_id]
    if (!src) continue
    if (!bySource[src.id]) bySource[src.id] = { source: src, editions: [] }
    bySource[src.id].editions.push(ed)
  }

  return NextResponse.json({ upcomingBySource: Object.values(bySource) })
}

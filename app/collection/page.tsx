import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import IntelligenceView from './IntelligenceView'
import UpgradePrompt from './UpgradePrompt'

const anonSupabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function CollectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('is_pro')
    .eq('id', user.id)
    .maybeSingle()

  const isPro = profile?.is_pro ?? false

  const { data: collection } = await supabase
    .from('user_collection')
    .select(`
      id,
      edition:edition_id (
        id, edition_name, cover_image,
        original_retail_price, estimated_value, value_updated_at,
        book:book_id ( title, author ),
        source:source_id ( name )
      )
    `)
    .eq('user_id', user.id)

  const entries = (collection ?? []) as unknown as {
    id: string
    edition: {
      id: string
      edition_name: string
      cover_image?: string
      original_retail_price?: number
      estimated_value?: number
      value_updated_at?: string
      book: { title: string; author: string } | null
      source: { name: string } | null
    } | null
  }[]

  const editions = entries.map(e => e.edition).filter((e): e is NonNullable<typeof e> => e !== null)

  // Total value
  const totalValue = editions.reduce((s, e) => s + Number(e.estimated_value ?? e.original_retail_price ?? 0), 0)
  const totalRetail = editions.reduce((s, e) => s + Number(e.original_retail_price ?? 0), 0)
  const valuedEditions = editions.filter(e => e.estimated_value != null)

  // Top gainers/losers (need both retail + market price to compare)
  const withBoth = editions
    .filter(e => e.estimated_value != null && e.original_retail_price != null && e.original_retail_price > 0)
    .map(e => ({
      ...e,
      changePct: ((e.estimated_value! - e.original_retail_price!) / e.original_retail_price!) * 100,
      changeAbs: e.estimated_value! - e.original_retail_price!,
    }))
    .sort((a, b) => b.changePct - a.changePct)

  const topGainers = withBoth.slice(0, 5)
  const topLosers = [...withBoth].sort((a, b) => a.changePct - b.changePct).slice(0, 5)

  // Value by source
  const bySource: Record<string, { count: number; value: number }> = {}
  for (const e of editions) {
    const name = e.source?.name ?? 'Unknown'
    if (!bySource[name]) bySource[name] = { count: 0, value: 0 }
    bySource[name].count++
    bySource[name].value += Number(e.estimated_value ?? e.original_retail_price ?? 0)
  }
  const sourceList = Object.entries(bySource)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value)
  // Fetch price history for all owned editions
  const editionIds = editions.map(e => e.id)
  const { data: priceHistory } = editionIds.length > 0
    ? await anonSupabase
        .from('edition_price_history')
        .select('edition_id, price, recorded_at')
        .in('edition_id', editionIds)
        .order('recorded_at', { ascending: true })
    : { data: [] }

  // Build total collection value over time by grouping by date
  // For each unique date, sum the latest known price for each edition up to that date
  const historyByEdition: Record<string, { price: number; recorded_at: string }[]> = {}
  for (const row of (priceHistory ?? [])) {
    if (!historyByEdition[row.edition_id]) historyByEdition[row.edition_id] = []
    historyByEdition[row.edition_id].push({ price: Number(row.price), recorded_at: row.recorded_at })
  }

  // Get all unique dates from history, plus today
  const allDates = [...new Set((priceHistory ?? []).map(r => r.recorded_at.slice(0, 10)))]
    .sort()

  // Build the total-value-over-time series
  const valueOverTime: { date: string; value: number }[] = allDates.map(date => {
    let total = 0
    for (const editionId of editionIds) {
      const points = historyByEdition[editionId] ?? []
      // Find the latest price on or before this date
      const validPoints = points.filter(p => p.recorded_at.slice(0, 10) <= date)
      if (validPoints.length > 0) {
        total += validPoints[validPoints.length - 1].price
      }
    }
    return { date, value: Math.round(total * 100) / 100 }
  })

  if (!isPro) return <UpgradePrompt editionCount={editions.length} />

  const featured = withBoth.length > 0
    ? withBoth.sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))[0]
    : editions.find(e => e.estimated_value != null) ?? null

  const userName = user.email?.split('@')[0] ?? 'Collector'

  return (
    <IntelligenceView
      featured={featured}
      totalValue={totalValue}
      totalRetail={totalRetail}
      editionCount={editions.length}
      valuedCount={valuedEditions.length}
      topGainers={topGainers}
      topLosers={topLosers}
      sourceList={sourceList}
      valueOverTime={valueOverTime}
      userName={userName}
    />
  )
}

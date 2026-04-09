import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import CollectionValueChart from './CollectionValueChart'

const anonSupabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function CollectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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
  const maxSourceValue = sourceList[0]?.value ?? 1

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Collection Value</h1>
          <p className="text-sm text-gray-500 mt-0.5">{editions.length} editions · {valuedEditions.length} with market prices</p>
        </div>
        <Link href="/shelves" className="text-sm text-gray-400 hover:text-white transition-colors">← My Shelves</Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: 'Est. Market Value',
            value: totalValue > 0 ? `$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—',
            color: 'text-emerald-400',
          },
          {
            label: 'Total Retail Paid',
            value: totalRetail > 0 ? `$${totalRetail.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—',
            color: 'text-white',
          },
          {
            label: 'Total Gain/Loss',
            value: totalValue > 0 && totalRetail > 0
              ? `${totalValue - totalRetail >= 0 ? '+' : ''}$${(totalValue - totalRetail).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : '—',
            color: totalValue >= totalRetail ? 'text-green-400' : 'text-red-400',
          },
          {
            label: 'Priced Editions',
            value: `${valuedEditions.length} / ${editions.length}`,
            color: 'text-gray-300',
          },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Value over time chart */}
      {valueOverTime.length > 1 && (
        <div className="mb-8">
          <CollectionValueChart data={valueOverTime} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Top gainers */}
        {topGainers.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Biggest Gainers</h2>
            <div className="flex flex-col gap-3">
              {topGainers.map(e => (
                <Link key={e.id} href={`/edition/${e.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-12 relative bg-gray-800 rounded overflow-hidden shrink-0">
                    {e.cover_image && <Image src={e.cover_image} alt={e.edition_name} fill className="object-cover" sizes="32px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{e.book?.title}</p>
                    <p className="text-xs text-gray-500 truncate">{e.source?.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-400">+{e.changePct.toFixed(0)}%</p>
                    <p className="text-xs text-gray-600">+${e.changeAbs.toFixed(0)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top losers */}
        {topLosers.length > 0 && topLosers[0].changePct < 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Biggest Drops</h2>
            <div className="flex flex-col gap-3">
              {topLosers.filter(e => e.changePct < 0).map(e => (
                <Link key={e.id} href={`/edition/${e.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-12 relative bg-gray-800 rounded overflow-hidden shrink-0">
                    {e.cover_image && <Image src={e.cover_image} alt={e.edition_name} fill className="object-cover" sizes="32px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{e.book?.title}</p>
                    <p className="text-xs text-gray-500 truncate">{e.source?.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-400">{e.changePct.toFixed(0)}%</p>
                    <p className="text-xs text-gray-600">${e.changeAbs.toFixed(0)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Value by source */}
      {sourceList.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-white mb-4">Value by Source</h2>
          <div className="flex flex-col gap-3">
            {sourceList.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="w-36 text-xs text-gray-400 truncate shrink-0">{s.name}</div>
                <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${(s.value / maxSourceValue) * 100}%` }}
                  />
                </div>
                <div className="text-right shrink-0 w-24">
                  <span className="text-xs text-emerald-400 font-medium">${s.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  <span className="text-xs text-gray-600 ml-1">({s.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editions.length === 0 && (
        <div className="text-center py-24 text-gray-500">
          Add editions to your shelves to see your collection value.
          <br />
          <Link href="/browse" className="text-violet-400 hover:text-violet-300 text-sm mt-3 inline-block">Browse editions →</Link>
        </div>
      )}
    </div>
  )
}

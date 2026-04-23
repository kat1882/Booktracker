import { createClient } from '@/lib/supabase-server'
import BoxesView from './BoxesView'

const MONTH_ORDER = ['january','february','march','april','may','june','july','august','september','october','november','december']
const MONTH_ABBR: Record<string, string> = {
  january:'JAN',february:'FEB',march:'MAR',april:'APR',may:'MAY',june:'JUN',
  july:'JUL',august:'AUG',september:'SEP',october:'OCT',november:'NOV',december:'DEC',
}

export default async function BoxesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { month: qMonth, year: qYear } = await searchParams

  // Get all sub-box source IDs
  const { data: sources } = await supabase.from('source').select('id,name,type').eq('type','subscription_box')
  const sourceIds = (sources ?? []).map((s: any) => s.id)
  const sourceMap = Object.fromEntries((sources ?? []).map((s: any) => [s.id, s]))

  // Sample edition names to build available months
  const { data: nameRows } = await supabase
    .from('edition')
    .select('edition_name')
    .in('source_id', sourceIds)
    .limit(5000)

  const monthSet = new Set<string>()
  for (const row of nameRows ?? []) {
    const m = (row.edition_name as string).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(202\d)/i)
    if (m) monthSet.add(`${m[1].toLowerCase()}-${m[2]}`)
  }

  const months = [...monthSet].sort((a, b) => {
    const [am, ay] = a.split('-')
    const [bm, by] = b.split('-')
    if (ay !== by) return Number(by) - Number(ay)
    return MONTH_ORDER.indexOf(am!) - MONTH_ORDER.indexOf(bm!)
  })

  const selectedMonth = qMonth?.toLowerCase() ?? months[0]?.split('-')[0] ?? 'april'
  const selectedYear = qYear ?? months[0]?.split('-')[1] ?? '2026'
  const monthLabel = selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)

  // Fetch editions for selected month/year
  const { data: editions } = await supabase
    .from('edition')
    .select('id, edition_name, cover_image, estimated_value, original_retail_price, edition_type, source_id, book:book_id(id, title, author)')
    .in('source_id', sourceIds)
    .ilike('edition_name', `%${monthLabel}%${selectedYear}%`)

  // Group by source, sorted by edition count desc
  const bySource: Record<string, { source: any; editions: any[] }> = {}
  for (const ed of editions ?? []) {
    const sid = (ed as any).source_id
    if (!sid || !sourceMap[sid]) continue
    if (!bySource[sid]) bySource[sid] = { source: sourceMap[sid], editions: [] }
    bySource[sid].editions.push(ed)
  }
  const grouped = Object.values(bySource).sort((a, b) => b.editions.length - a.editions.length)

  const monthLabels = months.map(m => {
    const [mon, yr] = m.split('-')
    return { key: m, label: `${MONTH_ABBR[mon!] ?? mon?.toUpperCase()} ${yr}`, month: mon!, year: yr! }
  })

  return (
    <BoxesView
      monthLabels={monthLabels}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      grouped={grouped}
    />
  )
}

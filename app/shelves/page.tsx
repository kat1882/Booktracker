import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import VaultLayout from './VaultLayout'

const anonSupabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export default async function ShelvesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('user_profile').select('is_pro').eq('id', user.id).maybeSingle()
  const isPro = profile?.is_pro ?? false

  const { data: entries } = await supabase
    .from('user_collection')
    .select(`
      id, reading_status, owned, rating, date_read, date_started,
      condition, purchase_price, purchase_location, purchase_date, notes,
      for_sale, asking_price,
      book:book_id ( id, title, author, cover_ol_id, open_library_id, google_books_id ),
      edition:edition_id ( id, edition_name, edition_type, cover_image, estimated_value, original_retail_price, source:source_id ( name ) )
    `)
    .eq('user_id', user.id)
    .order('id', { ascending: false })

  const all = (entries ?? []) as unknown as {
    id: string
    reading_status: string | null
    owned: boolean
    rating: number | null
    date_read: string | null
    date_started: string | null
    condition: string | null
    purchase_price: number | null
    purchase_location: string | null
    purchase_date: string | null
    notes: string | null
    for_sale: boolean
    asking_price: number | null
    book: { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string; google_books_id?: string } | null
    edition: { id: string; edition_name: string; edition_type: string; cover_image?: string; estimated_value?: number; original_retail_price?: number; source?: { name: string } } | null
  }[]

  const thisYear = new Date().getFullYear()
  const readEntries = all.filter(e => e.reading_status === 'read')
  const ownedEntries = all.filter(e => e.owned)
  const signedEntries = ownedEntries.filter(e => e.edition?.edition_type === 'signed')
  const ratings = readEntries.map(e => e.rating).filter((r): r is number => r !== null)
  const totalValue = all.reduce((s, e) => s + Number(e.edition?.estimated_value ?? e.edition?.original_retail_price ?? 0), 0)
  const totalRetail = all.reduce((s, e) => s + Number(e.edition?.original_retail_price ?? 0), 0)
  const forSaleValue = all.filter(e => e.for_sale && e.asking_price).reduce((s, e) => s + Number(e.asking_price), 0)

  const stats = {
    total: all.length,
    owned: ownedEntries.length,
    signed: signedEntries.length,
    read: readEntries.length,
    reading: all.filter(e => e.reading_status === 'reading').length,
    wantToRead: all.filter(e => e.reading_status === 'want_to_read').length,
    readThisYear: readEntries.filter(e => e.date_read?.startsWith(String(thisYear))).length,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    totalValue,
    totalRetail,
    forSaleValue,
    collectionValue: totalValue > 0 ? totalValue : null,
  }

  // Price history for chart
  const editionIds = all.map(e => e.edition?.id).filter(Boolean) as string[]
  const { data: priceHistory } = editionIds.length > 0
    ? await anonSupabase
        .from('edition_price_history')
        .select('edition_id, price, recorded_at')
        .in('edition_id', editionIds)
        .order('recorded_at', { ascending: true })
    : { data: [] }

  const historyByEdition: Record<string, { price: number; recorded_at: string }[]> = {}
  for (const row of (priceHistory ?? [])) {
    if (!historyByEdition[row.edition_id]) historyByEdition[row.edition_id] = []
    historyByEdition[row.edition_id].push({ price: Number(row.price), recorded_at: row.recorded_at })
  }
  const allDates = [...new Set((priceHistory ?? []).map(r => r.recorded_at.slice(0, 10)))].sort()
  const valueOverTime = allDates.map(date => {
    let total = 0
    for (const id of editionIds) {
      const points = (historyByEdition[id] ?? []).filter(p => p.recorded_at.slice(0, 10) <= date)
      if (points.length > 0) total += points[points.length - 1].price
    }
    return { date, value: Math.round(total * 100) / 100 }
  })

  // Top gainers for market intel
  const topGainers = ownedEntries
    .filter(e => e.edition?.estimated_value && e.edition?.original_retail_price && e.edition.original_retail_price > 0)
    .map(e => ({
      id: e.id,
      title: e.book?.title ?? 'Unknown',
      source: e.edition?.source?.name ?? null,
      cover: e.edition?.cover_image ?? null,
      changePct: ((e.edition!.estimated_value! - e.edition!.original_retail_price!) / e.edition!.original_retail_price!) * 100,
      changeAbs: e.edition!.estimated_value! - e.edition!.original_retail_price!,
      editionId: e.edition?.id ?? '',
    }))
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 3)

  return (
    <VaultLayout
      entries={all}
      stats={stats}
      recentOwned={ownedEntries.slice(0, 8)}
      valueOverTime={valueOverTime}
      topGainers={topGainers}
      isPro={isPro}
      userName={user.email?.split('@')[0] ?? 'Collector'}
    />
  )
}

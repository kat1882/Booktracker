import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileView from './ProfileView'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  await supabase.from('user_profile').upsert(
    { id: user.id, username: user.email!.split('@')[0] },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const [{ data: profile }, { data: collection }, { data: wishlist }, { data: allSources }, { data: userSubs }] = await Promise.all([
    supabase.from('user_profile').select('username, country, joined_at, is_pro').eq('id', user.id).single(),
    supabase.from('user_collection').select(`
      id, reading_status, rating, date_read,
      edition:edition_id ( id, cover_image, edition_name, edition_type, estimated_value, original_retail_price, set_size,
        source:source_id ( name )
      ),
      book:book_id ( title, author )
    `).eq('user_id', user.id).order('date_read', { ascending: false, nullsFirst: false }),
    supabase.from('user_wishlist').select('edition_id').eq('user_id', user.id),
    supabase.from('source').select('id, name, logo_url, brand').eq('type', 'subscription_box').order('name'),
    supabase.from('user_subscriptions').select('source_id').eq('user_id', user.id),
  ])

  const isPro = profile?.is_pro ?? false
  const username = profile?.username ?? user.email!.split('@')[0]
  const joinedYear = profile?.joined_at ? new Date(profile.joined_at).getFullYear() : new Date().getFullYear()

  const entries = (collection ?? []) as unknown as {
    id: string
    reading_status: string
    rating: number | null
    date_read: string | null
    edition: {
      id: string
      cover_image?: string
      edition_name: string
      edition_type?: string
      estimated_value?: number
      original_retail_price?: number
      set_size?: number
      source?: { name: string }
    } | null
    book: { title: string; author: string } | null
  }[]

  const collectionValue = entries.reduce(
    (sum, e) => sum + Number(e.edition?.estimated_value ?? e.edition?.original_retail_price ?? 0) / (e.edition?.set_size ?? 1),
    0
  )

  const signedCount = entries.filter(e => e.edition?.edition_type === 'signed').length

  const thisYear = new Date().getFullYear()
  const thisYearCount = entries.filter(e => e.date_read && new Date(e.date_read).getFullYear() === thisYear).length

  const bySource: Record<string, number> = {}
  for (const e of entries) {
    if (!e.edition?.source?.name) continue
    const name = e.edition.source.name
    bySource[name] = (bySource[name] ?? 0) + 1
  }
  const sourceList = Object.entries(bySource).sort((a, b) => b[1] - a[1])
  const maxSourceCount = sourceList[0]?.[1] ?? 1

  const recentWithCovers = entries.filter(e => e.edition?.cover_image).slice(0, 6)

  // Subscriptions data
  const subscribedIds = new Set((userSubs ?? []).map((s: any) => s.source_id))
  const boxSources = (allSources ?? []) as { id: string; name: string; logo_url: string | null; brand: string | null }[]

  // Fetch upcoming editions (current + next month) for subscribed boxes
  const now = new Date()
  const months = [
    { month: now.toLocaleString('en-US', { month: 'long' }), year: String(now.getFullYear()) },
    { month: new Date(now.getFullYear(), now.getMonth() + 1).toLocaleString('en-US', { month: 'long' }), year: String(new Date(now.getFullYear(), now.getMonth() + 1).getFullYear()) },
  ]

  let upcomingEditions: any[] = []
  if (subscribedIds.size > 0) {
    // Expand to all sources in the same brand as any subscribed source
    const subscribedBrands = new Set(
      boxSources.filter(s => subscribedIds.has(s.id) && s.brand).map(s => s.brand!)
    )
    const expandedSourceIds = [...new Set([
      ...subscribedIds,
      ...boxSources.filter(s => s.brand && subscribedBrands.has(s.brand)).map(s => s.id),
    ])]

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

    // Deduplicate by id (release_month and edition_name filters can overlap)
    const seen = new Set<string>()
    upcomingEditions = (raw ?? []).filter((ed: any) => {
      if (seen.has(ed.id)) return false
      seen.add(ed.id)
      return true
    })
  }

  // Group upcoming by source
  const upcomingBySource: Record<string, { source: { id: string; name: string }; editions: any[] }> = {}
  for (const ed of upcomingEditions) {
    const src = boxSources.find(s => s.id === (ed as any).source_id)
    if (!src) continue
    if (!upcomingBySource[src.id]) upcomingBySource[src.id] = { source: src, editions: [] }
    upcomingBySource[src.id].editions.push(ed)
  }

  return (
    <ProfileView
      username={username}
      joinedYear={joinedYear}
      isPro={isPro}
      entries={entries}
      wishlistCount={wishlist?.length ?? 0}
      collectionValue={collectionValue}
      signedCount={signedCount}
      thisYearCount={thisYearCount}
      sourceList={sourceList}
      maxSourceCount={maxSourceCount}
      recentWithCovers={recentWithCovers}
      boxSources={boxSources}
      subscribedIds={[...subscribedIds]}
      upcomingBySource={Object.values(upcomingBySource)}
    />
  )
}

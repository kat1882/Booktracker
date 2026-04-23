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

  const [{ data: profile }, { data: collection }, { data: wishlist }] = await Promise.all([
    supabase.from('user_profile').select('username, country, joined_at, is_pro').eq('id', user.id).single(),
    supabase.from('user_collection').select(`
      id, reading_status, rating, date_read,
      edition:edition_id ( id, cover_image, edition_name, edition_type, estimated_value, original_retail_price, set_size,
        source:source_id ( name )
      ),
      book:book_id ( title, author )
    `).eq('user_id', user.id).order('date_read', { ascending: false, nullsFirst: false }),
    supabase.from('user_wishlist').select('edition_id').eq('user_id', user.id),
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
    />
  )
}

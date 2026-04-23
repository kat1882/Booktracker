import { createClient } from '@/lib/supabase-server'
import ExchangeView from './ExchangeView'

export type ForSaleEntry = {
  id: string
  asking_price: number
  condition: string | null
  notes: string | null
  photos: string[]
  user_id: string
  seller_username: string
  book: { id: string; title: string; author: string; cover_ol_id?: string } | null
  edition: { id: string; edition_name: string; edition_type: string; cover_image?: string; estimated_value?: number; source?: { name: string } } | null
}

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('user_collection')
    .select(`
      id, asking_price, condition, notes, photos, user_id,
      book:book_id(id, title, author, cover_ol_id),
      edition:edition_id(id, edition_name, edition_type, cover_image, estimated_value, source:source_id(name))
    `)
    .eq('for_sale', true)
    .not('asking_price', 'is', null)
    .order('asking_price', { ascending: false })
    .limit(60)

  const listings = (raw ?? []) as unknown as (Omit<ForSaleEntry, 'seller_username'>)[]

  // Batch-fetch seller usernames
  const sellerIds = [...new Set(listings.map(l => l.user_id))]
  const { data: profiles } = sellerIds.length
    ? await supabase.from('user_profile').select('id, username').in('id', sellerIds)
    : { data: [] }
  const usernameMap = Object.fromEntries((profiles ?? []).map((p: { id: string; username: string }) => [p.id, p.username]))

  const forSaleEntries: ForSaleEntry[] = listings.map(l => ({
    ...l,
    seller_username: usernameMap[l.user_id] ?? 'collector',
  }))

  return (
    <ExchangeView
      forSaleEntries={forSaleEntries}
      currentUserId={user?.id ?? null}
      userName={user?.email?.split('@')[0] ?? 'Guest'}
    />
  )
}

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ListingView from './ListingView'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isPro = user
    ? (await supabase.from('user_profile').select('is_pro').eq('id', user.id).single()).data?.is_pro ?? false
    : false

  const { data: listing } = await supabase
    .from('user_collection')
    .select(`
      id, asking_price, condition, notes, photos, user_id, purchase_date,
      book:book_id(id, title, author, cover_ol_id),
      edition:edition_id(id, edition_name, edition_type, cover_image, estimated_value, original_retail_price, source:source_id(name))
    `)
    .eq('id', id)
    .eq('for_sale', true)
    .single()

  if (!listing) notFound()

  const { data: sellerProfile } = await supabase
    .from('user_profile')
    .select('username, joined_at, country')
    .eq('id', (listing as any).user_id)
    .single()

  // Count seller's other active listings
  const { count: otherListings } = await supabase
    .from('user_collection')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', (listing as any).user_id)
    .eq('for_sale', true)
    .neq('id', id)

  return (
    <ListingView
      listing={listing as any}
      sellerUsername={sellerProfile?.username ?? 'collector'}
      sellerJoinedYear={sellerProfile?.joined_at ? new Date(sellerProfile.joined_at).getFullYear() : null}
      sellerCountry={sellerProfile?.country ?? null}
      sellerOtherListings={otherListings ?? 0}
      currentUserId={user?.id ?? null}
      currentUsername={user?.email?.split('@')[0] ?? null}
      isPro={isPro}
    />
  )
}

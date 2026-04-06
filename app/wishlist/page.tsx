import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import WishlistRemoveButton from './WishlistRemoveButton'

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: items } = await supabase
    .from('user_wishlist')
    .select(`
      edition_id,
      edition:edition_id (
        id, edition_name, cover_image, estimated_value, original_retail_price,
        book:book_id ( id, title, author ),
        source:source_id ( name )
      )
    `)
    .eq('user_id', user.id)
    .order('edition_id')

  const wishlist = (items ?? []) as unknown as {
    edition_id: string
    edition: {
      id: string
      edition_name: string
      cover_image?: string
      estimated_value?: number
      original_retail_price?: number
      book: { id: string; title: string; author: string }
      source?: { name: string }
    }
  }[]

  const totalValue = wishlist.reduce((sum, item) => {
    return sum + Number(item.edition?.estimated_value ?? item.edition?.original_retail_price ?? 0)
  }, 0)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Editions I Want</h1>
          <p className="text-sm text-gray-500 mt-1">
            {wishlist.length} edition{wishlist.length !== 1 ? 's' : ''}
            {totalValue > 0 && <span className="ml-2 text-pink-400">· ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} est. value</span>}
          </p>
        </div>
        <Link
          href="/browse"
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Browse Editions
        </Link>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">♡</p>
          <p className="text-gray-400 mb-2">Your wish list is empty</p>
          <p className="text-sm text-gray-600 mb-6">Browse editions and click "Want this Edition" to save them here</p>
          <Link href="/browse" className="text-violet-400 hover:text-violet-300 text-sm font-medium">
            Browse editions →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {wishlist.map(({ edition_id, edition }) => {
            const price = edition.estimated_value ?? edition.original_retail_price
            return (
              <div key={edition_id} className="group relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors">
                <Link href={`/edition/${edition.id}`}>
                  <div className="aspect-[2/3] relative bg-gray-800">
                    {edition.cover_image ? (
                      <Image
                        src={edition.cover_image}
                        alt={edition.edition_name}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs p-2 text-center">
                        {edition.edition_name}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-white leading-tight line-clamp-2">{edition.book?.title}</p>
                    {edition.source && (
                      <p className="text-xs text-violet-400 mt-0.5">{edition.source.name}</p>
                    )}
                    {price && (
                      <p className="text-xs text-emerald-400 mt-1">${Number(price).toFixed(0)}</p>
                    )}
                  </div>
                </Link>
                <WishlistRemoveButton editionId={edition_id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

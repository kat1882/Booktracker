import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 60

export default async function MarketplacePage() {
  const { data: listings } = await supabase
    .from('user_collection')
    .select(`
      id, asking_price, condition,
      edition:edition_id ( id, edition_name, cover_image, estimated_value,
        book:book_id ( title, author ),
        source:source_id ( name )
      ),
      seller:user_id ( username )
    `)
    .eq('for_sale', true)
    .order('asking_price', { ascending: true })

  const items = (listings ?? []) as unknown as {
    id: string
    asking_price: number | null
    condition: string | null
    edition: { id: string; edition_name: string; cover_image?: string; estimated_value?: number; book: { title: string; author: string }; source?: { name: string } }
    seller: { username: string }
  }[]

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Marketplace</h1>
        <p className="text-sm text-gray-500 mt-1">
          {items.length} listing{items.length !== 1 ? 's' : ''} from collectors
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🏷️</p>
          <p className="text-gray-400 mb-2">No listings yet</p>
          <p className="text-sm text-gray-600">Collectors can mark editions for sale from their shelf</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => {
            const priceDiff = item.asking_price && item.edition.estimated_value
              ? ((item.asking_price - item.edition.estimated_value) / item.edition.estimated_value) * 100
              : null
            return (
              <div key={item.id} className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl overflow-hidden transition-colors">
                <Link href={`/edition/${item.edition.id}`} className="flex gap-4 p-4">
                  <div className="w-16 h-24 relative bg-gray-800 rounded-lg overflow-hidden shrink-0">
                    {item.edition.cover_image ? (
                      <Image src={item.edition.cover_image} alt={item.edition.edition_name} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-1">
                        {item.edition.book.title}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">{item.edition.book.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.edition.book.author}</p>
                    {item.edition.source && (
                      <p className="text-xs text-violet-400 mt-1">{item.edition.source.name}</p>
                    )}
                    {item.condition && (
                      <p className="text-xs text-gray-400 mt-1">Condition: {item.condition}</p>
                    )}
                  </div>
                </Link>
                <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">
                      {item.asking_price ? `$${Number(item.asking_price).toFixed(2)}` : 'Price on request'}
                    </p>
                    {priceDiff !== null && (
                      <p className={`text-xs ${priceDiff <= 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {priceDiff <= 0 ? `${Math.abs(priceDiff).toFixed(0)}% below` : `${priceDiff.toFixed(0)}% above`} est. value
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">by <span className="text-gray-400">{item.seller?.username ?? 'collector'}</span></p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

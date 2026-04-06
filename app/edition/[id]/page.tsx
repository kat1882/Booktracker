import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import WishlistButton from './WishlistButton'
import AddEditionToShelfButton from './AddEditionToShelfButton'

const anonSupabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function EditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: edition }, supabase] = await Promise.all([
    anonSupabase.from('edition').select(`*, book:book_id (*), source:source_id (*)`).eq('id', id).single(),
    createClient(),
  ])

  if (!edition) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let isWishlisted = false
  let shelfStatus: string | null = null
  if (user) {
    const [{ data: wishlistData }, { data: shelfData }] = await Promise.all([
      supabase.from('user_wishlist').select('edition_id').eq('user_id', user.id).eq('edition_id', id).maybeSingle(),
      supabase.from('user_collection').select('reading_status').eq('user_id', user.id).eq('edition_id', id).maybeSingle(),
    ])
    isWishlisted = !!wishlistData
    shelfStatus = shelfData?.reading_status ?? null
  }

  // Other editions of the same book
  const { data: otherEditions } = await anonSupabase
    .from('edition')
    .select('id, edition_name, cover_image, edition_type, estimated_value, original_retail_price, source:source_id ( name )')
    .eq('book_id', edition.book_id)
    .neq('id', id)
    .order('edition_name')
    .limit(20)

  const book = edition.book as Record<string, string>
  const source = edition.source as Record<string, string> | null

  const details = [
    { label: 'Edition Type', value: edition.edition_type?.replace('_', ' ') },
    { label: 'Source', value: source?.name },
    { label: 'Release', value: edition.release_month },
    { label: 'Publisher', value: edition.publisher },
    { label: 'ISBN', value: edition.isbn },
    { label: 'SKU', value: edition.sku },
    { label: 'Print Run', value: edition.print_run_size ? `${edition.print_run_size} copies` : null },
    { label: 'Cover Artist', value: edition.cover_artist },
    { label: 'Edge Treatment', value: edition.edge_treatment },
    { label: 'Binding', value: edition.binding },
    { label: 'Foiling', value: edition.foiling },
    { label: 'Signature', value: edition.signature_type },
    { label: 'Extras', value: edition.extras },
    { label: 'Original Price', value: edition.original_retail_price ? `$${edition.original_retail_price}` : null },
  ].filter(d => d.value)

  const hasValue = edition.estimated_value != null
  const valueAge = edition.value_updated_at
    ? Math.floor((Date.now() - new Date(edition.value_updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const priceDiff = hasValue && edition.original_retail_price
    ? ((edition.estimated_value - edition.original_retail_price) / edition.original_retail_price) * 100
    : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/browse" className="text-sm text-gray-400 hover:text-white mb-6 inline-block transition-colors">
        ← Back to browse
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="w-full md:w-56 shrink-0">
          <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden">
            {edition.cover_image ? (
              <Image
                src={edition.cover_image}
                alt={book.title}
                fill
                className="object-cover"
                sizes="224px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">No image</div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="mb-1">
            {source && (
              <span className="text-xs text-violet-400 font-medium uppercase tracking-wider">{source.name}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{book.title}</h1>
          <p className="text-gray-400 mb-1">by {book.author}</p>
          {book.series_name && (
            <p className="text-sm text-gray-500 mb-4">{book.series_name}{book.series_number ? ` #${book.series_number}` : ''}</p>
          )}
          {book.genre && (
            <Link
              href={`/browse?genre=${book.genre}`}
              className="inline-block bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full mb-4 hover:bg-gray-700 capitalize"
            >
              {book.genre}
            </Link>
          )}

          <h2 className="text-lg font-semibold text-white mb-4">{edition.edition_name}</h2>

          {/* Shelf + wishlist buttons */}
          <div className="mb-6 flex flex-col gap-3">
            <AddEditionToShelfButton
              editionId={id}
              bookId={edition.book_id}
              initialStatus={shelfStatus}
              isLoggedIn={!!user}
            />
            <WishlistButton
              editionId={id}
              initialWishlisted={isWishlisted}
              isLoggedIn={!!user}
            />
          </div>

          {/* Price card */}
          {(hasValue || edition.original_retail_price) && (
            <div className="flex gap-3 mb-6">
              {edition.original_retail_price && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Original Retail</p>
                  <p className="text-lg font-bold text-white">${Number(edition.original_retail_price).toFixed(2)}</p>
                </div>
              )}
              {hasValue && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Est. Market Value</p>
                  <p className="text-lg font-bold text-white">${Number(edition.estimated_value).toFixed(2)}</p>
                  {priceDiff !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${priceDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceDiff >= 0 ? '▲' : '▼'} {Math.abs(priceDiff).toFixed(0)}% vs retail
                    </p>
                  )}
                  {edition.ebay_price_low && edition.ebay_price_high && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      ${Number(edition.ebay_price_low).toFixed(0)}–${Number(edition.ebay_price_high).toFixed(0)}
                      {edition.ebay_sold_count ? ` · ${edition.ebay_sold_count} sales` : ''}
                    </p>
                  )}
                  {valueAge !== null && (
                    <p className="text-xs text-gray-700 mt-0.5">Updated {valueAge === 0 ? 'today' : `${valueAge}d ago`}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detail grid */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
            {details.map(d => (
              <div key={d.label}>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">{d.label}</dt>
                <dd className="text-sm text-gray-200 capitalize">{d.value}</dd>
              </div>
            ))}
          </dl>

          {/* Notes */}
          {edition.notes && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-400 leading-relaxed">
              {edition.notes}
            </div>
          )}
        </div>
      </div>

      {/* Other editions of this book */}
      {otherEditions && otherEditions.length > 0 && (
        <div className="mt-10 border-t border-gray-800 pt-8">
          <h2 className="text-lg font-bold text-white mb-1">More editions of {book.title}</h2>
          <p className="text-sm text-gray-500 mb-5">{otherEditions.length} other special edition{otherEditions.length !== 1 ? 's' : ''} in the database</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {otherEditions.map((ed) => {
              const edSource = ed.source as unknown as { name: string } | null
              const edPrice = ed.estimated_value ?? ed.original_retail_price
              return (
                <Link
                  key={ed.id}
                  href={`/edition/${ed.id}`}
                  className="group bg-gray-900 border border-gray-800 hover:border-violet-500 rounded-xl overflow-hidden transition-colors"
                >
                  <div className="aspect-[2/3] relative bg-gray-800">
                    {ed.cover_image ? (
                      <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="200px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-2">{ed.edition_name}</div>
                    )}
                  </div>
                  <div className="p-3">
                    {edSource && <p className="text-xs text-violet-400 font-medium">{edSource.name}</p>}
                    <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{ed.edition_name}</p>
                    {edPrice && <p className="text-xs text-emerald-400 mt-1">${Number(edPrice).toFixed(0)}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

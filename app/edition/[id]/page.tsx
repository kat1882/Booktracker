import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import WishlistButton from './WishlistButton'
import AddEditionToShelfButton from './AddEditionToShelfButton'
import EditionReviews from './EditionReviews'
import PriceChart from './PriceChart'
import AddToListButton from './AddToListButton'

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

  const book = edition.book as Record<string, string>
  const source = edition.source as Record<string, string> | null

  // Fetch all related data in parallel
  const [
    { data: priceHistory },
    { data: reviewsRaw },
    { data: otherEditions },
    { data: sameSource },
    { data: sameType },
    { data: sameAuthor },
  ] = await Promise.all([
    anonSupabase
      .from('edition_price_history')
      .select('price, recorded_at')
      .eq('edition_id', id)
      .order('recorded_at', { ascending: true })
      .limit(100),

    anonSupabase
      .from('edition_review')
      .select('id, body, overall_rating, physical_quality, extras_quality, value_for_money, created_at, user_id')
      .eq('edition_id', id)
      .order('created_at', { ascending: false })
      .limit(50),

    // Other editions of same book
    anonSupabase
      .from('edition')
      .select('id, edition_name, cover_image, edition_type, estimated_value, original_retail_price, source:source_id(name)')
      .eq('book_id', edition.book_id)
      .neq('id', id)
      .order('edition_name')
      .limit(20),

    // Similar: same source (different books)
    source?.id ? anonSupabase
      .from('edition')
      .select('id, edition_name, cover_image, estimated_value, book:book_id(title, author)')
      .eq('source_id', source.id)
      .neq('book_id', edition.book_id)
      .not('cover_image', 'is', null)
      .limit(8) : Promise.resolve({ data: [] }),

    // Similar: same edition type
    edition.edition_type ? anonSupabase
      .from('edition')
      .select('id, edition_name, cover_image, estimated_value, book:book_id(title, author), source:source_id(name)')
      .eq('edition_type', edition.edition_type)
      .neq('book_id', edition.book_id)
      .not('cover_image', 'is', null)
      .limit(8) : Promise.resolve({ data: [] }),

    // Similar: same author (different books)
    book.author ? anonSupabase
      .from('book')
      .select('id, title, edition:edition(id, cover_image, edition_name, estimated_value)')
      .eq('author', book.author)
      .neq('id', edition.book_id)
      .limit(8) : Promise.resolve({ data: [] }),
  ])

  const reviewUserIds = (reviewsRaw ?? []).map(r => r.user_id)
  const { data: reviewProfiles } = reviewUserIds.length > 0
    ? await anonSupabase.from('user_profile').select('id, username').in('id', reviewUserIds)
    : { data: [] }
  const profileMap = Object.fromEntries((reviewProfiles ?? []).map(p => [p.id, p.username]))
  const reviews = (reviewsRaw ?? []).map(r => ({ ...r, username: profileMap[r.user_id] ?? 'Unknown' }))

  const details = [
    { label: 'Edition Type', value: edition.edition_type?.replace(/_/g, ' ') },
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

  const marketPrice = edition.price_override ?? edition.estimated_value
  const hasValue = marketPrice != null
  const isOverride = edition.price_override != null
  const valueAge = !isOverride && edition.value_updated_at
    ? Math.floor((Date.now() - new Date(edition.value_updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const priceDiff = hasValue && edition.original_retail_price
    ? ((marketPrice - edition.original_retail_price) / edition.original_retail_price) * 100
    : null

  // Build "same author" editions list from the book join
  const authorEditions = (sameAuthor ?? []).flatMap((bk: Record<string, unknown>) => {
    const eds = bk.edition as unknown as { id: string; cover_image: string | null; edition_name: string; estimated_value: number | null }[]
    return (eds ?? []).slice(0, 1).map(e => ({ ...e, bookTitle: bk.title as string }))
  }).slice(0, 8)

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
          <Link href={`/book/${edition.book_id}`} className="text-2xl font-bold text-white mb-1 hover:text-violet-300 transition-colors block">
            {book.title}
          </Link>
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

          {/* Shelf + wishlist + list buttons */}
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
            <AddToListButton editionId={id} isLoggedIn={!!user} />
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
                <div className={`bg-gray-900 border rounded-xl px-4 py-3 text-center ${isOverride ? 'border-amber-700/60' : 'border-gray-800'}`}>
                  <p className="text-xs text-gray-500 mb-1">
                    {isOverride ? '📌 Market Value' : 'Est. Market Value'}
                  </p>
                  <p className="text-lg font-bold text-white">${Number(marketPrice).toFixed(2)}</p>
                  {priceDiff !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${priceDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceDiff >= 0 ? '▲' : '▼'} {Math.abs(priceDiff).toFixed(0)}% vs retail
                    </p>
                  )}
                  {!isOverride && edition.ebay_price_low && edition.ebay_price_high && (
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

          {/* Price history chart */}
          {priceHistory && priceHistory.length > 0 && (
            <div className="mb-6">
              <PriceChart points={priceHistory.map(p => ({ price: Number(p.price), recorded_at: p.recorded_at }))} />
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

      {/* Reviews */}
      <EditionReviews editionId={id} isLoggedIn={!!user} initialReviews={reviews} />

      {/* Other editions of this book */}
      {otherEditions && otherEditions.length > 0 && (
        <div className="mt-10 border-t border-gray-800 pt-8">
          <h2 className="text-lg font-bold text-white mb-1">More editions of {book.title}</h2>
          <p className="text-sm text-gray-500 mb-5">
            {otherEditions.length} other special edition{otherEditions.length !== 1 ? 's' : ''} · Select one to compare
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {otherEditions.map((ed) => {
              const edSource = ed.source as unknown as { name: string } | null
              const edPrice = ed.estimated_value ?? ed.original_retail_price
              return (
                <div key={ed.id} className="group bg-gray-900 border border-gray-800 hover:border-violet-500 rounded-xl overflow-hidden transition-colors flex flex-col">
                  <Link href={`/edition/${ed.id}`} className="block">
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
                  {/* Compare link */}
                  <div className="px-3 pb-3 mt-auto">
                    <Link
                      href={`/compare?a=${id}&b=${ed.id}`}
                      className="block w-full text-center text-xs text-gray-500 hover:text-violet-400 border border-gray-800 hover:border-violet-600 rounded-lg py-1.5 transition-colors"
                    >
                      ⚖️ Compare
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Similar editions */}
      {(sameSource?.length || sameType?.length || authorEditions.length) ? (
        <div className="mt-10 border-t border-gray-800 pt-8 space-y-10">
          <h2 className="text-lg font-bold text-white -mb-4">You might also like</h2>

          {/* Same source */}
          {source && sameSource && sameSource.length > 0 && (
            <SimilarRow
              label={`More from ${source.name}`}
              editions={sameSource.map(e => ({
                id: e.id,
                cover_image: e.cover_image,
                edition_name: e.edition_name,
                estimated_value: e.estimated_value,
                subtitle: (e.book as unknown as { title: string; author: string })?.title ?? '',
              }))}
            />
          )}

          {/* Same edition type */}
          {edition.edition_type && sameType && sameType.length > 0 && (
            <SimilarRow
              label={`More ${edition.edition_type.replace(/_/g, ' ')} editions`}
              editions={sameType.map(e => ({
                id: e.id,
                cover_image: e.cover_image,
                edition_name: e.edition_name,
                estimated_value: e.estimated_value,
                subtitle: (e.book as unknown as { title: string })?.title ?? '',
                tag: (e.source as unknown as { name: string })?.name,
              }))}
            />
          )}

          {/* Same author */}
          {authorEditions.length > 0 && (
            <SimilarRow
              label={`More by ${book.author}`}
              editions={authorEditions.map(e => ({
                id: e.id,
                cover_image: e.cover_image,
                edition_name: e.edition_name,
                estimated_value: e.estimated_value,
                subtitle: e.bookTitle,
              }))}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

function SimilarRow({
  label,
  editions,
}: {
  label: string
  editions: {
    id: string
    cover_image: string | null
    edition_name: string
    estimated_value: number | null
    subtitle?: string
    tag?: string
  }[]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{label}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {editions.map(e => (
          <Link
            key={e.id}
            href={`/edition/${e.id}`}
            className="group bg-gray-900 border border-gray-800 hover:border-violet-500 rounded-xl overflow-hidden transition-colors"
          >
            <div className="aspect-[2/3] relative bg-gray-800">
              {e.cover_image ? (
                <Image
                  src={e.cover_image}
                  alt={e.edition_name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="150px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-2xl">📚</div>
              )}
            </div>
            <div className="p-2">
              {e.tag && <p className="text-xs text-violet-400 font-medium leading-tight truncate">{e.tag}</p>}
              {e.subtitle && <p className="text-xs text-gray-400 leading-tight line-clamp-2 mt-0.5">{e.subtitle}</p>}
              {e.estimated_value && (
                <p className="text-xs text-emerald-400 mt-1">${Number(e.estimated_value).toFixed(0)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

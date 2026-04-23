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
import EditionGallery from './EditionGallery'
import OwnedButton from './OwnedButton'

export const dynamic = 'force-dynamic'

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
  let isOwned = false
  if (user) {
    const [{ data: wishlistData }, { data: shelfData }] = await Promise.all([
      supabase.from('user_wishlist').select('edition_id').eq('user_id', user.id).eq('edition_id', id).maybeSingle(),
      supabase.from('user_collection').select('reading_status, owned').eq('user_id', user.id).eq('edition_id', id).maybeSingle(),
    ])
    isWishlisted = !!wishlistData
    shelfStatus = shelfData?.reading_status ?? null
    isOwned = shelfData?.owned ?? false
  }

  const book = edition.book as Record<string, string>
  const source = edition.source as Record<string, string> | null

  const [
    { data: priceHistory },
    { data: reviewsRaw },
    { data: otherEditions },
    { data: sameSource },
    { data: galleryImages },
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

    anonSupabase
      .from('edition')
      .select('id, edition_name, cover_image, edition_type, estimated_value, original_retail_price, set_size, source:source_id(name)')
      .eq('book_id', edition.book_id)
      .neq('id', id)
      .order('edition_name')
      .limit(20),

    source?.id ? anonSupabase
      .from('edition')
      .select('id, edition_name, cover_image, estimated_value, book:book_id(title, author)')
      .eq('source_id', source.id)
      .neq('book_id', edition.book_id)
      .not('cover_image', 'is', null)
      .limit(12) : Promise.resolve({ data: [] }),

    anonSupabase
      .from('edition_image')
      .select('id, image_url, image_type, is_primary, sort_order, uploaded_by')
      .eq('edition_id', id)
      .order('sort_order', { ascending: true }),
  ])

  const reviewUserIds = (reviewsRaw ?? []).map(r => r.user_id)
  const { data: reviewProfiles } = reviewUserIds.length > 0
    ? await anonSupabase.from('user_profile').select('id, username').in('id', reviewUserIds)
    : { data: [] }
  const profileMap = Object.fromEntries((reviewProfiles ?? []).map(p => [p.id, p.username]))
  const reviews = (reviewsRaw ?? []).map(r => ({ ...r, username: profileMap[r.user_id] ?? 'Unknown' }))

  const marketPrice = edition.price_override ?? edition.estimated_value
  const setSize = edition.set_size ?? 1
  const hasValue = marketPrice != null
  const isOverride = edition.price_override != null
  const valueAge = !isOverride && edition.value_updated_at
    ? Math.floor((Date.now() - new Date(edition.value_updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const perBookValue = hasValue ? marketPrice / setSize : null
  const priceDiff = perBookValue !== null && edition.original_retail_price
    ? ((perBookValue - edition.original_retail_price) / edition.original_retail_price) * 100
    : null

  const specItems = [
    { icon: 'menu_book', label: 'Binding', value: edition.binding },
    { icon: 'palette', label: 'Cover Artist', value: edition.cover_artist },
    { icon: 'auto_awesome', label: 'Foiling', value: edition.foiling },
    { icon: 'format_quote', label: 'Signature', value: edition.signature_type },
    { icon: 'texture', label: 'Edge Treatment', value: edition.edge_treatment },
    { icon: 'print', label: 'Print Run', value: edition.print_run_size ? `${edition.print_run_size.toLocaleString()} copies` : null },
    { icon: 'tag', label: 'ISBN', value: edition.isbn },
    { icon: 'local_offer', label: 'SKU', value: edition.sku },
    { icon: 'card_giftcard', label: 'Extras', value: edition.extras },
    { icon: 'publisher', label: 'Publisher', value: edition.publisher },
  ].filter(s => s.value)

  const pubYear = book.original_pub_date ? new Date(book.original_pub_date).getFullYear() : null

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/browse" className="hover:text-slate-300 transition-colors">Browse</Link>
          <span>/</span>
          <Link href={`/browse?genre=${book.genre ?? ''}`} className="hover:text-slate-300 transition-colors capitalize">{book.genre ?? 'Books'}</Link>
          <span>/</span>
          <span className="text-slate-400 truncate">{book.title}</span>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* Cover — sticky on desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start w-full lg:w-72 shrink-0">
            <div className="group relative mx-auto w-56 lg:w-full">
              {/* Glow behind cover */}
              {edition.cover_image && (
                <div className="absolute inset-0 rounded-2xl blur-2xl opacity-30 scale-90 translate-y-4 bg-violet-600 pointer-events-none" />
              )}
              <div className="relative rotate-1 group-hover:rotate-0 transition-transform duration-500 ease-out shadow-2xl rounded-xl overflow-hidden aspect-[2/3]">
                <EditionGallery
                  editionId={id}
                  coverImage={edition.cover_image}
                  initialImages={(galleryImages ?? []) as any}
                  isLoggedIn={!!user}
                  currentUserId={user?.id ?? null}
                />
              </div>
            </div>

            {/* Pricing source pills under cover on desktop */}
            {hasValue && (
              <div className="hidden lg:flex flex-wrap gap-2 mt-5 justify-center">
                {edition.mercari_sold_count && (
                  <span className="text-[11px] bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full">
                    Mercari · {edition.mercari_sold_count} sales
                  </span>
                )}
                {edition.ebay_sold_count && (
                  <span className="text-[11px] bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full">
                    eBay · {edition.ebay_sold_count} sales
                  </span>
                )}
                {valueAge !== null && (
                  <span className="text-[11px] bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full">
                    Updated {valueAge === 0 ? 'today' : `${valueAge}d ago`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right — info panel */}
          <div className="flex-1 min-w-0">
            {/* Source + type badge */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {source && (
                <span className="bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                  {source.name}
                </span>
              )}
              {edition.edition_type && (
                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-xs px-3 py-1 rounded-full capitalize">
                  {edition.edition_type.replace(/_/g, ' ')}
                </span>
              )}
              {setSize > 1 && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-3 py-1 rounded-full">
                  {setSize}-book set
                </span>
              )}
              {book.genre && (
                <Link
                  href={`/browse?genre=${book.genre}`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-300 border border-slate-700 text-xs px-3 py-1 rounded-full capitalize transition-colors"
                >
                  {book.genre}
                </Link>
              )}
            </div>

            {/* Title + edition name */}
            <Link href={`/book/${edition.book_id}`} className="group block mb-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white group-hover:text-violet-300 transition-colors leading-tight">
                {book.title}
              </h1>
            </Link>
            <p className="text-violet-400 font-semibold text-lg mb-1">{edition.edition_name}</p>
            <div className="flex items-center gap-3 text-slate-400 text-sm mb-2">
              <span>by <span className="text-slate-300">{book.author}</span></span>
              {pubYear && <><span className="text-slate-700">·</span><span>{pubYear}</span></>}
              {book.series_name && (
                <><span className="text-slate-700">·</span><span className="truncate">{book.series_name}{book.series_number ? ` #${book.series_number}` : ''}</span></>
              )}
            </div>

            {/* Value Tracker */}
            {(hasValue || edition.original_retail_price) && (
              <div className="mt-5 mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Value Tracker</p>
                <div className="flex items-end gap-5 flex-wrap">
                  {hasValue && (
                    <div>
                      <p className="text-5xl font-black text-white tabular-nums leading-none">
                        ${Number(perBookValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {setSize > 1
                          ? `Per-book value (vault) · Set price: $${Number(marketPrice).toFixed(0)} ÷ ${setSize}`
                          : isOverride ? 'Market value (pinned)' : 'Est. market value'}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {edition.original_retail_price && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Retail</span>
                        <span className="text-sm text-slate-300 font-medium">${Number(edition.original_retail_price).toFixed(2)}</span>
                      </div>
                    )}
                    {priceDiff !== null && edition.original_retail_price && (
                      <div className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-0.5 rounded-full ${priceDiff >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        <span>{priceDiff >= 0 ? '▲' : '▼'}</span>
                        <span>{Math.abs(priceDiff).toFixed(0)}% vs retail</span>
                      </div>
                    )}
                    {edition.mercari_price_low && edition.mercari_price_high && (
                      <p className="text-xs text-slate-500">
                        Mercari range: ${Number(edition.mercari_price_low).toFixed(0)}–${Number(edition.mercari_price_high).toFixed(0)}
                      </p>
                    )}
                    {edition.ebay_price_low && edition.ebay_price_high && (
                      <p className="text-xs text-slate-500">
                        eBay range: ${Number(edition.ebay_price_low).toFixed(0)}–${Number(edition.ebay_price_high).toFixed(0)}
                      </p>
                    )}
                  </div>
                </div>

                {priceHistory && priceHistory.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <PriceChart points={priceHistory.map(p => ({ price: Number(p.price), recorded_at: p.recorded_at }))} />
                  </div>
                )}
              </div>
            )}

            {/* Action Hub — 2×2 grid */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Your Collection</p>
              <div className="grid grid-cols-2 gap-3">
                <OwnedButton editionId={id} bookId={edition.book_id} initialOwned={isOwned} isLoggedIn={!!user} />
                <WishlistButton editionId={id} initialWishlisted={isWishlisted} isLoggedIn={!!user} />
              </div>
              <div className="mt-3">
                <AddEditionToShelfButton
                  editionId={id}
                  bookId={edition.book_id}
                  initialStatus={shelfStatus}
                  isLoggedIn={!!user}
                />
              </div>
              {user && (
                <div className="mt-2">
                  <AddToListButton editionId={id} isLoggedIn={!!user} />
                </div>
              )}
            </div>

            {/* Release info */}
            {edition.release_month && (
              <Link
                href={`/boxes?month=${encodeURIComponent(edition.release_month)}`}
                className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors mb-4"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                View all {edition.release_month} editions →
              </Link>
            )}

            {/* Notes */}
            {edition.notes && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400 leading-relaxed mb-4">
                {edition.notes}
              </div>
            )}
          </div>
        </div>

        {/* Technical Specs Bento */}
        {specItems.length > 0 && (
          <div className="mt-10 border-t border-slate-800 pt-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Technical Specs</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {specItems.map(spec => (
                <div key={spec.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-colors">
                  <p className="text-xs text-slate-500 mb-1">{spec.label}</p>
                  <p className="text-sm text-slate-200 font-medium capitalize">{spec.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other editions of this book — horizontal scroll */}
        {otherEditions && otherEditions.length > 0 && (
          <div className="mt-10 border-t border-slate-800 pt-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">More editions of {book.title}</h2>
                <p className="text-sm text-slate-500">{otherEditions.length} other special edition{otherEditions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
              {otherEditions.map((ed) => {
                const edSource = ed.source as unknown as { name: string } | null
                const edRaw = ed.estimated_value ?? ed.original_retail_price
                const edPrice = edRaw != null ? edRaw / ((ed as any).set_size ?? 1) : null
                return (
                  <div key={ed.id} className="shrink-0 w-40 group">
                    <Link href={`/edition/${ed.id}`} className="block">
                      <div className="aspect-[2/3] relative bg-slate-800 rounded-xl overflow-hidden mb-2 shadow-lg group-hover:-translate-y-1.5 transition-transform duration-300">
                        {ed.cover_image ? (
                          <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover" sizes="160px" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs text-center p-2">{ed.edition_name}</div>
                        )}
                        {edPrice && (
                          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                            ${Number(edPrice).toFixed(0)}
                          </div>
                        )}
                      </div>
                      {edSource && <p className="text-xs text-violet-400 font-medium truncate">{edSource.name}</p>}
                      <p className="text-xs text-slate-300 truncate mt-0.5">{ed.edition_name}</p>
                    </Link>
                    <Link
                      href={`/compare?a=${id}&b=${ed.id}`}
                      className="block mt-1.5 text-center text-[11px] text-slate-600 hover:text-violet-400 border border-slate-800 hover:border-violet-600 rounded-lg py-1 transition-colors"
                    >
                      Compare
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* More from same source — horizontal scroll */}
        {sameSource && sameSource.length > 0 && source && (
          <div className="mt-10 border-t border-slate-800 pt-8">
            <h2 className="text-lg font-bold text-white mb-1">More from {source.name}</h2>
            <p className="text-sm text-slate-500 mb-5">Other special editions from this subscription box</p>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {sameSource.map((e) => {
                const bk = e.book as unknown as { title: string; author: string } | null
                return (
                  <Link key={e.id} href={`/edition/${e.id}`} className="shrink-0 w-36 group block">
                    <div className="aspect-[2/3] relative bg-slate-800 rounded-xl overflow-hidden mb-2 shadow-lg group-hover:-translate-y-1.5 transition-transform duration-300">
                      {e.cover_image ? (
                        <Image src={e.cover_image} alt={e.edition_name} fill className="object-cover" sizes="144px" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-2xl">📚</div>
                      )}
                      {e.estimated_value && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                          ${Number(e.estimated_value).toFixed(0)}
                        </div>
                      )}
                    </div>
                    {bk && <p className="text-xs text-slate-400 leading-tight line-clamp-2">{bk.title}</p>}
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{e.edition_name}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Reviews */}
        <EditionReviews editionId={id} isLoggedIn={!!user} initialReviews={reviews} />
      </div>
    </div>
  )
}

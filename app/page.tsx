import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function Home() {
  const [
    { data: featuredEditions },
    { data: recentEditions },
    { count: editionCount },
    { count: bookCount },
    { data: sources },
    { data: trending },
  ] = await Promise.all([
    // Hero covers — high-quality images, prioritise Illumicrate/OwlCrate
    supabase.from('edition').select('id, edition_name, cover_image, book:book_id(title, author), source:source_id(name)')
      .not('cover_image', 'is', null)
      .in('edition_type', ['subscription_box', 'signed', 'illustrated'])
      .order('id', { ascending: false })
      .limit(18),

    // Recently added
    supabase.from('edition').select('id, edition_name, cover_image, estimated_value, original_retail_price, book:book_id(title, author), source:source_id(name)')
      .not('cover_image', 'is', null)
      .order('id', { ascending: false })
      .limit(8),

    // Stats
    supabase.from('edition').select('*', { count: 'exact', head: true }),
    supabase.from('book').select('*', { count: 'exact', head: true }),

    // Sources with counts
    supabase.from('source').select('id, name, type').order('name'),

    // Trending — most collected
    supabase.from('user_collection').select('edition_id').limit(500),
  ])

  // Build trending edition IDs
  const trendingCounts: Record<string, number> = {}
  for (const row of trending ?? []) {
    if (row.edition_id) trendingCounts[row.edition_id] = (trendingCounts[row.edition_id] ?? 0) + 1
  }
  const topIds = Object.entries(trendingCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
  const { data: trendingEditions } = topIds.length > 0
    ? await supabase.from('edition').select('id, edition_name, cover_image, estimated_value, book:book_id(title, author), source:source_id(name)')
        .in('id', topIds).not('cover_image', 'is', null)
    : { data: [] }

  const covers = (featuredEditions ?? []).filter(e => e.cover_image)

  return (
    <div className="min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-gray-800 min-h-[600px] flex items-center">
        {/* Blurred cover mosaic background */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-0 opacity-20 pointer-events-none">
          {covers.slice(0, 18).map((e, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={e.cover_image!} alt="" fill className="object-cover scale-110" sizes="200px" unoptimized />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/90 to-gray-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/40" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-violet-900/40 border border-violet-700/50 text-violet-300 text-xs px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              {editionCount?.toLocaleString()} special editions catalogued
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
              The home for<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                serious book collectors
              </span>
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg">
              Track subscription box exclusives, signed editions, and illustrated variants. See market values, write edition reviews, and discover what collectors are buying.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm">
                Start collecting free
              </Link>
              <Link href="/browse" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm">
                Browse editions
              </Link>
            </div>

            <p className="text-xs text-gray-600 mt-4">Free forever · No credit card required</p>
          </div>

          {/* Right: floating cover stack */}
          <div className="hidden md:grid grid-cols-3 gap-3">
            {covers.slice(0, 9).map((e, i) => (
              <Link key={e.id} href={`/edition/${e.id}`} className="group">
                <div
                  className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-violet-900/40"
                  style={{ transform: `rotate(${(i % 3 - 1) * 1.5}deg)` }}
                >
                  <Image src={e.cover_image!} alt={(e.book as {title:string}|null)?.title ?? ''} fill className="object-cover" sizes="150px" unoptimized />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-b border-gray-800 bg-gray-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: editionCount?.toLocaleString() ?? '0', label: 'Special editions' },
            { value: bookCount?.toLocaleString() ?? '0', label: 'Books tracked' },
            { value: (sources ?? []).length.toString(), label: 'Sources' },
            { value: 'Free', label: 'Always' },
          ].map(s => (
            <div key={s.label} className="px-6">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRENDING ── */}
      {(trendingEditions ?? []).length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Trending in collections</h2>
              <p className="text-sm text-gray-500 mt-0.5">Most added editions right now</p>
            </div>
            <Link href="/trending" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">See all →</Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {(trendingEditions ?? []).map(ed => {
              const book = ed.book as {title:string;author:string}|null
              const price = ed.estimated_value
              return (
                <Link key={ed.id} href={`/edition/${ed.id}`} className="group">
                  <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden mb-2 shadow-lg group-hover:shadow-violet-900/30 transition-shadow">
                    {ed.cover_image && <Image src={ed.cover_image} alt={book?.title??''} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="150px" unoptimized />}
                  </div>
                  <p className="text-xs text-gray-300 truncate font-medium">{book?.title}</p>
                  {price && <p className="text-xs text-emerald-500 mt-0.5">${Number(price).toFixed(0)}</p>}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── FEATURES ── */}
      <section className="border-y border-gray-800 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-xl font-bold text-white text-center mb-12">Built for collectors, not casual readers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📊',
                title: 'Real market values',
                desc: 'See what editions are actually selling for on the secondary market, updated regularly from sold listings.',
              },
              {
                icon: '📸',
                title: 'Scan any barcode',
                desc: 'Point your camera at any book barcode. We\'ll find the edition in our database or look it up from 40M+ titles.',
              },
              {
                icon: '⭐',
                title: 'Edition reviews',
                desc: 'Rate paper quality, extras, and value for money separately from the book itself. Finally, reviews that matter to collectors.',
              },
              {
                icon: '📈',
                title: 'Collection dashboard',
                desc: 'Track your total collection value over time. See which editions have gained or lost value since you bought them.',
              },
              {
                icon: '📋',
                title: 'Custom lists',
                desc: 'Create lists like "Signed editions I own" or "Gift ideas" beyond the default shelves.',
              },
              {
                icon: '📦',
                title: 'Subscription boxes',
                desc: 'Illumicrate, OwlCrate, FairyLoot, Goldsboro — every exclusive edition documented with full variant details.',
              },
            ].map(f => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENTLY ADDED ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Recently added</h2>
            <p className="text-sm text-gray-500 mt-0.5">Latest editions in the database</p>
          </div>
          <Link href="/browse" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">Browse all {editionCount?.toLocaleString()} →</Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {(recentEditions ?? []).map(ed => {
            const book = ed.book as {title:string;author:string}|null
            return (
              <Link key={ed.id} href={`/edition/${ed.id}`} className="group">
                <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden shadow-md group-hover:shadow-violet-900/30 transition-shadow">
                  {ed.cover_image && <Image src={ed.cover_image} alt={book?.title??''} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="100px" unoptimized />}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── SOURCES ── */}
      <section className="border-t border-gray-800 bg-gray-900/30">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider">Sources tracked</p>
          <div className="flex flex-wrap justify-center gap-3">
            {(sources ?? []).map(s => (
              <Link
                key={s.id}
                href={`/browse?source=${encodeURIComponent(s.name)}`}
                className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-violet-600 text-gray-400 hover:text-violet-300 text-sm rounded-full transition-colors"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-gray-800">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to catalogue your collection?</h2>
          <p className="text-gray-400 mb-8">Join collectors already tracking their special editions. Free, always.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
              Create free account
            </Link>
            <Link href="/submit" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white font-medium px-8 py-3 rounded-xl transition-colors">
              Submit an edition
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

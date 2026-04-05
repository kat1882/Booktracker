import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()

  // Recent editions with covers for the hero grid
  const { data: recentEditions } = await supabase
    .from('edition')
    .select('id, edition_name, cover_image, book:book_id(title, author)')
    .not('cover_image', 'is', null)
    .order('id', { ascending: false })
    .limit(12)

  // Stats
  const { count: editionCount } = await supabase
    .from('edition')
    .select('*', { count: 'exact', head: true })

  const { count: bookCount } = await supabase
    .from('book')
    .select('*', { count: 'exact', head: true })

  const { count: sourceCount } = await supabase
    .from('source')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-800">
        {/* Background cover mosaic */}
        <div className="absolute inset-0 flex flex-wrap opacity-10 pointer-events-none">
          {(recentEditions ?? []).map((e, i) => e.cover_image && (
            <div key={i} className="relative" style={{ width: '8.33%', aspectRatio: '2/3' }}>
              <Image src={e.cover_image} alt="" fill className="object-cover" sizes="100px" unoptimized />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-gray-950/80 to-gray-950" />

        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-900/40 border border-violet-700/50 text-violet-300 text-xs px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
            The only database for special edition books
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-5">
            Track every<br />
            <span className="text-violet-400">special edition</span> you own
          </h1>

          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Subscription box exclusives, signed editions, illustrated variants — catalogued and searchable in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/browse"
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Browse Editions
            </Link>
            <Link
              href="/search"
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Search Books
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-3 divide-x divide-gray-800 text-center">
          <div className="px-4">
            <p className="text-3xl font-bold text-white">{editionCount ?? 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">Special editions</p>
          </div>
          <div className="px-4">
            <p className="text-3xl font-bold text-white">{bookCount ?? 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">Books catalogued</p>
          </div>
          <div className="px-4">
            <p className="text-3xl font-bold text-white">{sourceCount ?? 0}+</p>
            <p className="text-sm text-gray-500 mt-0.5">Sources tracked</p>
          </div>
        </div>
      </section>

      {/* Recent editions grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Recently Added</h2>
            <p className="text-gray-500 text-sm mt-1">Latest special editions in the database</p>
          </div>
          <Link href="/browse" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {(recentEditions ?? []).map(edition => {
            const book = edition.book as unknown as { title: string; author: string } | null
            return (
              <Link
                key={edition.id}
                href={`/edition/${edition.id}`}
                className="group"
              >
                <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden mb-2 shadow-md group-hover:shadow-violet-900/30 group-hover:shadow-lg transition-shadow">
                  {edition.cover_image ? (
                    <Image
                      src={edition.cover_image}
                      alt={book?.title ?? ''}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="150px"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-2">{book?.title}</div>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate group-hover:text-white transition-colors">{book?.title}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-gray-800 bg-gray-900/30">
        <div className="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="w-10 h-10 bg-violet-900/50 border border-violet-800 rounded-xl flex items-center justify-center text-xl mb-4">📦</div>
            <h3 className="font-semibold text-white mb-2">Subscription Boxes</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Illumicrate, FairyLoot, OwlCrate and more — every exclusive edition documented.</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-violet-900/50 border border-violet-800 rounded-xl flex items-center justify-center text-xl mb-4">✍️</div>
            <h3 className="font-semibold text-white mb-2">Signed &amp; Illustrated</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Track signed copies, illustrated editions, and collector variants with full details.</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-violet-900/50 border border-violet-800 rounded-xl flex items-center justify-center text-xl mb-4">🔍</div>
            <h3 className="font-semibold text-white mb-2">Any Book, Any Edition</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Search 40 million books via Google Books and add any title to your shelves.</p>
          </div>
        </div>
      </section>

      {/* Submit CTA */}
      <section className="border-t border-gray-800">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Know an edition we&apos;re missing?</h2>
          <p className="text-gray-400 text-sm mb-6">The database grows through community contributions. Submit a special edition and we&apos;ll add it after review.</p>
          <Link
            href="/submit"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Submit an Edition
          </Link>
        </div>
      </section>
    </div>
  )
}

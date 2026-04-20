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
    supabase.from('edition').select('id, edition_name, cover_image, book:book_id(title, author), source:source_id(name)')
      .not('cover_image', 'is', null)
      .in('edition_type', ['subscription_box', 'signed', 'illustrated'])
      .order('id', { ascending: false })
      .limit(18),
    supabase.from('edition').select('id, edition_name, cover_image, estimated_value, original_retail_price, book:book_id(title, author), source:source_id(name)')
      .not('cover_image', 'is', null)
      .order('id', { ascending: false })
      .limit(8),
    supabase.from('edition').select('*', { count: 'exact', head: true }),
    supabase.from('book').select('*', { count: 'exact', head: true }),
    supabase.from('source').select('id, name, type').order('name'),
    supabase.from('user_collection').select('edition_id').limit(500),
  ])

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
      <section className="relative min-h-[800px] flex items-center overflow-hidden px-6">
        {/* Blurred cover mosaic background */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-0 opacity-10 pointer-events-none">
          {covers.slice(0, 18).map((e, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={e.cover_image!} alt="" fill className="object-cover scale-110" sizes="200px" unoptimized />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e131f] via-[#0e131f]/95 to-[#0e131f]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e131f] via-transparent to-[#0e131f]/40" />
        {/* Purple glow */}
        <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
          {/* Left: copy */}
          <div className="z-10">
            <div className="inline-flex items-center gap-2 bg-violet-900/30 border border-violet-700/40 text-violet-300 text-xs px-4 py-1.5 rounded-full mb-8 font-mono uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              {editionCount?.toLocaleString()} editions catalogued
            </div>

            <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-white mb-8 leading-[0.95]">
              Every book has a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">story.</span>
              <br />Know what yours is worth.
            </h1>

            <p className="text-xl text-slate-400 max-w-lg mb-10 leading-relaxed">
              The modern companion for every book collector. Organize your library, track the value of special editions, and discover what collectors are buying.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition-all shadow-lg shadow-violet-900/30 text-center">
                Catalog Your Library
              </Link>
              <Link href="/browse" className="bg-slate-800/80 border border-slate-700/50 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-700/80 transition-colors text-center">
                Browse Editions
              </Link>
            </div>
            <p className="text-xs text-slate-600 mt-4 font-mono">No credit card required · {bookCount?.toLocaleString()} books tracked</p>
          </div>

          {/* Right: cover grid + floating stat */}
          <div className="hidden lg:block relative">
            <div className="absolute -inset-4 bg-violet-600/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative grid grid-cols-3 gap-3">
              {covers.slice(0, 9).map((e, i) => (
                <Link key={e.id} href={`/edition/${e.id}`} className="group">
                  <div
                    className="aspect-[2/3] relative bg-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-violet-900/40"
                    style={{ transform: `rotate(${(i % 3 - 1) * 1.5}deg)` }}
                  >
                    <Image src={e.cover_image!} alt={(e.book as unknown as {title:string}|null)?.title ?? ''} fill className="object-cover" sizes="150px" unoptimized />
                  </div>
                </Link>
              ))}
            </div>
            {/* Floating value card */}
            <div className="absolute -bottom-8 -left-8 bg-slate-900 border border-slate-700/50 p-5 rounded-xl shadow-2xl min-w-[200px]">
              <p className="font-mono text-xs text-violet-400 mb-1.5 uppercase tracking-widest">Collection Value</p>
              <p className="text-3xl font-bold font-mono tracking-tighter text-white">$1,240</p>
              <p className="text-emerald-400 text-sm font-mono mt-1">↑ +8.2% this year</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-slate-800/50 bg-slate-900/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-10 text-center">
          {[
            { value: editionCount?.toLocaleString() ?? '0', label: 'Special editions' },
            { value: bookCount?.toLocaleString() ?? '0', label: 'Books tracked' },
            { value: (sources ?? []).length.toString(), label: 'Sources' },
            { value: '$3/mo', label: 'Collection estimator' },
          ].map(s => (
            <div key={s.label} className="px-4">
              <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section className="py-24 px-6 bg-[#080e1a]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-4">The Collection Manager</h2>
              <p className="text-slate-400 max-w-xl">Thoughtful tools for every reader, from casual hobbyists to dedicated bibliophiles.</p>
            </div>
            <div className="h-px flex-grow mx-8 bg-slate-800/50 hidden md:block" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '📊',
                color: 'bg-violet-900/20 text-violet-400',
                title: 'Managing Your Library',
                desc: 'Beautifully catalog your entire collection. Organize by genre, author, or shelf with our intuitive interface.',
                tags: ['SMART CATALOGING', 'READING LISTS'],
              },
              {
                icon: '📈',
                color: 'bg-emerald-900/20 text-emerald-400',
                title: 'Tracking Value',
                desc: 'Know the worth of any edition. Our market engine tracks pricing trends for everything from vintage paperbacks to limited exclusives.',
                tags: ['ANY EDITION', 'PRICE HISTORY'],
              },
              {
                icon: '📦',
                color: 'bg-amber-900/20 text-amber-400',
                title: 'Special Editions',
                desc: 'Illumicrate, OwlCrate, FairyLoot, Goldsboro — every exclusive edition documented with full variant details and cover art.',
                tags: ['SUB BOXES', 'SIGNED COPIES'],
              },
            ].map(f => (
              <div key={f.title} className="group bg-slate-900/60 rounded-xl p-8 hover:bg-slate-800/60 transition-all duration-300 border border-slate-800/50 hover:border-slate-700/50">
                <div className={`w-12 h-12 ${f.color} rounded-lg flex items-center justify-center mb-8 text-2xl group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{f.title}</h3>
                <p className="text-slate-400 mb-6 leading-relaxed text-sm">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map(t => (
                    <span key={t} className="text-[10px] font-mono border border-slate-700/50 text-slate-500 px-2 py-1 rounded">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING ── */}
      {(trendingEditions ?? []).length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tighter text-white">Trending in Collections</h2>
                <p className="text-sm text-slate-500 mt-1">Most added editions right now</p>
              </div>
              <Link href="/browse" className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">See all →</Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {(trendingEditions ?? []).map(ed => {
                const book = ed.book as unknown as {title:string;author:string}|null
                return (
                  <Link key={ed.id} href={`/edition/${ed.id}`} className="group">
                    <div className="aspect-[2/3] relative bg-slate-800 rounded-xl overflow-hidden mb-2 shadow-lg group-hover:shadow-violet-900/30 transition-shadow">
                      {ed.cover_image && <Image src={ed.cover_image} alt={book?.title??''} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="150px" unoptimized />}
                    </div>
                    <p className="text-xs text-slate-300 truncate font-medium">{book?.title}</p>
                    {ed.estimated_value && <p className="text-xs text-emerald-400 mt-0.5 font-mono">${Number(ed.estimated_value).toFixed(0)}</p>}
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── SPOTLIGHT ── */}
      <section className="py-24 px-6 bg-[#080e1a]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          {/* Left: cover collage */}
          <div className="w-full lg:w-1/2 relative">
            <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden shadow-2xl">
              {covers.slice(0, 8).map((e, i) => (
                <Link key={e.id} href={`/edition/${e.id}`} className="group">
                  <div className="aspect-[2/3] relative bg-slate-800 overflow-hidden">
                    <Image src={e.cover_image!} alt={(e.book as {title:string}|null)?.title??''} fill className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100" sizes="120px" unoptimized />
                  </div>
                </Link>
              ))}
            </div>
          </div>
          {/* Right: copy */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-8 leading-tight">
              Celebrate your journey,<br />curate your <span className="text-amber-400">passion.</span>
            </h2>
            <div className="space-y-6">
              {[
                { title: 'Universal Tracking', desc: "Whether it's a first edition or a well-loved paperback, understand its story and value." },
                { title: 'Easy Organization', desc: 'Scan barcodes to instantly add books to your digital shelf and track your reading progress.' },
                { title: 'Purchase Details', desc: 'Log what you paid, where you bought it, and its condition — every copy tells a story.' },
              ].map(item => (
                <div key={item.title} className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-violet-900/40 border border-violet-800/50 flex items-center justify-center">
                    <span className="text-violet-400 text-sm">✓</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    <strong className="text-white">{item.title}:</strong> {item.desc}
                  </p>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" className="mt-12 text-violet-400 font-bold flex items-center gap-2 group text-sm hover:text-violet-300 transition-colors">
              Start your collection →
            </Link>
          </div>
        </div>
      </section>

      {/* ── RECENTLY ADDED ── */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tighter text-white">Recently Added</h2>
              <p className="text-sm text-slate-500 mt-1">Latest editions in the database</p>
            </div>
            <Link href="/browse" className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">Browse all {editionCount?.toLocaleString()} →</Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {(recentEditions ?? []).map(ed => {
              const book = ed.book as unknown as {title:string;author:string}|null
              return (
                <Link key={ed.id} href={`/edition/${ed.id}`} className="group">
                  <div className="aspect-[2/3] relative bg-slate-800 rounded-lg overflow-hidden shadow-md group-hover:shadow-violet-900/30 transition-shadow">
                    {ed.cover_image && <Image src={ed.cover_image} alt={book?.title??''} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="100px" unoptimized />}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SOURCES ── */}
      <section className="border-t border-slate-800/50 bg-slate-900/30 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest font-mono">Sources Tracked</p>
          <div className="flex flex-wrap justify-center gap-3">
            {(sources ?? []).map(s => (
              <Link
                key={s.id}
                href={`/browse?source=${encodeURIComponent(s.name)}`}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-violet-600 text-slate-400 hover:text-violet-300 text-sm rounded-full transition-colors font-mono"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-8 my-12">
        <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800/50 rounded-3xl px-8 py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-6">Start your collection journey today</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Join readers who use Shelfworth to manage their libraries and discover the hidden value in their books.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors shadow-xl shadow-violet-900/20">
                Create Your Free Account
              </Link>
              <Link href="/browse" className="border border-slate-700 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors">
                See How It Works
              </Link>
            </div>
            <p className="mt-8 font-mono text-[10px] text-slate-600 tracking-[0.2em] uppercase">Trusted by collectors worldwide</p>
          </div>
        </div>
      </section>

    </div>
  )
}

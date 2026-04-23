import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const MONTH_ORDER = ['january','february','march','april','may','june','july','august','september','october','november','december']

const EDITION_BADGE: Record<string, { label: string; cls: string }> = {
  signed:    { label: 'Signed',    cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  exclusive: { label: 'Exclusive', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  standard:  { label: 'Standard',  cls: 'bg-slate-700/50 text-slate-400 border-slate-600/40' },
}

export default async function BoxArchivePage({
  params,
}: {
  params: Promise<{ source: string }>
}) {
  const { source: sourceSlug } = await params
  const sourceName = decodeURIComponent(sourceSlug)
  const supabase = await createClient()

  // Look up the source
  const { data: source } = await supabase
    .from('source')
    .select('id, name, type')
    .ilike('name', sourceName)
    .eq('type', 'subscription_box')
    .single()

  if (!source) notFound()

  // Fetch all editions from this source
  const { data: allEditions } = await supabase
    .from('edition')
    .select('id, edition_name, cover_image, estimated_value, original_retail_price, edition_type, book:book_id(id, title, author)')
    .eq('source_id', source.id)
    .order('edition_name')

  // Group by "Month Year" extracted from edition_name
  const byMonth: Record<string, { label: string; monthKey: string; year: string; editions: any[] }> = {}

  for (const ed of allEditions ?? []) {
    const m = (ed.edition_name as string)?.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(202\d)/i)
    const key = m ? `${m[2]}-${m[1].toLowerCase()}` : 'other'
    const label = m ? `${m[1]} ${m[2]}` : 'Other'
    if (!byMonth[key]) byMonth[key] = { label, monthKey: m?.[1]?.toLowerCase() ?? '', year: m?.[2] ?? '', editions: [] }
    byMonth[key].editions.push(ed)
  }

  // Sort months newest first
  const months = Object.values(byMonth).sort((a, b) => {
    if (a.year !== b.year) return Number(b.year) - Number(a.year)
    return MONTH_ORDER.indexOf(a.monthKey) - MONTH_ORDER.indexOf(b.monthKey)
  })

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

  return (
    <div className="min-h-screen bg-[#0e131f]">
      {/* Nav */}
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/boxes" className="text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 text-sm">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Monthly Boxes
        </Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-white font-bold text-sm">{source.name}</h1>
        <span className="ml-auto text-slate-500 text-xs">{(allEditions ?? []).length} total editions</span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight text-white">{source.name}</h2>
          <p className="text-slate-500 text-sm mt-1">Complete archive · {months.length} month{months.length !== 1 ? 's' : ''}</p>
        </div>

        {months.length === 0 ? (
          <div className="text-center py-24 text-slate-600">
            <span className="material-symbols-outlined text-4xl block mb-3">inventory_2</span>
            <p>No editions found for this box.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {months.map(({ label, editions }) => (
              <section key={label}>
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="text-lg font-bold text-white">{label}</h3>
                  <span className="text-slate-600 text-sm">{editions.length} edition{editions.length !== 1 ? 's' : ''}</span>
                  <div className="flex-1 border-t border-slate-800/50" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {editions.map((ed: any) => {
                    const value = ed.estimated_value ?? ed.original_retail_price
                    const badge = ed.edition_type ? EDITION_BADGE[ed.edition_type] : null

                    return (
                      <Link key={ed.id} href={`/edition/${ed.id}`} className="group block">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-xl ring-1 ring-white/5 group-hover:ring-violet-500/50 transition-all duration-300 group-hover:-translate-y-1.5">
                          {ed.cover_image ? (
                            <Image
                              src={ed.cover_image}
                              alt={ed.book?.title ?? ''}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="160px"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-600 text-xs text-center p-2">
                              {ed.book?.title?.slice(0, 30)}
                            </div>
                          )}
                          {badge && (
                            <div className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </div>
                          )}
                          {value && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-emerald-400 font-mono font-bold text-xs">{fmt(Number(value))}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2.5">
                          <p className="text-white text-xs font-semibold leading-tight line-clamp-2 group-hover:text-violet-300 transition-colors">
                            {ed.book?.title ?? 'Unknown'}
                          </p>
                          <p className="text-slate-500 text-[10px] truncate mt-0.5">{ed.book?.author}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

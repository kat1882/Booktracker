import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sort month strings chronologically
function parseMonthYear(s: string): number {
  const months: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  }
  const [m, y] = s.split(' ')
  return parseInt(y!) * 100 + (months[m!] ?? 0)
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  subscription_box: 'Sub Box',
  retailer: 'Retailer',
  publisher: 'Publisher',
  crowdfunding: 'Crowdfund',
  preorder: 'Pre-Order',
}

const SOURCE_TYPE_COLORS: Record<string, string> = {
  subscription_box: 'bg-violet-700/70 text-violet-200',
  retailer: 'bg-blue-700/70 text-blue-200',
  publisher: 'bg-emerald-700/70 text-emerald-200',
  crowdfunding: 'bg-amber-700/70 text-amber-200',
  preorder: 'bg-pink-700/70 text-pink-200',
}

type Edition = {
  id: string
  book_id: string
  edition_type: string | null
  cover_image: string | null
  release_month: string
  source: {
    id: string
    name: string
    type: string
    website: string | null
  }
  book: {
    id: string
    title: string
    author: string
    cover_image: string | null
  }
}

export default async function BoxesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams

  // Fetch all available months
  const { data: monthRows } = await supabase
    .from('edition')
    .select('release_month')
    .not('release_month', 'is', null)
    .not('release_month', 'eq', '')

  const allMonths = [...new Set((monthRows ?? []).map(r => r.release_month as string))]
    .filter(m => /^\w+ 20(2[4-9]|3\d)$/.test(m))
    .sort((a, b) => parseMonthYear(a) - parseMonthYear(b))

  // Default to current month or nearest month with data
  const now = new Date()
  const currentLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedMonth = params.month && allMonths.includes(params.month)
    ? params.month
    : (allMonths.includes(currentLabel)
      ? currentLabel
      : allMonths.findLast(m => parseMonthYear(m) <= parseMonthYear(currentLabel)) ?? allMonths[allMonths.length - 1] ?? '')

  // Fetch editions for this month
  const { data: editions } = await supabase
    .from('edition')
    .select(`
      id,
      book_id,
      edition_type,
      cover_image,
      release_month,
      source:source_id (id, name, type, website),
      book:book_id (id, title, author, cover_image)
    `)
    .eq('release_month', selectedMonth)
    .order('id')

  // Group by source name, sorted alphabetically
  const bySource: Record<string, Edition[]> = {}
  for (const e of (editions ?? []) as unknown as Edition[]) {
    if (!e.source?.name) continue
    const key = e.source.name
    if (!bySource[key]) bySource[key] = []
    bySource[key]!.push(e)
  }
  const sortedSources = Object.keys(bySource).sort((a, b) => a.localeCompare(b))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Monthly Book Boxes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Special editions by subscription box, retailer, and publisher — sourced from{' '}
          <a
            href="https://www.booksandspreadsheets.com/special-editions-by-the-year"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline"
          >
            Books & Spreadsheets
          </a>
        </p>
      </div>

      {/* Month tabs — scrollable horizontal strip */}
      <div className="overflow-x-auto pb-2 mb-8 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {allMonths.map(m => {
            const [mon, yr] = m.split(' ')
            const isSelected = m === selectedMonth
            return (
              <Link
                key={m}
                href={`/boxes?month=${encodeURIComponent(m)}`}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="font-semibold">{mon?.slice(0, 3)}</span>{' '}
                <span className="text-[10px] opacity-80">{yr}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Month heading + count */}
      <div className="flex items-baseline gap-3 mb-8">
        <h2 className="text-xl font-bold text-white">{selectedMonth}</h2>
        <span className="text-sm text-gray-500">
          {sortedSources.length} {sortedSources.length === 1 ? 'company' : 'companies'},{' '}
          {(editions ?? []).length} editions
        </span>
      </div>

      {sortedSources.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No editions found for this month.</div>
      ) : (
        <div className="space-y-12">
          {sortedSources.map(sourceName => {
            const entries = bySource[sourceName]!
            const source = entries[0]!.source
            const typeLabel = SOURCE_TYPE_LABELS[source.type] ?? source.type
            const typeColor = SOURCE_TYPE_COLORS[source.type] ?? 'bg-gray-700/70 text-gray-300'

            return (
              <section key={sourceName}>
                {/* Company header — mirrors BAS company header style */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-800">
                  <div>
                    <h3 className="text-base font-bold text-white">{sourceName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
                        {typeLabel}
                      </span>
                      {source.website && (
                        <a
                          href={source.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-violet-400 transition-colors"
                        >
                          {source.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Book grid — 2→3→4→6 columns like BAS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {entries.map(e => {
                    const cover = e.cover_image ?? e.book?.cover_image
                    const title = e.book?.title ?? 'Unknown Title'
                    const author = e.book?.author
                    const showAuthor = author && author !== 'Unknown'

                    return (
                      <Link
                        key={e.id}
                        href={`/edition/${e.id}`}
                        className="group flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-violet-500 transition-colors"
                      >
                        {/* Book cover */}
                        <div className="aspect-[2/3] relative bg-gray-800">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mb-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                              <span className="text-[9px] text-gray-600 text-center leading-tight line-clamp-3">{title}</span>
                            </div>
                          )}
                          {e.edition_type && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                              <span className="text-[9px] text-gray-300 capitalize">
                                {e.edition_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Text */}
                        <div className="p-2.5 flex flex-col gap-0.5 flex-1">
                          <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">{title}</p>
                          {showAuthor && (
                            <p className="text-[10px] text-gray-400 line-clamp-1">{author}</p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

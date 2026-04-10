import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const GENRES = ['fantasy', 'romance', 'thriller', 'horror', 'sci-fi', 'historical', 'contemporary', 'ya']
const PAGE_SIZE = 60

interface SearchParams {
  q?: string
  genre?: string
  page?: string
  special?: string
}

function buildHref(params: { q?: string; genre?: string; page?: number; special?: string }) {
  const p = new URLSearchParams()
  if (params.q) p.set('q', params.q)
  if (params.genre) p.set('genre', params.genre)
  if (params.special) p.set('special', params.special)
  if (params.page && params.page > 1) p.set('page', String(params.page))
  const s = p.toString()
  return `/browse${s ? `?${s}` : ''}`
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const search = params.q?.trim() ?? ''
  const genre = params.genre ?? ''
  const specialOnly = params.special === '1'
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('book_browse')
    .select('id, title, author, genre, series_name, series_number, book_cover, edition_count, edition_cover', { count: 'exact' })
    .order('title')
    .range(from, to)

  if (search) {
    query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
  }
  if (genre) {
    query = query.eq('genre', genre)
  }
  if (specialOnly) {
    query = query.gt('edition_count', 0)
  }

  const { data: books, count } = await query

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const pageWindow = () => {
    const delta = 3
    const range: number[] = []
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i)
    }
    return range
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Search bar */}
      <form className="flex gap-3 mb-5" method="GET">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by title or author…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
        {genre && <input type="hidden" name="genre" value={genre} />}
        {specialOnly && <input type="hidden" name="special" value="1" />}
        <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Search
        </button>
      </form>

      {/* Genre filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        <Link
          href={buildHref({ q: search || undefined, special: specialOnly ? '1' : undefined })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!genre ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
        >
          All Genres
        </Link>
        {GENRES.map(g => (
          <Link
            key={g}
            href={buildHref({ q: search || undefined, genre: g, special: specialOnly ? '1' : undefined })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${genre === g ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Special editions toggle */}
      <div className="flex gap-2 mb-6">
        <Link
          href={buildHref({ q: search || undefined, genre: genre || undefined, special: specialOnly ? undefined : '1' })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${specialOnly ? 'bg-pink-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
        >
          {specialOnly ? '✓ Has Special Editions' : 'Has Special Editions'}
        </Link>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-6">
        {totalCount.toLocaleString()} book{totalCount !== 1 ? 's' : ''}
        {search && <> matching &ldquo;{search}&rdquo;</>}
        {genre && <> in {genre}</>}
        {specialOnly && <> with special editions</>}
        {totalPages > 1 && <span className="ml-2 text-gray-600">— page {page} of {totalPages}</span>}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {(books ?? []).map(book => {
          const cover = book.edition_cover ?? book.book_cover
          return (
            <Link
              key={book.id}
              href={`/book/${book.id}`}
              className="group flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-violet-500 transition-colors"
            >
              <div className="aspect-[2/3] relative bg-gray-800">
                {cover ? (
                  <Image
                    src={cover}
                    alt={book.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-2">
                    No cover
                  </div>
                )}
                {book.edition_count > 0 && (
                  <div className="absolute top-2 right-2 bg-violet-600/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-tight">
                    {book.edition_count} {book.edition_count === 1 ? 'edition' : 'editions'}
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
                <p className="text-xs text-gray-400 line-clamp-1">{book.author}</p>
                {book.genre && <p className="text-xs text-gray-600 capitalize mt-0.5">{book.genre}</p>}
              </div>
            </Link>
          )
        })}
      </div>

      {(books ?? []).length === 0 && (
        <div className="text-center py-24 text-gray-500">
          No books found. Try a different search or filter.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-10">
          {page > 1 && (
            <Link
              href={buildHref({ q: search || undefined, genre: genre || undefined, special: specialOnly ? '1' : undefined, page: page - 1 })}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-800 rounded-lg transition-colors"
            >
              ←
            </Link>
          )}

          {page > 4 && (
            <>
              <Link href={buildHref({ q: search || undefined, genre: genre || undefined, special: specialOnly ? '1' : undefined, page: 1 })} className="px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-800 rounded-lg transition-colors">1</Link>
              {page > 5 && <span className="px-2 text-gray-600">…</span>}
            </>
          )}

          {pageWindow().map(p => (
            <Link
              key={p}
              href={buildHref({ q: search || undefined, genre: genre || undefined, special: specialOnly ? '1' : undefined, page: p })}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${p === page ? 'bg-violet-600 border-violet-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}
            >
              {p}
            </Link>
          ))}

          {page < totalPages - 3 && (
            <>
              {page < totalPages - 4 && <span className="px-2 text-gray-600">…</span>}
              <Link href={buildHref({ q: search || undefined, genre: genre || undefined, special: specialOnly ? '1' : undefined, page: totalPages })} className="px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-800 rounded-lg transition-colors">{totalPages}</Link>
            </>
          )}

          {page < totalPages && (
            <Link
              href={buildHref({ q: search || undefined, genre: genre || undefined, special: specialOnly ? '1' : undefined, page: page + 1 })}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-800 rounded-lg transition-colors"
            >
              →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

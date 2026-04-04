import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const GENRES = ['fantasy', 'romance', 'thriller', 'horror', 'sci-fi', 'historical', 'contemporary', 'ya']

interface SearchParams {
  q?: string
  genre?: string
  source?: string
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const search = params.q?.trim() ?? ''
  const genre = params.genre ?? ''

  let query = supabase
    .from('edition')
    .select(`
      id, edition_name, cover_image, original_retail_price, release_month, edition_type,
      book:book_id ( title, author, genre ),
      source:source_id ( name )
    `)
    .order('edition_name')
    .limit(120)

  if (search) {
    query = query.or(`edition_name.ilike.%${search}%,book.title.ilike.%${search}%,book.author.ilike.%${search}%`)
  }

  if (genre) {
    query = query.eq('book.genre', genre)
  }

  const { data: editions } = await query

  const filtered = editions?.filter(e => {
    if (genre && (e.book as { genre?: string })?.genre !== genre) return false
    return true
  }) ?? []

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form className="flex gap-3 flex-1" method="GET">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search by title or author..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          {genre && <input type="hidden" name="genre" value={genre} />}
          <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Search
          </button>
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={search ? `/browse?q=${search}` : '/browse'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!genre ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            All
          </Link>
          {GENRES.map(g => (
            <Link
              key={g}
              href={`/browse?${search ? `q=${search}&` : ''}genre=${g}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${genre === g ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {g}
            </Link>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-6">
        {filtered.length} edition{filtered.length !== 1 ? 's' : ''}
        {search && <> matching &ldquo;{search}&rdquo;</>}
        {genre && <> in {genre}</>}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filtered.map(edition => {
          const book = edition.book as unknown as { title: string; author: string; genre?: string }
          const source = edition.source as unknown as { name: string } | null
          return (
            <Link
              key={edition.id}
              href={`/edition/${edition.id}`}
              className="group flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-violet-500 transition-colors"
            >
              <div className="aspect-[2/3] relative bg-gray-800">
                {edition.cover_image ? (
                  <Image
                    src={edition.cover_image}
                    alt={book.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-2">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-1">
                <p className="text-xs font-semibold text-white leading-tight line-clamp-2">{book.title}</p>
                <p className="text-xs text-gray-400 line-clamp-1">{book.author}</p>
                {source && (
                  <span className="text-xs text-violet-400 mt-auto">{source.name}</span>
                )}
                {edition.original_retail_price && (
                  <p className="text-xs text-gray-500">£{edition.original_retail_price}</p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-24 text-gray-500">
          No editions found. Try a different search.
        </div>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import Link from 'next/link'
import AddToShelfButton from './AddToShelfButton'

interface GBVolumeInfo {
  title: string
  authors?: string[]
  description?: string
  publishedDate?: string
  categories?: string[]
  pageCount?: number
  imageLinks?: { thumbnail?: string; large?: string; extraLarge?: string }
  industryIdentifiers?: { type: string; identifier: string }[]
}

async function fetchGoogleBook(gbId: string): Promise<GBVolumeInfo | null> {
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${gbId}?key=${key}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.volumeInfo ?? null
  } catch { return null }
}

async function fetchOLBook(olId: string) {
  try {
    const res = await fetch(`https://openlibrary.org/works/${olId}.json`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

function cleanCover(url?: string) {
  if (!url) return null
  return url.replace('http://', 'https://').replace('zoom=1', 'zoom=3').replace('&edge=curl', '')
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isGoogleBooks = id.startsWith('gb_')
  const gbId = isGoogleBooks ? id.slice(3) : null
  const olId = !isGoogleBooks ? id : null

  // Look up book in our DB
  const dbQuery = supabase
    .from('book')
    .select('*, editions:edition(id, edition_name, cover_image, edition_type, release_month, original_retail_price, source:source_id(name))')

  const { data: dbBook } = gbId
    ? await dbQuery.eq('google_books_id', gbId).single()
    : await dbQuery.eq('open_library_id', olId!).single()

  // Fetch from external API
  let title = dbBook?.title ?? 'Unknown Title'
  let author = dbBook?.author ?? 'Unknown'
  let coverUrl: string | null = dbBook?.cover_image ?? null
  let description: string | null = dbBook?.synopsis ?? null
  let genre: string | null = dbBook?.genre ?? null
  let pageCount: number | null = dbBook?.page_count ?? null
  let publishedYear: string | null = null

  if (gbId) {
    const gbInfo = await fetchGoogleBook(gbId)
    if (gbInfo) {
      title = gbInfo.title ?? title
      author = gbInfo.authors?.[0] ?? author
      coverUrl = cleanCover(gbInfo.imageLinks?.extraLarge ?? gbInfo.imageLinks?.large ?? gbInfo.imageLinks?.thumbnail) ?? coverUrl
      description = gbInfo.description ?? description
      genre = gbInfo.categories?.[0]?.split('/')[0].trim().toLowerCase() ?? genre
      pageCount = gbInfo.pageCount ?? pageCount
      publishedYear = gbInfo.publishedDate?.slice(0, 4) ?? null
    }
  } else if (olId) {
    const olBook = await fetchOLBook(olId)
    if (olBook) {
      description = typeof olBook.description === 'string' ? olBook.description : olBook.description?.value ?? description
      if (!coverUrl && dbBook?.cover_ol_id) {
        coverUrl = `https://covers.openlibrary.org/b/id/${dbBook.cover_ol_id}-L.jpg`
      }
    }
  }

  const editions = (dbBook?.editions ?? []) as {
    id: string
    edition_name: string
    cover_image?: string
    edition_type: string
    release_month?: string
    original_retail_price?: number
    source?: { name: string }
  }[]

  // Get user's shelf status
  let shelfStatus: string | null = null
  if (user && dbBook?.id) {
    const { data: collection } = await supabase
      .from('user_collection')
      .select('reading_status')
      .eq('user_id', user.id)
      .eq('book_id', dbBook.id)
      .single()
    shelfStatus = collection?.reading_status ?? null
  }

  const bookPayload = {
    title,
    author,
    google_books_id: gbId ?? undefined,
    open_library_id: olId ?? undefined,
    cover_image: coverUrl,
    synopsis: description,
    genre,
    page_count: pageCount,
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/search" className="text-sm text-gray-400 hover:text-white mb-6 inline-block transition-colors">
        ← Back to search
      </Link>

      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="w-full md:w-52 shrink-0">
          <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden shadow-xl">
            {coverUrl ? (
              <Image src={coverUrl} alt={title} fill className="object-cover" sizes="208px" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm p-4 text-center">{title}</div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-1 leading-tight">{title}</h1>
          <p className="text-gray-400 text-lg mb-1">by {author}</p>

          <div className="flex flex-wrap gap-2 mb-5 mt-2">
            {genre && (
              <span className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full capitalize">{genre}</span>
            )}
            {pageCount && (
              <span className="bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full">{pageCount} pages</span>
            )}
            {publishedYear && (
              <span className="bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full">{publishedYear}</span>
            )}
          </div>

          <AddToShelfButton book={bookPayload} currentStatus={shelfStatus} isLoggedIn={!!user} />

          {description && (
            <p className="text-gray-400 text-sm leading-relaxed mt-6 max-w-2xl line-clamp-6">
              {description.replace(/<[^>]+>/g, '')}
            </p>
          )}
        </div>
      </div>

      {/* Special Editions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Special Editions
          {editions.length > 0 && <span className="ml-2 text-sm text-gray-500 font-normal">{editions.length}</span>}
        </h2>

        {editions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {editions.map(edition => (
              <Link
                key={edition.id}
                href={`/edition/${edition.id}`}
                className="group bg-gray-900 border border-gray-800 hover:border-violet-500 rounded-xl overflow-hidden transition-colors"
              >
                <div className="aspect-[2/3] relative bg-gray-800">
                  {edition.cover_image ? (
                    <Image
                      src={edition.cover_image}
                      alt={edition.edition_name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="200px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-2">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-violet-400 font-medium">{edition.source?.name}</p>
                  <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{edition.edition_name}</p>
                  {edition.release_month && <p className="text-xs text-gray-500 mt-0.5">{edition.release_month}</p>}
                  {edition.original_retail_price && <p className="text-xs text-gray-500">£{edition.original_retail_price}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
            No special editions tracked yet for this book.
          </div>
        )}
      </div>
    </div>
  )
}

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

interface OLEdition {
  title?: string
  publishers?: string[]
  publish_date?: string
  isbn_13?: string[]
  isbn_10?: string[]
  physical_format?: string
  number_of_pages?: number
  covers?: number[]
  languages?: { key: string }[]
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

async function fetchOLEditions(olId: string): Promise<OLEdition[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/works/${olId}/editions.json?limit=50`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.entries ?? []
  } catch { return [] }
}

async function findOLId(title: string, author: string): Promise<string | null> {
  try {
    const q = `title:${encodeURIComponent(title)} author:${encodeURIComponent(author.split(' ').slice(-1)[0])}`
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=1&fields=key`,
      { next: { revalidate: 86400 } }
    )
    const data = await res.json()
    const key: string = data.docs?.[0]?.key ?? ''
    return key ? key.replace('/works/', '') : null
  } catch { return null }
}

function cleanCover(url?: string) {
  if (!url) return null
  return url.replace('http://', 'https://').replace('zoom=1', 'zoom=3').replace('&edge=curl', '')
}

function formatFormat(format?: string) {
  if (!format) return null
  const f = format.toLowerCase()
  if (f.includes('hardcover') || f.includes('hardback')) return 'Hardcover'
  if (f.includes('paperback') || f.includes('softcover')) return 'Paperback'
  if (f.includes('mass market')) return 'Mass Market'
  if (f.includes('ebook') || f.includes('digital')) return 'eBook'
  if (f.includes('audio')) return 'Audiobook'
  return format
}

function formatLanguage(langKey?: string) {
  const map: Record<string, string> = {
    '/languages/eng': 'English',
    '/languages/fre': 'French',
    '/languages/spa': 'Spanish',
    '/languages/ger': 'German',
    '/languages/dut': 'Dutch',
    '/languages/ita': 'Italian',
  }
  return langKey ? (map[langKey] ?? langKey.replace('/languages/', '')) : null
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params
  const { from } = await searchParams
  const backHref = from ?? '/search'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isGoogleBooks = id.startsWith('gb_')
  const gbId = isGoogleBooks ? id.slice(3) : null
  const olId = !isGoogleBooks ? id : null

  const editionSelect = '*, editions:edition(id, edition_name, cover_image, edition_type, release_month, original_retail_price, source:source_id(name))'

  // Look up book in our DB by external ID first
  let { data: dbBook } = gbId
    ? await supabase.from('book').select(editionSelect).eq('google_books_id', gbId).single()
    : await supabase.from('book').select(editionSelect).eq('open_library_id', olId!).single()

  // If no editions found, try a title-based fallback (catches Illumicrate books not yet linked)
  if (!dbBook || (dbBook.editions as unknown[]).length === 0) {
    const externalTitle = dbBook?.title
    if (externalTitle) {
      const { data: titleMatch } = await supabase
        .from('book')
        .select(editionSelect)
        .ilike('title', externalTitle)
        .not('id', 'eq', dbBook?.id ?? '00000000-0000-0000-0000-000000000000')
        .order('title')
        .limit(1)
        .single()
      if (titleMatch && (titleMatch.editions as unknown[]).length > 0) {
        // Merge: use the title match's editions but keep the external IDs from the original
        dbBook = { ...titleMatch, ...dbBook, editions: titleMatch.editions }
      }
    }
  }

  // Fetch from external API
  let title = dbBook?.title ?? 'Unknown Title'
  let author = dbBook?.author ?? 'Unknown'
  let coverUrl: string | null = dbBook?.cover_image ?? null
  let description: string | null = dbBook?.synopsis ?? null
  let genre: string | null = dbBook?.genre ?? null
  let pageCount: number | null = dbBook?.page_count ?? null
  let publishedYear: string | null = null
  let resolvedOlId: string | null = dbBook?.open_library_id ?? (isGoogleBooks ? null : olId)

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
    // Try to find OL ID for edition data
    if (!resolvedOlId) {
      resolvedOlId = await findOLId(title, author)
    }
  } else if (olId) {
    if (!coverUrl && dbBook?.cover_ol_id) {
      coverUrl = `https://covers.openlibrary.org/b/id/${dbBook.cover_ol_id}-L.jpg`
    }
  }

  // Fetch all published editions from Open Library
  const olEditions = resolvedOlId ? await fetchOLEditions(resolvedOlId) : []

  // Deduplicate editions by ISBN, keep ones with useful data
  const seenIsbns = new Set<string>()
  const publishedEditions = olEditions
    .filter(e => {
      const isbn = e.isbn_13?.[0] ?? e.isbn_10?.[0]
      if (!isbn && !e.publish_date) return false
      if (isbn) {
        if (seenIsbns.has(isbn)) return false
        seenIsbns.add(isbn)
      }
      return true
    })
    .slice(0, 30)

  const specialEditions = (dbBook?.editions ?? []) as {
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
    open_library_id: resolvedOlId ?? undefined,
    cover_image: coverUrl,
    synopsis: description,
    genre,
    page_count: pageCount,
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href={backHref} className="text-sm text-gray-400 hover:text-white mb-6 inline-block transition-colors">
        ← Back to search
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="w-full md:w-52 shrink-0">
          <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden shadow-xl">
            {coverUrl ? (
              <Image src={coverUrl} alt={title} fill className="object-cover" sizes="208px" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm p-4 text-center">{title}</div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-1 leading-tight">{title}</h1>
          <p className="text-gray-400 text-lg mb-3">by {author}</p>

          <div className="flex flex-wrap gap-2 mb-5">
            {genre && <span className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full capitalize">{genre}</span>}
            {pageCount && <span className="bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full">{pageCount} pages</span>}
            {publishedYear && <span className="bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full">First published {publishedYear}</span>}
            {specialEditions.length > 0 && (
              <span className="bg-violet-900/50 text-violet-300 text-xs px-3 py-1 rounded-full">
                {specialEditions.length} special edition{specialEditions.length !== 1 ? 's' : ''}
              </span>
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

      {/* Special Editions — subscription box, signed, etc. */}
      {specialEditions.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-1">Special Editions</h2>
          <p className="text-sm text-gray-500 mb-5">Subscription box exclusives, signed editions, and collector variants</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {specialEditions.map(edition => (
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
        </section>
      )}

      {/* Published Editions — ISBNs and formats from Open Library */}
      <section>
        <h2 className="text-xl font-bold text-white mb-1">Published Editions</h2>
        <p className="text-sm text-gray-500 mb-5">All known printings, formats, and ISBN variants</p>

        {publishedEditions.length > 0 ? (
          <div className="flex flex-col divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
            {publishedEditions.map((edition, i) => {
              const isbn = edition.isbn_13?.[0] ?? edition.isbn_10?.[0]
              const cover = edition.covers?.[0]
                ? `https://covers.openlibrary.org/b/id/${edition.covers[0]}-S.jpg`
                : null
              const format = formatFormat(edition.physical_format)
              const lang = formatLanguage(edition.languages?.[0]?.key)
              const publisher = edition.publishers?.[0]
              const year = edition.publish_date?.match(/\d{4}/)?.[0]

              return (
                <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-900/50 transition-colors">
                  {/* Small cover */}
                  <div className="w-8 h-12 relative bg-gray-800 rounded overflow-hidden shrink-0">
                    {cover ? (
                      <Image src={cover} alt={edition.title ?? title} fill className="object-cover" sizes="32px" unoptimized />
                    ) : (
                      <div className="absolute inset-0 bg-gray-800" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {format && <span className="text-sm font-medium text-white">{format}</span>}
                      {publisher && <span className="text-sm text-gray-400">{publisher}</span>}
                      {year && <span className="text-sm text-gray-500">{year}</span>}
                      {lang && lang !== 'English' && (
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{lang}</span>
                      )}
                      {edition.number_of_pages && (
                        <span className="text-xs text-gray-600">{edition.number_of_pages} pages</span>
                      )}
                    </div>
                    {isbn && <p className="text-xs text-gray-600 mt-0.5 font-mono">ISBN: {isbn}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
            No edition data found for this book.
          </div>
        )}
      </section>
    </div>
  )
}

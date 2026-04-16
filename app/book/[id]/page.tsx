import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import Link from 'next/link'
import AddToShelfButton from './AddToShelfButton'
import { type PublishedEditionData } from './PublishedEditionsList'
import EditionsTabs from './EditionsTabs'

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
    const lastName = author.split(' ').slice(-1)[0]
    // Try title + author last name first, fall back to title only
    for (const q of [
      `title:${encodeURIComponent(title)} author:${encodeURIComponent(lastName)}`,
      `title:${encodeURIComponent(title)}`,
    ]) {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${q}&limit=1&fields=key`,
        { next: { revalidate: 86400 } }
      )
      const data = await res.json()
      const key: string = data.docs?.[0]?.key ?? ''
      if (key) return key.replace('/works/', '')
    }
    return null
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

const editionSelect = '*, editions:edition(id, edition_name, cover_image, edition_type, release_month, original_retail_price, source:source_id(name))'
const specialEditionSelect = 'id, edition_name, cover_image, edition_type, release_month, original_retail_price, source:source_id(name)'

export default async function BookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params
  const { from } = await searchParams
  const backHref = from ?? '/search'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isGoogleBooks = id.startsWith('gb_')
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const gbId = isGoogleBooks ? id.slice(3) : null
  const olId = !isGoogleBooks && !isUUID ? id : null

  // Look up book in our DB — by UUID, Google Books ID, or Open Library ID
  let { data: dbBook } = isUUID
    ? await supabase.from('book').select(editionSelect).eq('id', id).single()
    : gbId
      ? await supabase.from('book').select(editionSelect).eq('google_books_id', gbId).single()
      : await supabase.from('book').select(editionSelect).eq('open_library_id', olId!).single()

  // Fetch from external API to resolve title/author
  let title = dbBook?.title ?? 'Unknown Title'
  let author = dbBook?.author ?? 'Unknown'
  let coverUrl: string | null = dbBook?.cover_image ?? null
  let description: string | null = dbBook?.synopsis ?? null
  let genre: string | null = dbBook?.genre ?? null
  let pageCount: number | null = dbBook?.page_count ?? null
  let publishedYear: string | null = null
  let resolvedOlId: string | null = dbBook?.open_library_id ?? (isGoogleBooks ? null : olId)

  if (isUUID) {
    resolvedOlId = dbBook?.open_library_id ?? null
    if (!resolvedOlId && title !== 'Unknown Title') {
      resolvedOlId = await findOLId(title, author)
    }
  } else if (gbId) {
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
    if (!resolvedOlId) {
      resolvedOlId = await findOLId(title, author)
    }
  } else if (olId) {
    if (!coverUrl && dbBook?.cover_ol_id) {
      coverUrl = `https://covers.openlibrary.org/b/id/${dbBook.cover_ol_id}-L.jpg`
    }
  }

  // Fetch special editions — try multiple strategies to find them
  let specialEditions: {
    id: string
    edition_name: string
    cover_image?: string
    edition_type: string
    release_month?: string
    original_retail_price?: number
    source?: { name: string }
  }[] = (dbBook?.editions ?? []) as typeof specialEditions

  // If none found via direct DB lookup, search by title (wildcard) across all books
  if (specialEditions.length === 0 && title !== 'Unknown Title') {
    const { data: matchingBooks } = await supabase
      .from('book')
      .select('id')
      .ilike('title', `%${title}%`)
      .limit(10)

    const bookIds = (matchingBooks ?? []).map((b: { id: string }) => b.id)
    if (bookIds.length > 0) {
      const { data: foundEditions } = await supabase
        .from('edition')
        .select(specialEditionSelect)
        .in('book_id', bookIds)

      if (foundEditions && foundEditions.length > 0) {
        specialEditions = foundEditions
        // Also update dbBook reference for shelf status lookup
        if (!dbBook && matchingBooks?.[0]) {
          const { data: matched } = await supabase
            .from('book')
            .select(editionSelect)
            .eq('id', matchingBooks[0].id)
            .single()
          if (matched) dbBook = matched
        }
      }
    }
  }

  // Fetch all published editions from Open Library
  const olEditions = resolvedOlId ? await fetchOLEditions(resolvedOlId) : []

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

  const serializedEditions: PublishedEditionData[] = publishedEditions.map(edition => ({
    isbn: edition.isbn_13?.[0] ?? edition.isbn_10?.[0] ?? null,
    format: formatFormat(edition.physical_format),
    publisher: edition.publishers?.[0] ?? null,
    year: edition.publish_date?.match(/\d{4}/)?.[0] ?? null,
    coverUrl: edition.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${edition.covers[0]}-S.jpg`
      : null,
    pages: edition.number_of_pages ?? null,
    language: formatLanguage(edition.languages?.[0]?.key),
    title: edition.title ?? null,
  }))

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

      {/* Tabbed editions view */}
      <EditionsTabs
        specialEditions={specialEditions}
        publishedEditions={serializedEditions}
        coverUrl={coverUrl}
        bookId={dbBook?.id ?? null}
        bookMeta={bookPayload}
        isLoggedIn={!!user}
      />
    </div>
  )
}

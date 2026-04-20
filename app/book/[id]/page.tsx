import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import Link from 'next/link'
import AddToShelfButton from './AddToShelfButton'
import EditionsTabs from './EditionsTabs'

interface GBVolumeInfo {
  title: string
  authors?: string[]
  description?: string
  publishedDate?: string
  categories?: string[]
  pageCount?: number
  imageLinks?: { thumbnail?: string; large?: string; extraLarge?: string }
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

function cleanCover(url?: string) {
  if (!url) return null
  return url.replace('http://', 'https://').replace('zoom=1', 'zoom=3').replace('&edge=curl', '')
}

const editionSelect = '*, editions:edition(id, edition_name, cover_image, edition_type, release_month, original_retail_price, source:source_id(name))'

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

  // Look up book in our DB
  let { data: dbBook } = isUUID
    ? await supabase.from('book').select(editionSelect).eq('id', id).single()
    : gbId
      ? await supabase.from('book').select(editionSelect).eq('google_books_id', gbId).single()
      : await supabase.from('book').select(editionSelect).eq('open_library_id', olId!).single()

  let title = dbBook?.title ?? 'Unknown Title'
  let author = dbBook?.author ?? 'Unknown'
  let coverUrl: string | null = dbBook?.cover_image ?? null
  let description: string | null = dbBook?.synopsis ?? null
  let genre: string | null = dbBook?.genre ?? null
  let pageCount: number | null = dbBook?.page_count ?? null
  let publishedYear: string | null = null

  // Enrich from Google Books if needed
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
  } else if (olId && !coverUrl && dbBook?.cover_ol_id) {
    coverUrl = `https://covers.openlibrary.org/b/id/${dbBook.cover_ol_id}-L.jpg`
  }

  // Fetch all editions for this book from DB (special + standard)
  let allEditions: {
    id: string
    edition_name: string
    cover_image?: string
    edition_type: string
    release_month?: string
    original_retail_price?: number
    source?: { name: string }
  }[] = (dbBook?.editions ?? []) as typeof allEditions

  // If none found via direct lookup, try by title
  if (allEditions.length === 0 && title !== 'Unknown Title') {
    const { data: matchingBooks } = await supabase
      .from('book')
      .select('id')
      .ilike('title', `%${title}%`)
      .limit(10)

    const bookIds = (matchingBooks ?? []).map((b: { id: string }) => b.id)
    if (bookIds.length > 0) {
      const { data: foundEditions } = await supabase
        .from('edition')
        .select('id, edition_name, cover_image, edition_type, release_month, original_retail_price, source:source_id(name)')
        .in('book_id', bookIds)

      if (foundEditions && foundEditions.length > 0) {
        allEditions = foundEditions as unknown as typeof allEditions
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

  const specialEditions = allEditions.filter(e => e.edition_type !== 'standard')
  const standardEditions = allEditions.filter(e => e.edition_type === 'standard')

  // Get user's shelf status
  let shelfStatus: string | null = null
  if (user && dbBook?.id) {
    const { data: collection } = await supabase
      .from('user_collection')
      .select('reading_status')
      .eq('user_id', user.id)
      .eq('book_id', dbBook.id)
      .maybeSingle()
    shelfStatus = collection?.reading_status ?? null
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

          <AddToShelfButton bookId={dbBook?.id ?? null} currentStatus={shelfStatus} isLoggedIn={!!user} />

          {description && (
            <p className="text-gray-400 text-sm leading-relaxed mt-6 max-w-2xl line-clamp-6">
              {description.replace(/<[^>]+>/g, '')}
            </p>
          )}
        </div>
      </div>

      <EditionsTabs
        specialEditions={specialEditions}
        standardEditions={standardEditions}
        coverUrl={coverUrl}
      />
    </div>
  )
}

import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import Link from 'next/link'
import AddToShelfButton from './AddToShelfButton'

interface OLBook {
  title: string
  description?: string | { value: string }
  authors?: { author: { key: string } }[]
  covers?: number[]
  first_publish_date?: string
  subjects?: string[]
}

async function fetchOLBook(olId: string): Promise<OLBook | null> {
  try {
    const res = await fetch(`https://openlibrary.org/works/${olId}.json`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function fetchOLAuthor(authorKey: string): Promise<string> {
  try {
    const res = await fetch(`https://openlibrary.org${authorKey}.json`, { next: { revalidate: 86400 } })
    if (!res.ok) return 'Unknown'
    const data = await res.json()
    return data.name ?? 'Unknown'
  } catch { return 'Unknown' }
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if book exists in our DB
  const { data: dbBook } = await supabase
    .from('book')
    .select('*, editions:edition(id, edition_name, cover_image, edition_type, release_month, original_retail_price, source:source_id(name))')
    .eq('open_library_id', id)
    .single()

  // Fetch from Open Library
  const olBook = await fetchOLBook(id)
  const authorName = dbBook?.author
    ?? (olBook?.authors?.[0] ? await fetchOLAuthor(olBook.authors[0].author.key) : 'Unknown')

  const title = dbBook?.title ?? olBook?.title ?? 'Unknown Title'
  const coverId = dbBook?.cover_ol_id ?? olBook?.covers?.[0]?.toString()
  const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null
  const description = typeof olBook?.description === 'string'
    ? olBook.description
    : olBook?.description?.value ?? dbBook?.synopsis ?? null

  const editions = (dbBook?.editions ?? []) as {
    id: string
    edition_name: string
    cover_image?: string
    edition_type: string
    release_month?: string
    original_retail_price?: number
    source?: { name: string }
  }[]

  // Get user's shelf status for this book
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
    author: authorName,
    open_library_id: id,
    cover_ol_id: coverId ?? null,
    synopsis: description,
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/search" className="text-sm text-gray-400 hover:text-white mb-6 inline-block transition-colors">
        ← Back to search
      </Link>

      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="w-full md:w-48 shrink-0">
          <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden">
            {coverUrl ? (
              <Image src={coverUrl} alt={title} fill className="object-cover" sizes="192px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm p-4 text-center">{title}</div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-1">{title}</h1>
          <p className="text-gray-400 text-lg mb-4">by {authorName}</p>

          {/* Shelf buttons */}
          <AddToShelfButton
            book={bookPayload}
            currentStatus={shelfStatus}
            isLoggedIn={!!user}
          />

          {description && (
            <p className="text-gray-400 text-sm leading-relaxed mt-6 max-w-2xl line-clamp-6">{description}</p>
          )}
        </div>
      </div>

      {/* Special Editions */}
      {editions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">
            Special Editions
            <span className="ml-2 text-sm text-gray-500 font-normal">{editions.length}</span>
          </h2>
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
        </div>
      )}

      {editions.length === 0 && (
        <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
          No special editions tracked yet for this book.
        </div>
      )}
    </div>
  )
}

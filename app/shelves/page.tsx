import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  reading: 'Currently Reading',
  want_to_read: 'Want to Read',
  read: 'Read',
  dnf: 'Did Not Finish',
}

export default async function ShelvesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: entries } = await supabase
    .from('user_collection')
    .select(`
      id, reading_status, rating, date_read,
      book:book_id ( id, title, author, cover_ol_id, genre, open_library_id ),
      edition:edition_id ( id, edition_name, cover_image, source:source_id ( name ) )
    `)
    .eq('user_id', user.id)
    .order('reading_status')

  const grouped = (entries ?? []).reduce<Record<string, typeof entries>>((acc, entry) => {
    const status = entry.reading_status ?? 'want_to_read'
    if (!acc[status]) acc[status] = []
    acc[status]!.push(entry)
    return acc
  }, {})

  const order = ['reading', 'want_to_read', 'read', 'dnf']

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">My Shelves</h1>
        <Link
          href="/search"
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Book
        </Link>
      </div>

      {(entries ?? []).length === 0 && (
        <div className="text-center py-24">
          <p className="text-gray-500 mb-4">Your shelves are empty.</p>
          <Link href="/search" className="text-violet-400 hover:text-violet-300">Search for books to add →</Link>
        </div>
      )}

      {order.map(status => {
        const shelf = grouped[status]
        if (!shelf?.length) return null
        return (
          <section key={status} className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">
              {STATUS_LABELS[status]}
              <span className="ml-2 text-sm text-gray-500 font-normal">{shelf.length}</span>
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {shelf.map(entry => {
                const book = entry.book as unknown as { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string } | null
                const edition = entry.edition as unknown as { id: string; cover_image?: string } | null
                const coverUrl = edition?.cover_image
                  ?? (book?.cover_ol_id ? `https://covers.openlibrary.org/b/id/${book.cover_ol_id}-M.jpg` : null)

                return (
                  <Link
                    key={entry.id}
                    href={book ? `/book/${book.open_library_id ?? book.id}` : '#'}
                    className="group"
                  >
                    <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden mb-1">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={book?.title ?? ''}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="120px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-1">
                          {book?.title}
                        </div>
                      )}
                    </div>
                    {entry.rating && (
                      <p className="text-xs text-yellow-400 text-center">{'★'.repeat(entry.rating)}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

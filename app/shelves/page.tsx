import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ShelvesClient from './ShelvesClient'

export default async function ShelvesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: entries } = await supabase
    .from('user_collection')
    .select(`
      id, reading_status, rating, date_read, date_started,
      book:book_id ( id, title, author, cover_ol_id, open_library_id, google_books_id ),
      edition:edition_id ( id, edition_name, cover_image, source:source_id ( name ) )
    `)
    .eq('user_id', user.id)
    .order('date_read', { ascending: false, nullsFirst: false })

  const all = (entries ?? []) as unknown as {
    id: string
    reading_status: string
    rating: number | null
    date_read: string | null
    date_started: string | null
    book: { id: string; title: string; author: string; cover_ol_id?: string; open_library_id?: string; google_books_id?: string } | null
    edition: { id: string; cover_image?: string; edition_name?: string; source?: { name: string } } | null
  }[]

  const thisYear = new Date().getFullYear()
  const readEntries = all.filter(e => e.reading_status === 'read')
  const ratings = readEntries.map(e => e.rating).filter((r): r is number => r !== null)

  const stats = {
    total: all.length,
    read: readEntries.length,
    reading: all.filter(e => e.reading_status === 'reading').length,
    wantToRead: all.filter(e => e.reading_status === 'want_to_read').length,
    readThisYear: readEntries.filter(e => e.date_read?.startsWith(String(thisYear))).length,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
  }

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

      <ShelvesClient initialEntries={all} stats={stats} />
    </div>
  )
}

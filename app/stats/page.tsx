import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import StatsClient from './StatsClient'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: entries } = await supabase
    .from('user_collection')
    .select(`
      reading_status, rating, date_read, date_started,
      book:book_id ( title, author, genre, page_count )
    `)
    .eq('user_id', user.id)

  const all = (entries ?? []) as {
    reading_status: string
    rating: number | null
    date_read: string | null
    date_started: string | null
    book: { title: string; author: string; genre: string | null; page_count: number | null } | null
  }[]

  const read = all.filter(e => e.reading_status === 'read' && e.date_read)

  // All years that have read entries
  const years = [...new Set(read.map(e => e.date_read!.slice(0, 4)))].sort().reverse()
  const currentYear = years[0] ?? String(new Date().getFullYear())

  // Monthly reads per year
  const monthlyByYear: Record<string, number[]> = {}
  for (const year of years) {
    const counts = Array(12).fill(0)
    for (const e of read) {
      if (e.date_read?.startsWith(year)) {
        const month = parseInt(e.date_read.slice(5, 7)) - 1
        counts[month]++
      }
    }
    monthlyByYear[year] = counts
  }

  // Genre breakdown (all time)
  const genreCounts: Record<string, number> = {}
  for (const e of read) {
    const g = e.book?.genre ?? 'Unknown'
    genreCounts[g] = (genreCounts[g] ?? 0) + 1
  }
  const genres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Top authors (all time)
  const authorCounts: Record<string, number> = {}
  for (const e of read) {
    const a = e.book?.author ?? 'Unknown'
    authorCounts[a] = (authorCounts[a] ?? 0) + 1
  }
  const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Ratings distribution
  const ratingDist = [1, 2, 3, 4, 5].map(r => ({
    rating: r,
    count: read.filter(e => e.rating === r).length,
  }))

  // Total pages per year
  const pagesByYear: Record<string, number> = {}
  for (const year of years) {
    pagesByYear[year] = read
      .filter(e => e.date_read?.startsWith(year))
      .reduce((sum, e) => sum + (e.book?.page_count ?? 0), 0)
  }

  // All-time stats
  const totalPages = read.reduce((sum, e) => sum + (e.book?.page_count ?? 0), 0)
  const ratings = read.map(e => e.rating).filter((r): r is number => r !== null)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const wantToRead = all.filter(e => e.reading_status === 'want_to_read').length

  return (
    <StatsClient
      years={years}
      currentYear={currentYear}
      monthlyByYear={monthlyByYear}
      genres={genres}
      topAuthors={topAuthors}
      ratingDist={ratingDist}
      pagesByYear={pagesByYear}
      totalBooks={read.length}
      totalPages={totalPages}
      avgRating={avgRating}
      wantToRead={wantToRead}
    />
  )
}

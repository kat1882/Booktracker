import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return NextResponse.json({ books: [] })

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&printType=books&key=${apiKey}`

  const res = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()

  // Filter out results without titles or that are clearly not books
  const books = (data.items ?? []).filter((item: { volumeInfo: { title?: string } }) =>
    item.volumeInfo?.title
  )

  return NextResponse.json({ books })
}

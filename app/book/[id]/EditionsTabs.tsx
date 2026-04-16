'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PublishedEditionsList, { type PublishedEditionData } from './PublishedEditionsList'

interface SpecialEdition {
  id: string
  edition_name: string
  cover_image?: string
  edition_type: string
  release_month?: string
  original_retail_price?: number
  source?: { name: string }
}

interface BookMeta {
  title: string
  author: string
  google_books_id?: string
  open_library_id?: string
  cover_image?: string | null
  synopsis?: string | null
  genre?: string | null
  page_count?: number | null
}

export default function EditionsTabs({
  specialEditions,
  publishedEditions,
  coverUrl,
  bookId,
  bookMeta,
  isLoggedIn,
}: {
  specialEditions: SpecialEdition[]
  publishedEditions: PublishedEditionData[]
  coverUrl: string | null
  bookId: string | null
  bookMeta: BookMeta
  isLoggedIn: boolean
}) {
  const [tab, setTab] = useState<'published' | 'special'>(
    specialEditions.length > 0 ? 'special' : 'published'
  )

  return (
    <section>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('special')}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
            tab === 'special'
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Special Editions
          {specialEditions.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === 'special' ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {specialEditions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('published')}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
            tab === 'published'
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Published Editions
          {publishedEditions.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === 'published' ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {publishedEditions.length}
            </span>
          )}
        </button>
      </div>

      {/* Special Editions tab */}
      {tab === 'special' && (
        <>
          {specialEditions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {specialEditions.map(edition => (
                <Link
                  key={edition.id}
                  href={`/edition/${edition.id}`}
                  className="group bg-gray-900 border border-gray-800 hover:border-violet-500 rounded-xl overflow-hidden transition-colors"
                >
                  <div className="aspect-[2/3] relative bg-gray-800">
                    {(edition.cover_image || coverUrl) ? (
                      <Image
                        src={edition.cover_image ?? coverUrl!}
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
              No special editions found for this book.
            </div>
          )}
        </>
      )}

      {/* Published Editions tab */}
      {tab === 'published' && (
        <>
          {publishedEditions.length > 0 ? (
            <PublishedEditionsList
              editions={publishedEditions}
              bookId={bookId}
              bookMeta={bookMeta}
              isLoggedIn={isLoggedIn}
            />
          ) : (
            <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
              No edition data found for this book.
            </div>
          )}
        </>
      )}
    </section>
  )
}

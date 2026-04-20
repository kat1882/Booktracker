'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Edition {
  id: string
  edition_name: string
  cover_image?: string
  edition_type: string
  release_month?: string
  original_retail_price?: number
  source?: { name: string }
}

export default function EditionsTabs({
  specialEditions,
  standardEditions,
  coverUrl,
}: {
  specialEditions: Edition[]
  standardEditions: Edition[]
  coverUrl: string | null
}) {
  const [tab, setTab] = useState<'special' | 'standard'>(
    specialEditions.length > 0 ? 'special' : 'standard'
  )

  function EditionGrid({ editions, emptyMessage }: { editions: Edition[]; emptyMessage: string }) {
    if (editions.length === 0) {
      return (
        <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
          {emptyMessage}
          <div className="mt-3">
            <Link href="/submit" className="text-violet-400 hover:text-violet-300 text-sm">
              Submit an edition →
            </Link>
          </div>
        </div>
      )
    }
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {editions.map(edition => (
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
                {edition.source?.name && <p className="text-xs text-violet-400 font-medium">{edition.source.name}</p>}
                <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{edition.edition_name}</p>
                {edition.release_month && <p className="text-xs text-gray-500 mt-0.5">{edition.release_month}</p>}
                {edition.original_retail_price && <p className="text-xs text-gray-500">${edition.original_retail_price}</p>}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link href="/submit" className="text-xs text-gray-600 hover:text-violet-400 transition-colors">
            Don't see your edition? Submit it →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <section>
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('special')}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === 'special' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Special Editions
          {specialEditions.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === 'special' ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {specialEditions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('standard')}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === 'standard' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Published Editions
          {standardEditions.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === 'standard' ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {standardEditions.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'special' && (
        <EditionGrid editions={specialEditions} emptyMessage="No special editions found for this book." />
      )}
      {tab === 'standard' && (
        <EditionGrid editions={standardEditions} emptyMessage="No published editions in the database yet." />
      )}
    </section>
  )
}

import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function EditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: edition } = await supabase
    .from('edition')
    .select(`
      *,
      book:book_id (*),
      source:source_id (*)
    `)
    .eq('id', id)
    .single()

  if (!edition) notFound()

  const book = edition.book as Record<string, string>
  const source = edition.source as Record<string, string> | null

  const details = [
    { label: 'Edition Type', value: edition.edition_type?.replace('_', ' ') },
    { label: 'Source', value: source?.name },
    { label: 'Release', value: edition.release_month },
    { label: 'Publisher', value: edition.publisher },
    { label: 'ISBN', value: edition.isbn },
    { label: 'SKU', value: edition.sku },
    { label: 'Print Run', value: edition.print_run_size ? `${edition.print_run_size} copies` : null },
    { label: 'Cover Artist', value: edition.cover_artist },
    { label: 'Edge Treatment', value: edition.edge_treatment },
    { label: 'Binding', value: edition.binding },
    { label: 'Foiling', value: edition.foiling },
    { label: 'Signature', value: edition.signature_type },
    { label: 'Extras', value: edition.extras },
    { label: 'Original Price', value: edition.original_retail_price ? `£${edition.original_retail_price}` : null },
  ].filter(d => d.value)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/browse" className="text-sm text-gray-400 hover:text-white mb-6 inline-block transition-colors">
        ← Back to browse
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="w-full md:w-56 shrink-0">
          <div className="aspect-[2/3] relative bg-gray-800 rounded-xl overflow-hidden">
            {edition.cover_image ? (
              <Image
                src={edition.cover_image}
                alt={book.title}
                fill
                className="object-cover"
                sizes="224px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">No image</div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="mb-1">
            {source && (
              <span className="text-xs text-violet-400 font-medium uppercase tracking-wider">{source.name}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{book.title}</h1>
          <p className="text-gray-400 mb-1">by {book.author}</p>
          {book.series_name && (
            <p className="text-sm text-gray-500 mb-4">{book.series_name}{book.series_number ? ` #${book.series_number}` : ''}</p>
          )}
          {book.genre && (
            <Link
              href={`/browse?genre=${book.genre}`}
              className="inline-block bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full mb-4 hover:bg-gray-700 capitalize"
            >
              {book.genre}
            </Link>
          )}

          <h2 className="text-lg font-semibold text-white mb-4">{edition.edition_name}</h2>

          {/* Detail grid */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
            {details.map(d => (
              <div key={d.label}>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">{d.label}</dt>
                <dd className="text-sm text-gray-200 capitalize">{d.value}</dd>
              </div>
            ))}
          </dl>

          {/* Notes */}
          {edition.notes && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-400 leading-relaxed">
              {edition.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { createClient as anonClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const anon = anonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FIELDS: { label: string; key: string; format?: (v: unknown) => string }[] = [
  { label: 'Edition Name', key: 'edition_name' },
  { label: 'Source', key: '_source_name' },
  { label: 'Edition Type', key: 'edition_type', format: v => String(v).replace(/_/g, ' ') },
  { label: 'Publisher', key: 'publisher' },
  { label: 'Release', key: 'release_month' },
  { label: 'ISBN', key: 'isbn' },
  { label: 'Print Run', key: 'print_run_size', format: v => v ? `${v} copies` : '' },
  { label: 'Cover Artist', key: 'cover_artist' },
  { label: 'Edge Treatment', key: 'edge_treatment' },
  { label: 'Binding', key: 'binding' },
  { label: 'Foiling', key: 'foiling' },
  { label: 'Signature', key: 'signature_type' },
  { label: 'Extras', key: 'extras' },
  { label: 'Original Price', key: 'original_retail_price', format: v => v != null ? `$${Number(v).toFixed(2)}` : '' },
  { label: 'Est. Market Value', key: 'estimated_value', format: v => v != null ? `$${Number(v).toFixed(2)}` : '' },
  {
    label: 'eBay Range', key: '_ebay_range',
    format: v => String(v),
  },
]

type Edition = Record<string, unknown>

function flatten(ed: Edition): Record<string, unknown> {
  const src = ed.source as { name: string } | null
  const low = ed.ebay_price_low ? `$${Number(ed.ebay_price_low).toFixed(0)}` : null
  const high = ed.ebay_price_high ? `$${Number(ed.ebay_price_high).toFixed(0)}` : null
  return {
    ...ed,
    _source_name: src?.name ?? '',
    _ebay_range: low && high ? `${low}–${high}` : '',
  }
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { a, b } = await searchParams
  if (!a || !b) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center text-gray-500">
        <p className="text-4xl mb-4">⚖️</p>
        <p className="text-lg text-white mb-2">Edition Comparison</p>
        <p>Pass two edition IDs: <code className="text-violet-400">/compare?a=ID&b=ID</code></p>
      </div>
    )
  }

  const [{ data: edA }, { data: edB }] = await Promise.all([
    anon.from('edition').select('*, book:book_id(*), source:source_id(id, name)').eq('id', a).single(),
    anon.from('edition').select('*, book:book_id(*), source:source_id(id, name)').eq('id', b).single(),
  ])

  if (!edA || !edB) notFound()

  const bookA = edA.book as Record<string, unknown>
  const bookB = edB.book as Record<string, unknown>
  const flatA = flatten(edA as unknown as Edition)
  const flatB = flatten(edB as unknown as Edition)

  const sameBook = edA.book_id === edB.book_id

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/edition/${a}`} className="text-sm text-gray-400 hover:text-white transition-colors">← Back</Link>
        <h1 className="text-xl font-bold text-white">Compare Editions</h1>
      </div>

      {/* Header row — covers + titles */}
      <div className="grid grid-cols-[1fr_48px_1fr] gap-4 mb-8">
        {/* Edition A */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="w-28 mx-auto mb-3">
            <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden">
              {edA.cover_image ? (
                <Image src={String(edA.cover_image)} alt={String(edA.edition_name)} fill className="object-cover" sizes="112px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-2xl">📚</div>
              )}
            </div>
          </div>
          <p className="text-xs text-violet-400 font-medium">{flatA._source_name as string || '—'}</p>
          <p className="text-sm font-semibold text-white mt-1 leading-snug">{String(edA.edition_name)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{String(bookA.title)}</p>
          {!sameBook && (
            <p className="text-xs text-amber-500 mt-1">Different book</p>
          )}
        </div>

        {/* VS badge */}
        <div className="flex items-center justify-center">
          <span className="text-xs font-bold text-gray-600 bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center">VS</span>
        </div>

        {/* Edition B */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="w-28 mx-auto mb-3">
            <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden">
              {edB.cover_image ? (
                <Image src={String(edB.cover_image)} alt={String(edB.edition_name)} fill className="object-cover" sizes="112px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-2xl">📚</div>
              )}
            </div>
          </div>
          <p className="text-xs text-violet-400 font-medium">{flatB._source_name as string || '—'}</p>
          <p className="text-sm font-semibold text-white mt-1 leading-snug">{String(edB.edition_name)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{String(bookB.title)}</p>
          {!sameBook && (
            <p className="text-xs text-amber-500 mt-1">Different book</p>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {FIELDS.map((field, i) => {
          const rawA = flatA[field.key]
          const rawB = flatB[field.key]
          const valA = field.format ? (rawA != null && rawA !== '' ? field.format(rawA) : '') : (rawA != null ? String(rawA) : '')
          const valB = field.format ? (rawB != null && rawB !== '' ? field.format(rawB) : '') : (rawB != null ? String(rawB) : '')
          const hasA = valA !== ''
          const hasB = valB !== ''
          const differ = valA !== valB && (hasA || hasB)

          if (!hasA && !hasB) return null

          return (
            <div
              key={field.key}
              className={`grid grid-cols-[1fr_120px_1fr] ${i % 2 === 0 ? '' : 'bg-gray-800/30'} ${differ ? 'border-l-2 border-amber-500/60' : ''}`}
            >
              {/* A value */}
              <div className={`px-5 py-3 text-sm ${differ && hasA ? 'text-white' : 'text-gray-400'}`}>
                {hasA ? valA : <span className="text-gray-700">—</span>}
              </div>
              {/* Label */}
              <div className="px-3 py-3 text-xs text-gray-500 text-center flex items-center justify-center border-x border-gray-800">
                {field.label}
              </div>
              {/* B value */}
              <div className={`px-5 py-3 text-sm ${differ && hasB ? 'text-white' : 'text-gray-400'}`}>
                {hasB ? valB : <span className="text-gray-700">—</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <p className="text-xs text-gray-600 mt-4 flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-amber-500/60 rounded-sm" />
        Amber border = values differ
      </p>

      {/* Action links */}
      <div className="flex gap-4 mt-6">
        <Link href={`/edition/${a}`} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          View edition A →
        </Link>
        <Link href={`/edition/${b}`} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          View edition B →
        </Link>
      </div>
    </div>
  )
}

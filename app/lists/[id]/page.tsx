import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ListItemRemoveButton from './ListItemRemoveButton'

const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: list } = await supabase
    .from('user_list')
    .select('id, name, description, is_public, user_id, created_at')
    .eq('id', id)
    .single()

  if (!list) notFound()
  if (!list.is_public && list.user_id !== user?.id) redirect('/')

  const { data: items } = await supabase
    .from('user_list_item')
    .select(`
      id, notes, added_at,
      edition:edition_id ( id, edition_name, cover_image, estimated_value, original_retail_price,
        book:book_id ( title, author ),
        source:source_id ( name )
      )
    `)
    .eq('list_id', id)
    .order('added_at', { ascending: false })

  const isOwner = user?.id === list.user_id

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/lists" className="text-sm text-gray-500 hover:text-white transition-colors">← My Lists</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{list.name}</h1>
          {list.description && <p className="text-sm text-gray-500 mt-1">{list.description}</p>}
          <p className="text-xs text-gray-600 mt-2">
            {items?.length ?? 0} edition{items?.length !== 1 ? 's' : ''}
            {list.is_public && <span className="ml-2 text-gray-600 border border-gray-800 px-1.5 py-0.5 rounded">Public</span>}
          </p>
        </div>
        {isOwner && (
          <Link href="/browse" className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-colors">
            + Add Editions
          </Link>
        )}
      </div>

      {!items?.length ? (
        <div className="text-center py-20 text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl">
          No editions yet.{isOwner && <> <Link href="/browse" className="text-violet-400 hover:underline">Browse editions</Link> to add some.</>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map(item => {
            const ed = item.edition as {
              id: string; edition_name: string; cover_image?: string
              estimated_value?: number; original_retail_price?: number
              book: { title: string; author: string } | null
              source: { name: string } | null
            } | null
            if (!ed) return null
            const price = ed.estimated_value ?? ed.original_retail_price
            return (
              <div key={item.id} className="group relative">
                <Link href={`/edition/${ed.id}`} className="flex flex-col bg-gray-900 border border-gray-800 hover:border-violet-500 rounded-xl overflow-hidden transition-colors">
                  <div className="aspect-[2/3] relative bg-gray-800">
                    {ed.cover_image ? (
                      <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="200px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center p-2">{ed.edition_name}</div>
                    )}
                  </div>
                  <div className="p-3">
                    {ed.source && <p className="text-xs text-violet-400 font-medium">{ed.source.name}</p>}
                    <p className="text-xs text-gray-200 font-medium mt-0.5 line-clamp-2">{ed.book?.title}</p>
                    {price && <p className="text-xs text-emerald-400 mt-1">${Number(price).toFixed(0)}</p>}
                  </div>
                </Link>
                {isOwner && (
                  <ListItemRemoveButton listId={id} editionId={ed.id} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

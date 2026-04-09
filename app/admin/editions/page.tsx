import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminEditionSearch from './AdminEditionSearch'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

const anon = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SearchParams { q?: string }

export default async function AdminEditionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const { data: sources } = await anon.from('source').select('id, name').order('name')

  let editionQuery = anon
    .from('edition')
    .select('id, edition_name, edition_type, cover_image, original_retail_price, estimated_value, isbn, book:book_id(title, author), source:source_id(name)')
    .order('edition_name')
    .limit(50)

  if (search) editionQuery = editionQuery.ilike('edition_name', `%${search}%`)

  const { data: editions } = await editionQuery

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-white transition-colors">← Admin</Link>
        <h1 className="text-xl font-bold text-white">Edit Editions</h1>
      </div>

      <AdminEditionSearch
        initialEditions={(editions ?? []) as Parameters<typeof AdminEditionSearch>[0]['initialEditions']}
        sources={(sources ?? []) as { id: string; name: string }[]}
        initialQuery={search}
      />
    </div>
  )
}

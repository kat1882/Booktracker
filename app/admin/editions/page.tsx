import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import AdminEditionSearch from './AdminEditionSearch'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'
const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface SearchParams { q?: string; field?: string }

export default async function AdminEditionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const { q, field } = await searchParams
  const search = q?.trim() ?? ''
  const searchField = field ?? 'edition'

  const { data: sources } = await anon.from('source').select('id, name').order('name')

  const selectFields = 'id, book_id, edition_name, edition_type, cover_image, original_retail_price, estimated_value, price_override, isbn, set_size, publisher, release_month, print_run_size, cover_artist, edge_treatment, binding, foiling, signature_type, extras, notes, sku, mercari_median, ebay_median, value_updated_at, book:book_id(id, title, author), source:source_id(id, name)'

  let query = anon.from('edition').select(selectFields).order('edition_name').limit(60)

  if (search) {
    if (searchField === 'title') {
      query = query.ilike('book.title', `%${search}%`)
    } else if (searchField === 'author') {
      query = query.ilike('book.author', `%${search}%`)
    } else if (searchField === 'source') {
      query = query.ilike('source.name', `%${search}%`)
    } else {
      query = query.ilike('edition_name', `%${search}%`)
    }
  }

  const { data: editions } = await query

  return (
    <AdminShell title="Editions">
      <AdminEditionSearch
        initialEditions={(editions ?? []) as any}
        sources={(sources ?? []) as { id: string; name: string }[]}
        initialQuery={search}
        initialField={searchField}
      />
    </AdminShell>
  )
}

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import EditionGalleryAdmin from './EditionGalleryAdmin'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; source?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const { filter, source, page: pageStr } = await searchParams
  const activeFilter = filter ?? 'all'
  const activeSource = source ?? ''
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const PAGE_SIZE = 60
  const offset = (page - 1) * PAGE_SIZE

  // Build query based on filter
  let query = supabase
    .from('edition')
    .select('id, edition_name, edition_type, cover_image, release_month, source:source_id(id, name), book:book_id(title, author)', { count: 'exact' })
    .order('edition_name', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (activeFilter === 'no_cover')  query = query.is('cover_image', null)
  if (activeFilter === 'no_month')  query = query.is('release_month', null)
  if (activeFilter === 'no_source') query = query.is('source_id', null)

  const { data: editions, count } = await query

  // Filter by source client-side after (Supabase join filter is complex)
  const filtered = activeSource
    ? (editions ?? []).filter((e: any) => e.source?.name === activeSource)
    : (editions ?? [])

  // Counts for filter badges
  const [{ count: noCovers }, { count: noMonths }, { count: noSources }] = await Promise.all([
    supabase.from('edition').select('id', { count: 'exact', head: true }).is('cover_image', null),
    supabase.from('edition').select('id', { count: 'exact', head: true }).is('release_month', null),
    supabase.from('edition').select('id', { count: 'exact', head: true }).is('source_id', null),
  ])

  // Source list for filter
  const { data: sources } = await supabase
    .from('source')
    .select('id, name')
    .eq('type', 'subscription_box')
    .order('name')

  return (
    <AdminShell title="Edition Gallery">
      <EditionGalleryAdmin
        editions={filtered as any}
        totalCount={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        activeFilter={activeFilter}
        activeSource={activeSource}
        noCovers={noCovers ?? 0}
        noMonths={noMonths ?? 0}
        noSources={noSources ?? 0}
        sources={(sources ?? []) as { id: string; name: string }[]}
      />
    </AdminShell>
  )
}

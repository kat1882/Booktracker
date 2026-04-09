import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ListsClient from './ListsClient'

export default async function ListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: lists } = await supabase
    .from('user_list')
    .select('id, name, description, is_public, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Count items per list
  const listIds = (lists ?? []).map(l => l.id)
  const { data: itemCounts } = listIds.length > 0
    ? await supabase.from('user_list_item').select('list_id').in('list_id', listIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const row of itemCounts ?? []) {
    countMap[row.list_id] = (countMap[row.list_id] ?? 0) + 1
  }

  const listsWithCounts = (lists ?? []).map(l => ({ ...l, item_count: countMap[l.id] ?? 0 }))

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">My Lists</h1>
      </div>
      <ListsClient initialLists={listsWithCounts} />
    </div>
  )
}

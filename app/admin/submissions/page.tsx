import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ApprovalQueue from './ApprovalQueue'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export default async function AdminSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const { data: submissions } = await supabase
    .from('edition_submission')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const counts = await supabase
    .from('edition_submission')
    .select('status', { count: 'exact' })
    .neq('status', 'pending')

  const { count: total } = await supabase
    .from('edition_submission')
    .select('*', { count: 'exact', head: true })

  const { count: approved } = await supabase
    .from('edition_submission')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { count: rejected } = await supabase
    .from('edition_submission')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected')

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Submission Queue</h1>
        <div className="flex gap-4 text-sm text-gray-500">
          <span><span className="text-yellow-400 font-medium">{submissions?.length ?? 0}</span> pending</span>
          <span><span className="text-green-400 font-medium">{approved ?? 0}</span> approved</span>
          <span><span className="text-red-400 font-medium">{rejected ?? 0}</span> rejected</span>
          <span><span className="text-gray-300 font-medium">{total ?? 0}</span> total</span>
        </div>
      </div>

      <ApprovalQueue initialSubmissions={submissions ?? []} />
    </div>
  )
}

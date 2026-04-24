import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import ApprovalQueue from './ApprovalQueue'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const { status: statusParam } = await searchParams
  const activeStatus = statusParam === 'approved' ? 'approved' : statusParam === 'rejected' ? 'rejected' : 'pending'

  const { data: submissions } = await supabase
    .from('edition_submission')
    .select('*')
    .eq('status', activeStatus)
    .order('created_at', { ascending: activeStatus === 'pending' })
    .limit(100)

  const [{ count: pending }, { count: approved }, { count: rejected }] = await Promise.all([
    supabase.from('edition_submission').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('edition_submission').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('edition_submission').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ])

  return (
    <AdminShell title="Submission Queue">
      <div className="flex gap-3 mb-8">
        {[
          { label: 'Pending', value: pending ?? 0, status: 'pending', color: 'text-yellow-400 border-yellow-700/50' },
          { label: 'Approved', value: approved ?? 0, status: 'approved', color: 'text-emerald-400 border-emerald-700/50' },
          { label: 'Rejected', value: rejected ?? 0, status: 'rejected', color: 'text-red-400 border-red-700/50' },
        ].map(tab => (
          <a
            key={tab.status}
            href={`/admin/submissions?status=${tab.status}`}
            className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              activeStatus === tab.status
                ? `bg-slate-800 ${tab.color}`
                : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            {tab.label} <span className="ml-1 font-mono">{tab.value}</span>
          </a>
        ))}
      </div>

      <ApprovalQueue initialSubmissions={submissions ?? []} activeStatus={activeStatus} />
    </AdminShell>
  )
}

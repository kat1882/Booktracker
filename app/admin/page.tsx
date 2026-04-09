import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

const anon = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const [
    { count: editionCount },
    { count: bookCount },
    { count: pendingCount },
    { count: userCount },
    { count: pricedCount },
  ] = await Promise.all([
    anon.from('edition').select('*', { count: 'exact', head: true }),
    anon.from('book').select('*', { count: 'exact', head: true }),
    supabase.from('edition_submission').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    anon.from('user_profile').select('*', { count: 'exact', head: true }),
    anon.from('edition').select('*', { count: 'exact', head: true }).not('estimated_value', 'is', null),
  ])

  const tools = [
    { href: '/admin/submissions', label: 'Submission Queue', desc: `${pendingCount ?? 0} pending`, color: 'text-yellow-400', icon: '📬' },
    { href: '/admin/editions', label: 'Edit Editions', desc: 'Search and edit any edition', color: 'text-violet-400', icon: '✏️' },
    { href: '/admin/books', label: 'Merge Books', desc: 'Fix duplicate book entries', color: 'text-blue-400', icon: '🔗' },
    { href: '/admin/sources', label: 'Manage Sources', desc: 'Add and edit sources', color: 'text-pink-400', icon: '📦' },
    { href: '/admin/calendar', label: 'Release Calendar', desc: 'Manage upcoming box releases', color: 'text-emerald-400', icon: '📅' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Only visible to you</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        {[
          { label: 'Editions', value: editionCount?.toLocaleString() ?? '—', color: 'text-violet-400' },
          { label: 'Books', value: bookCount?.toLocaleString() ?? '—', color: 'text-blue-400' },
          { label: 'Priced', value: pricedCount?.toLocaleString() ?? '—', color: 'text-emerald-400' },
          { label: 'Users', value: userCount?.toLocaleString() ?? '—', color: 'text-white' },
          { label: 'Pending', value: pendingCount?.toLocaleString() ?? '—', color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-start gap-4 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors group"
          >
            <span className="text-2xl">{t.icon}</span>
            <div>
              <p className={`font-semibold ${t.color} group-hover:opacity-80`}>{t.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

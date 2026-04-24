import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminShell from './AdminShell'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'
const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
    { count: reportCount },
    { count: sourceCount },
  ] = await Promise.all([
    anon.from('edition').select('*', { count: 'exact', head: true }),
    anon.from('book').select('*', { count: 'exact', head: true }),
    supabase.from('edition_submission').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    anon.from('user_profile').select('*', { count: 'exact', head: true }),
    anon.from('edition').select('*', { count: 'exact', head: true }).not('estimated_value', 'is', null),
    supabase.from('pricing_report').select('*', { count: 'exact', head: true }),
    anon.from('source').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Editions', value: editionCount?.toLocaleString() ?? '—', color: 'text-violet-400' },
    { label: 'Books', value: bookCount?.toLocaleString() ?? '—', color: 'text-blue-400' },
    { label: 'Priced', value: pricedCount?.toLocaleString() ?? '—', color: 'text-emerald-400' },
    { label: 'Sources', value: sourceCount?.toLocaleString() ?? '—', color: 'text-pink-400' },
    { label: 'Users', value: userCount?.toLocaleString() ?? '—', color: 'text-white' },
    { label: 'Pending', value: pendingCount?.toLocaleString() ?? '—', color: 'text-yellow-400' },
    { label: 'Reports', value: reportCount?.toLocaleString() ?? '—', color: 'text-red-400' },
  ]

  const tools = [
    { href: '/admin/submissions',     label: 'Submissions',      desc: `${pendingCount ?? 0} pending`,             icon: 'inbox',          color: 'text-yellow-400' },
    { href: '/admin/editions',        label: 'Editions',         desc: 'Search and edit any edition',              icon: 'menu_book',      color: 'text-violet-400' },
    { href: '/admin/books',           label: 'Books',            desc: 'Edit and merge duplicate books',           icon: 'library_books',  color: 'text-blue-400' },
    { href: '/admin/sources',         label: 'Sources',          desc: `${sourceCount ?? 0} sources`,              icon: 'storefront',     color: 'text-pink-400' },
    { href: '/admin/pricing-reports', label: 'Price Reports',    desc: `${reportCount ?? 0} user flags`,          icon: 'flag',           color: 'text-red-400' },
    { href: '/admin/calendar',        label: 'Release Calendar', desc: 'Manage upcoming box releases',            icon: 'calendar_month', color: 'text-emerald-400' },
  ]

  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-10">
        {stats.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-start gap-4 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-5 transition-colors group"
          >
            <span className="material-symbols-outlined text-2xl text-slate-600 group-hover:text-slate-400 transition-colors">{t.icon}</span>
            <div>
              <p className={`font-semibold ${t.color}`}>{t.label}</p>
              <p className="text-sm text-slate-500 mt-0.5">{t.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </AdminShell>
  )
}

import { createClient } from '@/lib/supabase-server'
import { createClient as anonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminCalendarClient from './AdminCalendarClient'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

const anon = anonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function AdminCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id !== ADMIN_USER_ID) redirect('/')

  const [{ data: entries }, { data: sources }] = await Promise.all([
    anon
      .from('release_calendar')
      .select('*, source:source_id(id, name)')
      .order('release_date', { ascending: true }),
    anon.from('source').select('id, name').order('name'),
  ])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Manage Release Calendar</h1>
      <AdminCalendarClient
        initialEntries={entries ?? []}
        sources={sources ?? []}
      />
    </div>
  )
}

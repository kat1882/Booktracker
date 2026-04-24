import { createClient } from '@/lib/supabase-server'
import { createClient as anonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import AdminCalendarClient from './AdminCalendarClient'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'
const anon = anonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default async function AdminCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id !== ADMIN_USER_ID) redirect('/')

  const [{ data: entries }, { data: sources }] = await Promise.all([
    anon.from('release_calendar').select('*, source:source_id(id, name)').order('release_date', { ascending: true }),
    anon.from('source').select('id, name').order('name'),
  ])

  return (
    <AdminShell title="Release Calendar">
      <AdminCalendarClient initialEntries={entries ?? []} sources={sources ?? []} />
    </AdminShell>
  )
}

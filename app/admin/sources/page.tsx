import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import SourcesManager from './SourcesManager'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'
const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default async function AdminSourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const { data: sources } = await anon
    .from('source')
    .select('id, name, type, website')
    .order('name')

  return (
    <AdminShell title="Sources">
      <SourcesManager initialSources={sources ?? []} />
    </AdminShell>
  )
}

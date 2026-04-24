import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import BookMergeTool from './BookMergeTool'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export default async function AdminBooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  return (
    <AdminShell title="Books">
      <p className="text-sm text-slate-500 mb-6 max-w-xl">
        Search for a book title to find duplicates. Select a canonical (keeper) book, then merge all editions and collection entries from the duplicate into it.
      </p>
      <BookMergeTool />
    </AdminShell>
  )
}

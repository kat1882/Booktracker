import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BookMergeTool from './BookMergeTool'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export default async function AdminBooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-white transition-colors">← Admin</Link>
        <h1 className="text-xl font-bold text-white">Merge Duplicate Books</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Search for a book title to find duplicates. Select a canonical (keeper) book, then merge all editions and collection entries from the duplicate into it.
      </p>
      <BookMergeTool />
    </div>
  )
}

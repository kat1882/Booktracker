import { createClient } from '@/lib/supabase-server'
import SubmitForm from './SubmitForm'

export default async function SubmitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Submit a Special Edition</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Know of a subscription box exclusive, signed edition, or collector variant that isn&apos;t in our database?
          Submit it here and we&apos;ll review it within a few days.
        </p>
      </div>

      <SubmitForm userEmail={user?.email} />
    </div>
  )
}

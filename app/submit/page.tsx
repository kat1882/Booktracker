import { createClient } from '@/lib/supabase-server'
import SubmitForm from './SubmitForm'

export default async function SubmitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
      <div className="mb-10">
        <p className="text-violet-400 uppercase tracking-[0.2em] text-xs font-bold mb-2 font-mono">Community Archive</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">New Edition Registration</h1>
        <p className="text-slate-400 max-w-xl leading-relaxed">
          Know of a subscription box exclusive, signed edition, or collector variant that isn&apos;t in our database?
          Catalog it here — every detail preserved, every history secured in the Shelfworth archive.
        </p>
      </div>

      <SubmitForm userEmail={user?.email} />
    </div>
  )
}

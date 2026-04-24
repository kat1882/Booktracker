import { createClient } from '@/lib/supabase-server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import PricingReportsClient from './PricingReportsClient'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'
const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default async function AdminPricingReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect('/')

  const { data: reports } = await supabase
    .from('pricing_report')
    .select('id, reason, note, created_at, edition_id, user_id')
    .order('created_at', { ascending: false })
    .limit(200)

  const editionIds = [...new Set((reports ?? []).map(r => r.edition_id))]
  const { data: editions } = editionIds.length
    ? await anon
        .from('edition')
        .select('id, edition_name, cover_image, estimated_value, price_override, mercari_median, ebay_median, book:book_id(title, author), source:source_id(name)')
        .in('id', editionIds)
    : { data: [] }

  const editionMap = Object.fromEntries((editions ?? []).map(e => [e.id, e]))

  const enriched = (reports ?? []).map(r => ({
    ...r,
    edition: editionMap[r.edition_id] ?? null,
  }))

  return (
    <AdminShell title="Pricing Reports">
      <PricingReportsClient reports={enriched} />
    </AdminShell>
  )
}

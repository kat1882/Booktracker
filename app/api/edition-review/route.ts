import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { edition_id, body, overall_rating, physical_quality, extras_quality, value_for_money } = await request.json()
  if (!edition_id) return NextResponse.json({ error: 'edition_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('edition_review')
    .upsert({
      edition_id,
      user_id: user.id,
      body: body ?? null,
      overall_rating: overall_rating ?? null,
      physical_quality: physical_quality ?? null,
      extras_quality: extras_quality ?? null,
      value_for_money: value_for_money ?? null,
    }, { onConflict: 'edition_id,user_id' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const editionId = searchParams.get('edition_id')
  if (!editionId) return NextResponse.json({ reviews: [] })

  const supabase = await createClient()

  const { data: reviews } = await supabase
    .from('edition_review')
    .select('id, body, overall_rating, physical_quality, extras_quality, value_for_money, created_at, user_id')
    .eq('edition_id', editionId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!reviews || reviews.length === 0) return NextResponse.json({ reviews: [] })

  const userIds = reviews.map(r => r.user_id)
  const { data: profiles } = await supabase
    .from('user_profile')
    .select('id, username')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.username]))
  const enriched = reviews.map(r => ({ ...r, username: profileMap[r.user_id] ?? 'Unknown' }))

  return NextResponse.json({ reviews: enriched })
}

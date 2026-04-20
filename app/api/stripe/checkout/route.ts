import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://booktracker-gray.vercel.app'

  let userId: string
  let userEmail: string | undefined
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${baseUrl}/auth/login`, 303)
    userId = user.id
    userEmail = user.email
  } catch (err) {
    return NextResponse.redirect(`${baseUrl}/upgrade?error=${encodeURIComponent('Auth: ' + (err as Error).message)}`, 303)
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      httpClient: Stripe.createFetchHttpClient(),
    })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${baseUrl}/collection?upgraded=1`,
      cancel_url: `${baseUrl}/upgrade`,
      metadata: { supabase_id: userId },
      subscription_data: { metadata: { supabase_id: userId } },
    })
    if (!session.url) {
      return NextResponse.redirect(`${baseUrl}/upgrade?error=${encodeURIComponent('No session URL')}`, 303)
    }
    return NextResponse.redirect(session.url, 303)
  } catch (err) {
    return NextResponse.redirect(`${baseUrl}/upgrade?error=${encodeURIComponent('Stripe: ' + (err as Error).message)}`, 303)
  }
}

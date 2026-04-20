import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  httpClient: Stripe.createFetchHttpClient(),
})

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const status = subscription.status
  const isPro = status === 'active' || status === 'trialing'

  await adminSupabase
    .from('user_profile')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: status,
      is_pro: isPro,
    })
    .eq('stripe_customer_id', customerId)
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${(err as Error).message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.subscription) {
        const supabaseId = session.metadata?.supabase_id
        if (supabaseId && session.customer) {
          await adminSupabase
            .from('user_profile')
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', supabaseId)
        }
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        await syncSubscription(subscription)
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
  }

  return NextResponse.json({ received: true })
}

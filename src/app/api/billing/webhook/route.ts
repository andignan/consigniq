import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Use service role client for webhook — no user session available
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Webhook signature verification failed:', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const accountId = session.metadata?.account_id
        const tier = session.metadata?.tier

        if (accountId && tier) {
          await supabase
            .from('accounts')
            .update({ tier })
            .eq('id', accountId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        // Look up account by stripe_customer_id
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (account && subscription.metadata?.tier) {
          await supabase
            .from('accounts')
            .update({ tier: subscription.metadata.tier })
            .eq('id', account.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (account) {
          await supabase
            .from('accounts')
            .update({ tier: 'starter' })
            .eq('id', account.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id

        if (customerId) {
          console.warn(`Payment failed for customer ${customerId}`)
          // Note: We do NOT downgrade immediately on payment failure.
          // Stripe will retry and eventually delete the subscription if payment continues to fail.
        }
        break
      }

      default:
        // Unhandled event type
        break
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Still return 200 to prevent Stripe retries for processing errors
  }

  return NextResponse.json({ received: true })
}

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { buildUpgradeEmail, buildCancellationEmail, buildPaymentFailedEmail } from '@/lib/email-templates'
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

// Use service role client for webhook — no user session available
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper to get account owner's email and name
async function getAccountOwner(supabase: ReturnType<typeof getServiceClient>, accountId: string) {
  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('account_id', accountId)
    .eq('role', 'owner')
    .single()
  return data
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const accountId = session.metadata?.account_id

        if (session.metadata?.product === 'topup_50' && accountId) {
          // Add 50 bonus lookups
          const { data: account } = await supabase
            .from('accounts')
            .select('bonus_lookups')
            .eq('id', accountId)
            .single()

          if (account) {
            await supabase
              .from('accounts')
              .update({ bonus_lookups: (account.bonus_lookups ?? 0) + 50 })
              .eq('id', accountId)
          }
        } else if (accountId && session.metadata?.tier) {
          const tier = session.metadata.tier as Tier
          // Tier upgrade
          await supabase
            .from('accounts')
            .update({ tier })
            .eq('id', accountId)

          // If this was a trial account, convert to paid
          await supabase
            .from('accounts')
            .update({ account_type: 'paid', trial_ends_at: null })
            .eq('id', accountId)

          // Send upgrade confirmation email
          try {
            const owner = await getAccountOwner(supabase, accountId)
            if (owner?.email) {
              const tierConfig = TIER_CONFIGS[tier] ?? TIER_CONFIGS.starter
              const emailContent = buildUpgradeEmail({
                fullName: owner.full_name || owner.email,
                tierLabel: tierConfig.label,
                tierPrice: tierConfig.price,
                dashboardUrl: `${appUrl}/dashboard`,
              })
              await sendEmail({ to: owner.email, ...emailContent })
            }
          } catch (emailErr) {
            console.error('Failed to send upgrade email:', emailErr)
          }
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
          .select('id, tier')
          .eq('stripe_customer_id', customerId)
          .single()

        if (account) {
          const previousTier = (account.tier || 'starter') as Tier
          await supabase
            .from('accounts')
            .update({ tier: 'starter' })
            .eq('id', account.id)

          // Send cancellation email
          try {
            const owner = await getAccountOwner(supabase, account.id)
            if (owner?.email) {
              const tierConfig = TIER_CONFIGS[previousTier] ?? TIER_CONFIGS.starter
              const emailContent = buildCancellationEmail({
                fullName: owner.full_name || owner.email,
                tierLabel: tierConfig.label,
                resubscribeUrl: `${appUrl}/dashboard/settings?tab=account`,
              })
              await sendEmail({ to: owner.email, ...emailContent })
            }
          } catch (emailErr) {
            console.error('Failed to send cancellation email:', emailErr)
          }
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

          // Send payment failed email
          try {
            const { data: account } = await supabase
              .from('accounts')
              .select('id')
              .eq('stripe_customer_id', customerId)
              .single()

            if (account) {
              const owner = await getAccountOwner(supabase, account.id)
              if (owner?.email) {
                const emailContent = buildPaymentFailedEmail({
                  fullName: owner.full_name || owner.email,
                  portalUrl: `${appUrl}/dashboard/settings?tab=account`,
                })
                await sendEmail({ to: owner.email, ...emailContent })
              }
            }
          } catch (emailErr) {
            console.error('Failed to send payment failed email:', emailErr)
          }
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

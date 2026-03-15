import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import {
  buildUpgradeEmail, buildCancellationEmail, buildPaymentFailedEmail,
  buildPaymentFinalWarningEmail, buildWelcomeBackEmail,
} from '@/lib/email-templates'
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

// Use service role client for webhook — no user session available
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

          // Check if this is a resubscription (cancelled_grace or cancelled_limited)
          const { data: currentAccount } = await supabase
            .from('accounts')
            .select('account_type')
            .eq('id', accountId)
            .single()

          const isResub = currentAccount?.account_type === 'cancelled_grace' || currentAccount?.account_type === 'cancelled_limited'

          // Update tier and clear cancellation fields
          await supabase
            .from('accounts')
            .update({
              tier,
              account_type: 'paid',
              trial_ends_at: null,
              subscription_cancelled_at: null,
              subscription_period_end: null,
              cancelled_tier: null,
            })
            .eq('id', accountId)

          // Send appropriate email
          try {
            const owner = await getAccountOwner(supabase, accountId)
            if (owner?.email) {
              const tierConfig = TIER_CONFIGS[tier] ?? TIER_CONFIGS.starter
              if (isResub) {
                const emailContent = buildWelcomeBackEmail({
                  fullName: owner.full_name || owner.email,
                  tierLabel: tierConfig.label,
                  dashboardUrl: `${appUrl}/dashboard`,
                })
                await sendEmail({ to: owner.email, ...emailContent })
              } else {
                const emailContent = buildUpgradeEmail({
                  fullName: owner.full_name || owner.email,
                  tierLabel: tierConfig.label,
                  tierPrice: tierConfig.price,
                  dashboardUrl: `${appUrl}/dashboard`,
                })
                await sendEmail({ to: owner.email, ...emailContent })
              }
            }
          } catch (emailErr) {
            console.error('Failed to send email:', emailErr)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number }
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        const { data: account } = await supabase
          .from('accounts')
          .select('id, account_type')
          .eq('stripe_customer_id', customerId)
          .single()

        if (account) {
          const updates: Record<string, unknown> = {}

          // Sync tier from metadata if available
          if (subscription.metadata?.tier) {
            updates.tier = subscription.metadata.tier
          }

          // Update period_end
          if (subscription.current_period_end) {
            updates.subscription_period_end = new Date(subscription.current_period_end * 1000).toISOString()
          }

          // If subscription is active again (resubscribe via Stripe portal)
          if (subscription.status === 'active' &&
              (account.account_type === 'cancelled_grace' || account.account_type === 'cancelled_limited')) {
            updates.account_type = 'paid'
            updates.subscription_cancelled_at = null
            updates.cancelled_tier = null

            // Send welcome back email
            try {
              const owner = await getAccountOwner(supabase, account.id)
              if (owner?.email) {
                const tier = (subscription.metadata?.tier || 'starter') as Tier
                const tierConfig = TIER_CONFIGS[tier] ?? TIER_CONFIGS.starter
                const emailContent = buildWelcomeBackEmail({
                  fullName: owner.full_name || owner.email,
                  tierLabel: tierConfig.label,
                  dashboardUrl: `${appUrl}/dashboard`,
                })
                await sendEmail({ to: owner.email, ...emailContent })
              }
            } catch {
              // Non-critical
            }
          }

          if (subscription.status === 'past_due') {
            console.warn(`Subscription past_due for customer ${customerId}`)
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from('accounts').update(updates).eq('id', account.id)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number }
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        const { data: account } = await supabase
          .from('accounts')
          .select('id, tier')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!account) {
          console.warn(`No account found for Stripe customer ${customerId} on subscription.deleted`)
          break
        }

        const previousTier = (account.tier || 'starter') as Tier
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : new Date().toISOString()

        // Set to cancelled_grace — user keeps access until period_end
        // Do NOT change tier yet
        await supabase
          .from('accounts')
          .update({
            account_type: 'cancelled_grace',
            subscription_cancelled_at: new Date().toISOString(),
            cancelled_tier: previousTier,
            subscription_period_end: periodEnd,
          })
          .eq('id', account.id)

        // Send cancellation confirmation email
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
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id
        const attemptCount = invoice.attempt_count ?? 1

        if (customerId) {
          try {
            const { data: account } = await supabase
              .from('accounts')
              .select('id')
              .eq('stripe_customer_id', customerId)
              .single()

            if (account) {
              const owner = await getAccountOwner(supabase, account.id)
              if (owner?.email) {
                if (attemptCount >= 3) {
                  const emailContent = buildPaymentFinalWarningEmail({
                    fullName: owner.full_name || owner.email,
                    portalUrl: `${appUrl}/dashboard/settings?tab=account`,
                  })
                  await sendEmail({ to: owner.email, ...emailContent })
                } else {
                  const emailContent = buildPaymentFailedEmail({
                    fullName: owner.full_name || owner.email,
                    portalUrl: `${appUrl}/dashboard/settings?tab=account`,
                  })
                  await sendEmail({ to: owner.email, ...emailContent })
                }
              }
            }
          } catch (emailErr) {
            console.error('Failed to send payment failed email:', emailErr)
          }
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  return NextResponse.json({ received: true })
}

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

function getTierPriceId(tier: string): string | undefined {
  if (tier === 'solo') return process.env.STRIPE_SOLO_PRICE_ID
  if (tier === 'starter') return process.env.STRIPE_STARTER_PRICE_ID
  if (tier === 'standard') return process.env.STRIPE_STANDARD_PRICE_ID
  if (tier === 'pro') return process.env.STRIPE_PRO_PRICE_ID
  return undefined
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('account_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Only account owners can manage billing' }, { status: 403 })
  }

  let stripe
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ error: 'Billing setup in progress' }, { status: 503 })
  }

  const body = await request.json()

  // Get or create Stripe customer (shared between tier upgrade and top-up)
  const { data: account } = await supabase
    .from('accounts')
    .select('id, stripe_customer_id, name')
    .eq('id', profile.account_id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  let customerId = account.stripe_customer_id

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: account.name,
        metadata: { account_id: account.id },
      })
      customerId = customer.id

      await supabase
        .from('accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', account.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Stripe customer creation failed:', msg)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle top-up purchase
  if (body.product === 'topup_50') {
    const topupPriceId = process.env.STRIPE_TOPUP_50_PRICE_ID
    if (!topupPriceId) {
      return NextResponse.json({ error: 'Top-up pricing not configured' }, { status: 500 })
    }

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{ price: topupPriceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?billing=success`,
        cancel_url: `${appUrl}/dashboard/settings?tab=account`,
        metadata: { account_id: account.id, product: 'topup_50' },
      })

      return NextResponse.json({ url: session.url })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Stripe top-up checkout failed:', msg)
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }
  }

  // Handle tier subscription checkout
  const { tier } = body as { tier?: string }

  const priceId = tier ? getTierPriceId(tier) : undefined
  if (!tier || !priceId) {
    return NextResponse.json({ error: 'Invalid tier. Must be "solo", "starter", "standard", or "pro"' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard/settings?tab=account`,
      metadata: { account_id: account.id, tier },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Stripe checkout failed:', msg)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

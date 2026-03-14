import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const { data: account } = await supabase
    .from('accounts')
    .select('stripe_customer_id')
    .eq('id', profile.account_id)
    .single()

  if (!account?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found. Subscribe to a plan first.' }, { status: 404 })
  }

  try {
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${appUrl}/dashboard/settings?tab=account`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Stripe portal failed:', msg)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}

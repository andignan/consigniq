import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'

// M6: Removed unused request parameter
export async function POST() {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string; role: string }>(supabase, 'account_id, role')
  if (auth.error) return auth.error

  if (auth.profile.role !== 'owner') {
    return NextResponse.json({ error: ERRORS.OWNER_REQUIRED }, { status: 403 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('stripe_customer_id')
    .eq('id', auth.profile.account_id)
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

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'
import type { PricingVenue } from '@/types/database'

const VALID_VENUES: PricingVenue[] = ['online_resale', 'brick_and_mortar']

export async function PATCH(request: Request) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string }>(supabase)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const venue = body?.pricing_venue as PricingVenue | undefined

  if (!venue || !VALID_VENUES.includes(venue)) {
    return NextResponse.json(
      { error: `${ERRORS.INVALID_INPUT}: pricing_venue must be one of ${VALID_VENUES.join(', ')}` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('accounts')
    .update({ pricing_venue: venue })
    .eq('id', auth.profile.account_id)
    .select('id, pricing_venue')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account: data })
}

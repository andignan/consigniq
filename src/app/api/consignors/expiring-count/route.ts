// I1: Single-query expiring consignor count endpoint
// Replaces N+1 per-location fetches in the sidebar
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile(supabase)
  if (auth.error) return auth.error

  const locationId = request.nextUrl.searchParams.get('location_id')

  // Single query: fetch all non-closed consignors for the account (or location)
  let query = supabase
    .from('consignors')
    .select('expiry_date, grace_end_date, status')
    .eq('account_id', auth.profile.account_id)
    .neq('status', 'closed')

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data: consignors, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch consignors' }, { status: 500 })
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  const count = (consignors ?? []).filter(c => {
    const expiry = new Date(c.expiry_date + 'T00:00:00')
    const graceEnd = new Date(c.grace_end_date + 'T00:00:00')
    const isExpiringSoon = expiry.getTime() - now.getTime() <= sevenDaysMs && expiry.getTime() >= now.getTime()
    const isInGrace = now > expiry && now <= graceEnd
    return isExpiringSoon || isInGrace
  }).length

  return NextResponse.json({ count })
}

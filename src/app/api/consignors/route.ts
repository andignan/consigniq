// app/api/consignors/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { canUseFeature } from '@/lib/feature-gates'
import type { Tier } from '@/lib/tier-limits'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location_id')

  if (!locationId) {
    return NextResponse.json({ error: 'location_id required' }, { status: 400 })
  }

  // Tier check: consignor_mgmt required
  const auth = await getAuthenticatedProfile<{ account_id: string; accounts: { tier?: string } | null }>(
    supabase, 'account_id, accounts(tier)'
  )
  if (!auth.error) {
    const tier = (auth.profile.accounts?.tier ?? 'starter') as Tier
    if (!canUseFeature(tier, 'consignor_mgmt')) {
      return NextResponse.json({ error: `${ERRORS.UPGRADE_REQUIRED} — consignor management is not available on your plan` }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('consignors')
    .select(`
      *,
      items:items(count)
    `)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ consignors: data })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  // Validate required fields
  const required = ['account_id', 'location_id', 'name', 'intake_date', 'expiry_date', 'grace_end_date']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  const auth = await getAuthenticatedProfile<{ account_id: string; accounts: { tier?: string } | null }>(
    supabase, 'account_id, accounts(tier)'
  )
  if (auth.error) return auth.error

  const tier = (auth.profile.accounts?.tier ?? 'starter') as Tier
  if (!canUseFeature(tier, 'consignor_mgmt')) {
    return NextResponse.json({ error: `${ERRORS.UPGRADE_REQUIRED} — consignor management is not available on your plan` }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('consignors')
    .insert({
      account_id: body.account_id,
      location_id: body.location_id,
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      notes: body.notes ?? null,
      intake_date: body.intake_date,
      expiry_date: body.expiry_date,
      grace_end_date: body.grace_end_date,
      split_store: body.split_store,
      split_consignor: body.split_consignor,
      status: 'active',
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ consignor: data }, { status: 201 })
}

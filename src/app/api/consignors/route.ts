// app/api/consignors/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { canUseFeature } from '@/lib/feature-gates'
import type { Tier } from '@/lib/tier-limits'

async function getTier(supabase: ReturnType<typeof createServerClient>): Promise<{ tier: Tier; error?: NextResponse } | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null
  const { data: profile } = await supabase
    .from('users')
    .select('account_id, accounts(tier)')
    .eq('id', user.id)
    .single()
  const tier = ((profile?.accounts as { tier?: string } | null)?.tier ?? 'starter') as Tier
  return { tier }
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location_id')

  if (!locationId) {
    return NextResponse.json({ error: 'location_id required' }, { status: 400 })
  }

  // Tier check: consignor_mgmt required
  const tierInfo = await getTier(supabase)
  if (tierInfo && !canUseFeature(tierInfo.tier, 'consignor_mgmt')) {
    return NextResponse.json({ error: 'Upgrade required — consignor management is not available on your plan' }, { status: 403 })
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

  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tier check: consignor_mgmt required
  const tierInfo = await getTier(supabase)
  if (tierInfo && !canUseFeature(tierInfo.tier, 'consignor_mgmt')) {
    return NextResponse.json({ error: 'Upgrade required — consignor management is not available on your plan' }, { status: 403 })
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
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ consignor: data }, { status: 201 })
}

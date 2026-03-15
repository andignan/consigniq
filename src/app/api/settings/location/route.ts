import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedUser(supabase)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location_id')
  if (!locationId) return NextResponse.json({ error: 'location_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('locations')
    .select('id, account_id, name, address, city, state, phone, default_split_store, default_split_consignor, agreement_days, grace_days, markdown_enabled')
    .eq('id', locationId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string; role: string }>(supabase, 'role, account_id')
  if (auth.error) return auth.error

  if (auth.profile.role !== 'owner') {
    return NextResponse.json({ error: ERRORS.OWNER_REQUIRED }, { status: 403 })
  }

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'address', 'city', 'state', 'phone', 'default_split_store', 'default_split_consignor', 'agreement_days', 'grace_days', 'markdown_enabled']
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key]
  }

  const { data, error } = await supabase
    .from('locations')
    .update(filtered)
    .eq('id', id)
    .eq('account_id', auth.profile.account_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location: data })
}

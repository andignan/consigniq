// app/api/admin/accounts/route.ts
import { checkSuperadmin, createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier')
  const status = searchParams.get('status')
  const id = searchParams.get('id')

  // Single account detail
  if (id) {
    const [accountRes, locationsRes, usersRes, itemsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', id).single(),
      supabase.from('locations').select('id, name, city, state, created_at').eq('account_id', id).order('created_at', { ascending: true }),
      supabase.from('users').select('id, email, full_name, role, location_id, created_at').eq('account_id', id).order('created_at', { ascending: true }),
      supabase.from('items').select('id, status').eq('account_id', id),
    ])

    if (accountRes.error) {
      return NextResponse.json({ error: accountRes.error.message }, { status: 404 })
    }

    const items = itemsRes.data ?? []

    return NextResponse.json({
      account: accountRes.data,
      locations: locationsRes.data ?? [],
      users: usersRes.data ?? [],
      items: {
        total: items.length,
        pending: items.filter(i => i.status === 'pending').length,
        priced: items.filter(i => i.status === 'priced').length,
        sold: items.filter(i => i.status === 'sold').length,
        donated: items.filter(i => i.status === 'donated').length,
      },
    })
  }

  // List all accounts with counts
  const showSystem = searchParams.get('show_system') === 'true'

  let query = supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (!showSystem) {
    query = query.eq('is_system', false)
  }

  if (tier) query = query.eq('tier', tier)
  if (status) query = query.eq('status', status)

  const { data: accounts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get location and user counts per account
  const accountIds = (accounts ?? []).map(a => a.id)

  const [locationsRes, usersRes] = await Promise.all([
    supabase.from('locations').select('id, account_id').in('account_id', accountIds),
    supabase.from('users').select('id, account_id').in('account_id', accountIds),
  ])

  const locationCounts: Record<string, number> = {}
  for (const loc of locationsRes.data ?? []) {
    locationCounts[loc.account_id] = (locationCounts[loc.account_id] ?? 0) + 1
  }

  const userCounts: Record<string, number> = {}
  for (const u of usersRes.data ?? []) {
    userCounts[u.account_id] = (userCounts[u.account_id] ?? 0) + 1
  }

  const enriched = (accounts ?? []).map(a => ({
    ...a,
    location_count: locationCounts[a.id] ?? 0,
    user_count: userCounts[a.id] ?? 0,
  }))

  return NextResponse.json({ accounts: enriched })
}

export async function PATCH(request: NextRequest) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: auth.status })
  }

  const supabase = createAdminClient()

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Build allowed updates
  const allowed: Record<string, unknown> = {}
  if (updates.tier && ['solo', 'shop', 'enterprise'].includes(updates.tier)) {
    allowed.tier = updates.tier
  }
  if (updates.status && ['active', 'suspended', 'cancelled', 'inactive'].includes(updates.status)) {
    allowed.status = updates.status
  }
  if (updates.account_type && ['paid', 'trial', 'complimentary'].includes(updates.account_type)) {
    allowed.account_type = updates.account_type
  }
  if (typeof updates.is_complimentary === 'boolean') {
    allowed.is_complimentary = updates.is_complimentary
  }
  if (updates.complimentary_tier && ['solo', 'shop', 'enterprise'].includes(updates.complimentary_tier)) {
    allowed.complimentary_tier = updates.complimentary_tier
  } else if (updates.complimentary_tier === null) {
    allowed.complimentary_tier = null
  }

  // Handle extend_trial: add 30 days from current end or now
  if (updates.extend_trial === true) {
    const current = await supabase.from('accounts').select('trial_ends_at').eq('id', id).single()
    const currentEnd = current.data?.trial_ends_at ? new Date(current.data.trial_ends_at) : new Date()
    const base = currentEnd > new Date() ? currentEnd : new Date()
    allowed.trial_ends_at = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

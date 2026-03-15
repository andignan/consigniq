// app/api/payouts/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { canUseFeature } from '@/lib/feature-gates'
import type { Tier } from '@/lib/tier-limits'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string; role: string; accounts: { tier?: string } | null }>(
    supabase, 'account_id, role, accounts(tier)'
  )
  if (auth.error) return auth.error

  const tier = (auth.profile.accounts?.tier ?? 'starter') as Tier
  if (!canUseFeature(tier, 'payouts')) {
    return NextResponse.json({ error: `${ERRORS.UPGRADE_REQUIRED} — payouts are not available on your plan` }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location_id')
  const status = searchParams.get('status')

  let consignorQuery = supabase
    .from('consignors')
    .select('id, name, split_store, split_consignor, status, phone, email')
    .eq('account_id', auth.profile.account_id)

  if (locationId) {
    consignorQuery = consignorQuery.eq('location_id', locationId)
  }

  const { data: consignors, error: consignorError } = await consignorQuery

  if (consignorError) {
    return NextResponse.json({ error: consignorError.message }, { status: 500 })
  }

  if (!consignors || consignors.length === 0) {
    return NextResponse.json({ payouts: [] })
  }

  const consignorIds = consignors.map(c => c.id)
  let itemsQuery = supabase
    .from('items')
    .select('id, consignor_id, name, sold_price, sold_date, price, paid_at, payout_note, category')
    .eq('status', 'sold')
    .in('consignor_id', consignorIds)

  if (status === 'unpaid') {
    itemsQuery = itemsQuery.is('paid_at', null)
  } else if (status === 'paid') {
    itemsQuery = itemsQuery.not('paid_at', 'is', null)
  }

  const { data: items, error: itemsError } = await itemsQuery

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  // M8: Group items by consignor using Map instead of O(n*m) nested filter
  const itemsByConsignor = new Map<string, typeof items>()
  for (const item of items || []) {
    const cid = item.consignor_id
    if (!itemsByConsignor.has(cid)) itemsByConsignor.set(cid, [])
    itemsByConsignor.get(cid)!.push(item)
  }

  const payouts = consignors
    .map(consignor => {
      const consignorItems = itemsByConsignor.get(consignor.id) || []
      if (consignorItems.length === 0) return null

      const totalSold = consignorItems.reduce((sum, i) => sum + (i.sold_price || 0), 0)
      const consignorShare = Math.round(totalSold * (consignor.split_consignor / 100) * 100) / 100
      const storeShare = Math.round(totalSold * (consignor.split_store / 100) * 100) / 100
      const unpaidItems = consignorItems.filter(i => !i.paid_at)
      const unpaidTotal = unpaidItems.reduce((sum, i) => sum + (i.sold_price || 0), 0)
      const unpaidConsignorShare = Math.round(unpaidTotal * (consignor.split_consignor / 100) * 100) / 100

      return {
        consignor: {
          id: consignor.id,
          name: consignor.name,
          phone: consignor.phone,
          email: consignor.email,
          split_store: consignor.split_store,
          split_consignor: consignor.split_consignor,
          status: consignor.status,
        },
        items: consignorItems,
        summary: {
          total_items: consignorItems.length,
          total_sold: totalSold,
          store_share: storeShare,
          consignor_share: consignorShare,
          unpaid_items: unpaidItems.length,
          unpaid_total: unpaidTotal,
          unpaid_consignor_share: unpaidConsignorShare,
        },
      }
    })
    .filter(Boolean)

  return NextResponse.json({ payouts })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ accounts: { tier?: string } | null }>(
    supabase, 'accounts(tier)'
  )
  if (auth.error) return auth.error

  const patchTier = (auth.profile.accounts?.tier ?? 'starter') as Tier
  if (!canUseFeature(patchTier, 'payouts')) {
    return NextResponse.json({ error: `${ERRORS.UPGRADE_REQUIRED} — payouts are not available on your plan` }, { status: 403 })
  }

  const body = await request.json()
  const { item_ids, payout_note } = body

  if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
    return NextResponse.json({ error: 'item_ids array is required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = { paid_at: now }
  if (payout_note) {
    updateData.payout_note = payout_note
  }

  const { data, error } = await supabase
    .from('items')
    .update(updateData)
    .in('id', item_ids)
    .eq('status', 'sold')
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updated: data })
}

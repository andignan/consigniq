// app/api/admin/stats/route.ts
// I3: Uses count-only queries instead of fetching all records
import { checkSuperadmin, createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: auth.status }
    )
  }

  const supabase = createAdminClient()

  // Count-only queries — no data transfer
  const [
    accountsTotal, locationTotal, userTotal,
    // Account tiers
    soloCount, shopCount, enterpriseCount,
    // Account statuses
    activeAccounts, suspendedAccounts, cancelledAccounts,
    // Item statuses
    itemsTotal, pendingItems, pricedItems, soldItems, donatedItems,
    // Consignor statuses
    consignorsTotal, activeConsignors, expiredConsignors, graceConsignors, closedConsignors,
  ] = await Promise.all([
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_system', false),
    supabase.from('locations').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    // Account tiers
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_system', false).eq('tier', 'solo'),
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_system', false).eq('tier', 'shop'),
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_system', false).eq('tier', 'enterprise'),
    // Account statuses
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_system', false).eq('status', 'active'),
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_system', false).eq('status', 'suspended'),
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_system', false).eq('status', 'cancelled'),
    // Item statuses
    supabase.from('items').select('*', { count: 'exact', head: true }),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'priced'),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'donated'),
    // Consignor statuses
    supabase.from('consignors').select('*', { count: 'exact', head: true }),
    supabase.from('consignors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('consignors').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('consignors').select('*', { count: 'exact', head: true }).eq('status', 'grace'),
    supabase.from('consignors').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
  ])

  return NextResponse.json({
    accounts: {
      total: accountsTotal.count ?? 0,
      byTier: {
        solo: soloCount.count ?? 0,
        shop: shopCount.count ?? 0,
        enterprise: enterpriseCount.count ?? 0,
      },
      byStatus: {
        active: activeAccounts.count ?? 0,
        suspended: suspendedAccounts.count ?? 0,
        cancelled: cancelledAccounts.count ?? 0,
      },
    },
    locations: { total: locationTotal.count ?? 0 },
    users: { total: userTotal.count ?? 0 },
    items: {
      total: itemsTotal.count ?? 0,
      byStatus: {
        pending: pendingItems.count ?? 0,
        priced: pricedItems.count ?? 0,
        sold: soldItems.count ?? 0,
        donated: donatedItems.count ?? 0,
      },
    },
    consignors: {
      total: consignorsTotal.count ?? 0,
      byStatus: {
        active: activeConsignors.count ?? 0,
        expired: expiredConsignors.count ?? 0,
        grace: graceConsignors.count ?? 0,
        closed: closedConsignors.count ?? 0,
      },
    },
  })
}

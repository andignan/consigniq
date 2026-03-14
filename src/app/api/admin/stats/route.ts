// app/api/admin/stats/route.ts
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

  // Fetch all counts cross-account
  const [accountsRes, locationsRes, usersRes, itemsRes, consignorsRes] = await Promise.all([
    supabase.from('accounts').select('id, tier, status'),
    supabase.from('locations').select('id'),
    supabase.from('users').select('id'),
    supabase.from('items').select('id, status'),
    supabase.from('consignors').select('id, status'),
  ])

  const accounts = accountsRes.data ?? []
  const items = itemsRes.data ?? []
  const consignors = consignorsRes.data ?? []

  return NextResponse.json({
    accounts: {
      total: accounts.length,
      byTier: {
        starter: accounts.filter(a => a.tier === 'starter').length,
        standard: accounts.filter(a => a.tier === 'standard').length,
        pro: accounts.filter(a => a.tier === 'pro').length,
      },
      byStatus: {
        active: accounts.filter(a => a.status === 'active').length,
        suspended: accounts.filter(a => a.status === 'suspended').length,
        cancelled: accounts.filter(a => a.status === 'cancelled').length,
      },
    },
    locations: { total: (locationsRes.data ?? []).length },
    users: { total: (usersRes.data ?? []).length },
    items: {
      total: items.length,
      byStatus: {
        pending: items.filter(i => i.status === 'pending').length,
        priced: items.filter(i => i.status === 'priced').length,
        sold: items.filter(i => i.status === 'sold').length,
        donated: items.filter(i => i.status === 'donated').length,
      },
    },
    consignors: {
      total: consignors.length,
      byStatus: {
        active: consignors.filter(c => c.status === 'active').length,
        expired: consignors.filter(c => c.status === 'expired').length,
        grace: consignors.filter(c => c.status === 'grace').length,
        closed: consignors.filter(c => c.status === 'closed').length,
      },
    },
  })
}

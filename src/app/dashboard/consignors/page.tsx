// app/dashboard/consignors/page.tsx
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { ConsignorCard, ConsignorCardSkeleton } from '@/components/ConsignorCard'
import { getLifecycleStatus } from '@/types'
import { Suspense } from 'react'

// Alerts banner shown at top of consignors page
async function LifecycleAlerts({ locationId, accountId }: { locationId: string; accountId?: string }) {
  const supabase = createServerClient()
  let query = supabase
    .from('consignors')
    .select('id, name, expiry_date, grace_end_date, intake_date')
    .eq('status', 'active')
  if (locationId) {
    query = query.eq('location_id', locationId)
  } else if (accountId) {
    query = query.eq('account_id', accountId)
  }
  const { data: consignors } = await query

  if (!consignors?.length) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiringSoon = consignors.filter(c => {
    const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
    return !lc.isExpired && lc.daysRemaining <= 7
  })

  const inGrace = consignors.filter(c => {
    const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
    return lc.isGrace
  })

  const donationReady = consignors.filter(c => {
    const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
    return lc.isDonationEligible
  })

  if (!expiringSoon.length && !inGrace.length && !donationReady.length) return null

  return (
    <div className="space-y-2 mb-4">
      {donationReady.length > 0 && (
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2.5 text-sm">
          <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
          <span className="text-gray-700">
            <span className="font-semibold">{donationReady.length} consignor{donationReady.length !== 1 ? 's' : ''}</span>
            {' '}eligible for donation — items unclaimed after grace period
          </span>
        </div>
      )}
      {inGrace.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 rounded-lg px-4 py-2.5 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="text-red-700">
            <span className="font-semibold">{inGrace.length} consignor{inGrace.length !== 1 ? 's' : ''}</span>
            {' '}in grace period — contact to arrange pickup
          </span>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-4 py-2.5 text-sm">
          <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
          <span className="text-orange-700">
            <span className="font-semibold">{expiringSoon.length} agreement{expiringSoon.length !== 1 ? 's' : ''}</span>
            {' '}expiring in 7 days or less
          </span>
        </div>
      )}
    </div>
  )
}

async function ConsignorList({ locationId, accountId }: { locationId: string; accountId?: string }) {
  const supabase = createServerClient()

  let query = supabase
    .from('consignors')
    .select(`
      *,
      items:items(count)
    `)
    .order('created_at', { ascending: false })
  if (locationId) {
    query = query.eq('location_id', locationId)
  } else if (accountId) {
    query = query.eq('account_id', accountId)
  }
  const { data: consignors, error } = await query

  if (error) {
    return <p className="text-sm text-red-600">Failed to load consignors: {error.message}</p>
  }

  if (!consignors?.length) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Plus className="w-6 h-6 text-indigo-600" />
        </div>
        <p className="text-sm font-medium text-gray-600 mb-1">No consignors yet</p>
        <p className="text-xs text-gray-400 mb-4">Add your first consignor to get started</p>
        <Link
          href="/dashboard/consignors/new"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Consignor
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {consignors.map(c => (
        <ConsignorCard
          key={c.id}
          consignor={{
            ...c,
            item_count: (c.items as unknown as { count: number }[])?.[0]?.count ?? 0,
          }}
        />
      ))}
    </div>
  )
}

export default async function ConsignorsPage({
  searchParams,
}: {
  searchParams: { location_id?: string }
}) {
  const supabase = createServerClient()
  const locationId = searchParams.location_id ?? process.env.DEFAULT_LOCATION_ID ?? ''

  // Get account_id for cross-location queries when no location_id
  let accountId: string | undefined
  if (!searchParams.location_id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('account_id, role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'owner') {
        accountId = profile.account_id
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Consignors</h1>
          <p className="text-sm text-gray-500">Active agreements &amp; lifecycle tracking</p>
        </div>
        <Link
          href="/dashboard/consignors/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Consignor
        </Link>
      </div>

      {/* Lifecycle alerts */}
      <LifecycleAlerts locationId={locationId} accountId={accountId} />

      {/* Search (v1.5 — client-side filter) */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search consignors…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
        />
      </div>

      {/* Consignor list */}
      <Suspense
        fallback={
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <ConsignorCardSkeleton key={i} />)}
          </div>
        }
      >
        <ConsignorList locationId={locationId} accountId={accountId} />
      </Suspense>
    </div>
  )
}

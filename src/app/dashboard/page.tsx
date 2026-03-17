// app/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Users, Package, Clock, AlertTriangle, TrendingUp, ArrowRight, Plus, MapPin, DollarSign
} from 'lucide-react'
import { getLifecycleStatus } from '@/types'

// ============================================================
// Stat card
// ============================================================
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'brand',
  href,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'brand' | 'amber' | 'red' | 'emerald' | 'gray'
  href?: string
}) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-50 text-gray-500',
  }

  const card = (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${href ? 'hover:shadow-md hover:border-gray-200 transition-all cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-navy-800">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )

  return href ? <Link href={href}>{card}</Link> : card
}

// ============================================================
// Location card (for All Locations view)
// ============================================================
function LocationCard({
  name,
  activeConsignors,
  pendingItems,
  inventoryValue,
  soldItems,
}: {
  name: string
  activeConsignors: number
  pendingItems: number
  inventoryValue: number
  soldItems: number
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-navy-800">{name}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-400">Consignors</p>
          <p className="font-semibold text-navy-800">{activeConsignors}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Pending</p>
          <p className="font-semibold text-navy-800">{pendingItems}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Inventory</p>
          <p className="font-semibold text-navy-800">${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Sold</p>
          <p className="font-semibold text-navy-800">{soldItems}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Page
// ============================================================
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { location_id?: string }
}) {
  const supabase = createServerClient()

  // Get user profile for account_id
  const { data: { user: authUser } } = await supabase.auth.getUser()
  let accountId = ''
  let userRole = 'staff'
  let accountTier = 'shop'
  if (authUser) {
    const { data: profile } = await supabase
      .from('users')
      .select('account_id, role, accounts(tier)')
      .eq('id', authUser.id)
      .single()
    accountId = profile?.account_id ?? ''
    userRole = profile?.role ?? 'staff'
    accountTier = (profile?.accounts as { tier?: string } | null)?.tier ?? 'shop'
  }

  const isSolo = accountTier === 'solo'
  const firstName = (authUser?.user_metadata?.full_name as string | undefined)?.split(' ')[0]

  // Solo users get the SoloDashboard (client component with usage meter)
  if (isSolo) {
    const SoloDashboard = (await import('@/components/SoloDashboard')).default
    return <SoloDashboard />
  }

  const locationId = searchParams.location_id ?? process.env.DEFAULT_LOCATION_ID ?? ''
  const isAllLocations = !searchParams.location_id && userRole === 'owner'

  if (isAllLocations && accountId) {
    // All Locations aggregate view
    const { data: allLocations } = await supabase
      .from('locations')
      .select('id, name')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })

    const locations = allLocations ?? []

    // Fetch all data across account
    const [consignorsRes, itemsRes] = await Promise.all([
      supabase
        .from('consignors')
        .select('id, name, status, intake_date, expiry_date, grace_end_date, location_id')
        .eq('account_id', accountId),
      supabase
        .from('items')
        .select('id, status, price, sold_price, location_id')
        .eq('account_id', accountId),
    ])

    const consignors = consignorsRes.data ?? []
    const items = itemsRes.data ?? []

    // Aggregate stats
    const active = consignors.filter(c => c.status === 'active')
    const expiringSoon = active.filter(c => {
      const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
      return !lc.isExpired && lc.daysRemaining <= 7
    })
    const inGrace = active.filter(c => {
      const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
      return lc.isGrace
    })
    const donationEligible = active.filter(c => {
      const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
      return lc.isDonationEligible
    })

    const pendingItems = items.filter(i => i.status === 'pending').length
    const pricedItems = items.filter(i => i.status === 'priced').length
    const soldItems = items.filter(i => i.status === 'sold').length
    const totalInventoryValue = items
      .filter(i => i.status === 'priced' && i.price)
      .reduce((sum, i) => sum + (i.price ?? 0), 0)

    // Per-location stats
    const locationStats = locations.map(loc => {
      const locConsignors = consignors.filter(c => c.location_id === loc.id && c.status === 'active')
      const locItems = items.filter(i => i.location_id === loc.id)
      return {
        name: loc.name,
        activeConsignors: locConsignors.length,
        pendingItems: locItems.filter(i => i.status === 'pending').length,
        inventoryValue: locItems
          .filter(i => i.status === 'priced' && i.price)
          .reduce((sum, i) => sum + (i.price ?? 0), 0),
        soldItems: locItems.filter(i => i.status === 'sold').length,
      }
    })

    return (
      <div className="w-full lg:max-w-5xl lg:mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-navy-800">
              {firstName ? `Welcome back, ${firstName}!` : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-400">
              All Locations &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link
            href="/dashboard/consignors/new"
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Consignor
          </Link>
        </div>

        {/* Alerts */}
        {(inGrace.length > 0 || donationEligible.length > 0 || expiringSoon.length > 0) && (
          <div className="space-y-2 mb-6">
            {donationEligible.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                <span className="text-gray-600 flex-1">
                  <strong>{donationEligible.length}</strong> consignor{donationEligible.length !== 1 ? 's' : ''} past grace — items eligible for donation
                </span>
              </div>
            )}
            {inGrace.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-red-700 flex-1">
                  <strong>{inGrace.length}</strong> consignor{inGrace.length !== 1 ? 's' : ''} in grace period
                </span>
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-4 py-3 text-sm">
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-orange-700 flex-1">
                  <strong>{expiringSoon.length}</strong> agreement{expiringSoon.length !== 1 ? 's' : ''} expiring in 7 days or less
                </span>
              </div>
            )}
          </div>
        )}

        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={Users}
            label="Total Active Consignors"
            value={active.length}
            sub={`across ${locations.length} location${locations.length !== 1 ? 's' : ''}`}
            color="brand"
          />
          <StatCard
            icon={Package}
            label="Needs Pricing"
            value={pendingItems}
            sub={`${pendingItems} need pricing, ${pricedItems} already priced`}
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Inventory Value"
            value={`$${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            sub={`${pricedItems} priced items`}
            color="emerald"
          />
          <StatCard
            icon={DollarSign}
            label="Total Sold"
            value={soldItems}
            color="gray"
          />
        </div>

        {/* Per-location cards */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Location</h2>
          <div className="space-y-3">
            {locationStats.map(loc => (
              <LocationCard key={loc.name} {...loc} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="space-y-1">
            <QuickLink href="/dashboard/consignors/new" label="Add New Consignor" icon={Users} />
            <QuickLink href="/dashboard/inventory?status=pending" label={`Price Pending Items (${pendingItems})`} icon={Package} highlight={pendingItems > 0} />
            <QuickLink href="/dashboard/consignors" label="View All Consignors" icon={ArrowRight} />
          </div>
        </div>
      </div>
    )
  }

  // Single-location view (original)
  const [consignorsRes, itemsRes] = await Promise.all([
    supabase
      .from('consignors')
      .select('id, name, status, intake_date, expiry_date, grace_end_date')
      .eq('location_id', locationId),
    supabase
      .from('items')
      .select('id, status, price, sold_price')
      .eq('location_id', locationId),
  ])

  const consignors = consignorsRes.data ?? []
  const items = itemsRes.data ?? []

  // Lifecycle bucketing
  const active = consignors.filter(c => c.status === 'active')
  const expiringSoon = active.filter(c => {
    const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
    return !lc.isExpired && lc.daysRemaining <= 7
  })
  const inGrace = active.filter(c => {
    const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
    return lc.isGrace
  })
  const donationEligible = active.filter(c => {
    const lc = getLifecycleStatus(c.intake_date, c.expiry_date, c.grace_end_date)
    return lc.isDonationEligible
  })

  const pendingItems = items.filter(i => i.status === 'pending').length
  const pricedItems = items.filter(i => i.status === 'priced').length
  const soldItems = items.filter(i => i.status === 'sold').length
  const totalInventoryValue = items
    .filter(i => i.status === 'priced' && i.price)
    .reduce((sum, i) => sum + (i.price ?? 0), 0)

  return (
    <div className="w-full lg:max-w-5xl lg:mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy-800">
            {firstName ? `Welcome back, ${firstName}!` : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {!isSolo && (
          <Link
            href="/dashboard/consignors/new"
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Consignor
          </Link>
        )}
        {isSolo && (
          <Link
            href="/dashboard/pricing"
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Package className="w-4 h-4" />
            Price an Item
          </Link>
        )}
      </div>

      {/* Alerts */}
      {!isSolo && (inGrace.length > 0 || donationEligible.length > 0 || expiringSoon.length > 0) && (
        <div className="space-y-2 mb-6">
          {donationEligible.length > 0 && (
            <Link href="/dashboard/consignors?filter=donation" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-3 text-sm transition-colors">
              <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
              <span className="text-gray-600 flex-1">
                <strong>{donationEligible.length}</strong> consignor{donationEligible.length !== 1 ? 's' : ''} past grace — items eligible for donation
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}
          {inGrace.length > 0 && (
            <Link href="/dashboard/consignors?filter=grace" className="flex items-center gap-2 bg-red-50 hover:bg-red-100 rounded-xl px-4 py-3 text-sm transition-colors">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-red-700 flex-1">
                <strong>{inGrace.length}</strong> consignor{inGrace.length !== 1 ? 's' : ''} in grace period — contact for pickup
              </span>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </Link>
          )}
          {expiringSoon.length > 0 && (
            <Link href="/dashboard/consignors?filter=expiring" className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 rounded-xl px-4 py-3 text-sm transition-colors">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-orange-700 flex-1">
                <strong>{expiringSoon.length}</strong> agreement{expiringSoon.length !== 1 ? 's' : ''} expiring in 7 days or less
              </span>
              <ArrowRight className="w-4 h-4 text-orange-400" />
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={Users}
          label="Active Consignors"
          value={active.length}
          sub={`${expiringSoon.length} expiring soon`}
          color="brand"
          href="/dashboard/consignors"
        />
        <StatCard
          icon={Package}
          label="Needs Pricing"
          value={pendingItems}
          sub={`${pendingItems} need pricing, ${pricedItems} already priced`}
          color="amber"
          href="/dashboard/inventory?status=pending"
        />
        <StatCard
          icon={TrendingUp}
          label="Inventory Value"
          value={`$${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={`${pricedItems} priced items`}
          color="emerald"
          href="/dashboard/inventory"
        />
        <StatCard
          icon={DollarSign}
          label="Sold This Period"
          value={soldItems}
          sub="mark items sold in inventory"
          color="gray"
          href="/dashboard/inventory?status=sold"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="space-y-1">
          {isSolo ? (
            <>
              <QuickLink href="/dashboard/pricing" label="Price an Item" icon={Package} highlight />
              <QuickLink href="/dashboard/inventory" label="My Inventory" icon={ArrowRight} />
            </>
          ) : (
            <>
              <QuickLink href="/dashboard/consignors/new" label="Add New Consignor" icon={Users} />
              <QuickLink href="/dashboard/inventory?status=pending" label={`Price Pending Items (${pendingItems})`} icon={Package} highlight={pendingItems > 0} />
              <QuickLink href="/dashboard/consignors" label="View All Consignors" icon={ArrowRight} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  label,
  icon: Icon,
  highlight = false,
}: {
  href: string
  label: string
  icon: React.ElementType
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        highlight
          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
    </Link>
  )
}

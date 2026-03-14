'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Package, Users, Clock,
  Gift, Download, Loader2, MapPin, Calendar, Tag,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────
type Period = '7d' | '30d' | '90d' | 'ytd' | 'all'

interface ConsignorRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  split_store: number
  split_consignor: number
  status: string
  location_id: string
  created_at: string
  expiry_date: string
}

interface ItemRow {
  id: string
  name: string
  category: string
  condition: string
  description: string | null
  status: string
  price: number | null
  sold_price: number | null
  sold_date: string | null
  donated_at: string | null
  priced_at: string | null
  intake_date: string
  location_id: string
  consignor_id: string
  consignor: {
    id: string
    name: string
    phone: string | null
    email: string | null
    split_store: number
    split_consignor: number
    expiry_date: string
  } | null
}

interface MarkdownRow {
  id: string
  item_id: string
  markdown_pct: number
  original_price: number
  new_price: number
  applied_at: string
}

interface LocationRow {
  id: string
  name: string
}

// ─── Helpers ──────────────────────────────────────────────────
const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All Time' },
]

function getDateRange(period: Period): { from: Date | null; to: Date; label: string } {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  if (period === 'all') return { from: null, to, label: 'All Time' }

  const from = new Date()
  from.setHours(0, 0, 0, 0)
  switch (period) {
    case '7d': from.setDate(from.getDate() - 7); break
    case '30d': from.setDate(from.getDate() - 30); break
    case '90d': from.setDate(from.getDate() - 90); break
    case 'ytd': from.setMonth(0); from.setDate(1); break
  }

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return { from, to, label: `${fmt(from)} – ${fmt(to)}` }
}

function inPeriod(dateStr: string | null, from: Date | null): boolean {
  if (!dateStr) return false
  if (!from) return true
  return new Date(dateStr) >= from
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

function toCsvString(rows: string[][]): string {
  return rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'indigo',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'indigo' | 'amber' | 'red' | 'emerald' | 'gray'
}) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-50 text-gray-500',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function ReportsPage() {
  const user = useUser()
  const supabase = useMemo(() => createClient(), [])

  const [period, setPeriod] = useState<Period>('30d')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [loading, setLoading] = useState(true)

  const [items, setItems] = useState<ItemRow[]>([])
  const [consignors, setConsignors] = useState<ConsignorRow[]>([])
  const [markdowns, setMarkdowns] = useState<MarkdownRow[]>([])

  // Load locations for owner role
  useEffect(() => {
    if (!user || user.role !== 'owner') return
    supabase
      .from('locations')
      .select('id, name')
      .eq('account_id', user.account_id)
      .then(({ data }) => setLocations(data ?? []))
  }, [user, supabase])

  // Staff users default to their own location
  useEffect(() => {
    if (user?.role === 'staff' && user.location_id) {
      setLocationFilter(user.location_id)
    }
  }, [user])

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const effectiveLocation = user.role === 'staff'
      ? user.location_id
      : locationFilter === 'all' ? null : locationFilter

    let itemsQuery = supabase
      .from('items')
      .select('id, name, category, condition, description, status, price, sold_price, sold_date, donated_at, priced_at, intake_date, location_id, consignor_id, consignor:consignors(id, name, phone, email, split_store, split_consignor, expiry_date)')
    if (effectiveLocation) {
      itemsQuery = itemsQuery.eq('location_id', effectiveLocation)
    } else {
      itemsQuery = itemsQuery.eq('account_id', user.account_id)
    }

    let consignorsQuery = supabase
      .from('consignors')
      .select('id, name, phone, email, split_store, split_consignor, status, location_id, created_at, expiry_date')
    if (effectiveLocation) {
      consignorsQuery = consignorsQuery.eq('location_id', effectiveLocation)
    } else {
      consignorsQuery = consignorsQuery.eq('account_id', user.account_id)
    }

    const markdownsQuery = supabase
      .from('markdowns')
      .select('id, item_id, markdown_pct, original_price, new_price, applied_at')
      .eq('account_id', user.account_id)

    const [itemsRes, consignorsRes, markdownsRes] = await Promise.all([
      itemsQuery,
      consignorsQuery,
      markdownsQuery,
    ])

    setItems((itemsRes.data as ItemRow[] | null) ?? [])
    setConsignors((consignorsRes.data as ConsignorRow[] | null) ?? [])
    setMarkdowns((markdownsRes.data as MarkdownRow[] | null) ?? [])
    setLoading(false)
  }, [user, locationFilter, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Computed metrics ───────────────────────────────────────
  const { from: periodFrom, label: periodLabel } = getDateRange(period)

  // Time-filtered sets
  const soldInPeriod = useMemo(() =>
    items.filter(i => i.status === 'sold' && inPeriod(i.sold_date, periodFrom)),
    [items, periodFrom]
  )

  const donatedInPeriod = useMemo(() =>
    items.filter(i => i.status === 'donated' && inPeriod(i.donated_at, periodFrom)),
    [items, periodFrom]
  )

  const pricedInPeriod = useMemo(() =>
    items.filter(i => inPeriod(i.priced_at, periodFrom)),
    [items, periodFrom]
  )

  const intakedInPeriod = useMemo(() =>
    items.filter(i => inPeriod(i.intake_date, periodFrom)),
    [items, periodFrom]
  )

  const newConsignorsInPeriod = useMemo(() =>
    consignors.filter(c => inPeriod(c.created_at, periodFrom)),
    [consignors, periodFrom]
  )

  // Markdown lookup (item_id -> markdown record)
  const markdownByItem = useMemo(() => {
    const map = new Map<string, MarkdownRow>()
    for (const m of markdowns) map.set(m.item_id, m)
    return map
  }, [markdowns])

  // Location name lookup
  const locationNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of locations) map.set(l.id, l.name)
    if (user?.locations) map.set(user.locations.id, user.locations.name)
    return map
  }, [locations, user])

  function getLocationName(locationId: string): string {
    return locationNameMap.get(locationId) ?? 'Unknown'
  }

  // ─── Section 1: Store Performance ───────────────────────────
  const totalRevenue = soldInPeriod.reduce((s, i) => s + (i.sold_price ?? 0), 0)

  const storeEarnings = soldInPeriod.reduce((s, i) => {
    const split = i.consignor?.split_store ?? 50
    return s + (i.sold_price ?? 0) * split / 100
  }, 0)

  const consignorPayouts = soldInPeriod.reduce((s, i) => {
    const split = i.consignor?.split_consignor ?? 50
    return s + (i.sold_price ?? 0) * split / 100
  }, 0)

  // ─── Section 2: Pricing Performance ─────────────────────────
  const avgDaysToSell = soldInPeriod.length > 0
    ? Math.round(soldInPeriod.reduce((s, i) =>
        s + (i.sold_date && i.intake_date ? daysBetween(i.intake_date, i.sold_date) : 0), 0) / soldInPeriod.length)
    : 0

  const avgSalePrice = soldInPeriod.length > 0
    ? soldInPeriod.reduce((s, i) => s + (i.sold_price ?? 0), 0) / soldInPeriod.length
    : 0

  // Sell-through: of items priced in period, what % sold before consignor expiry
  const pricedAndResolved = pricedInPeriod.filter(i =>
    i.status === 'sold' || i.status === 'donated' || (i.consignor?.expiry_date && new Date(i.consignor.expiry_date) < new Date())
  )
  const pricedAndSold = pricedAndResolved.filter(i =>
    i.status === 'sold' && i.sold_date && i.consignor?.expiry_date && new Date(i.sold_date) <= new Date(i.consignor.expiry_date)
  )
  const sellThroughRate = pricedAndResolved.length > 0
    ? Math.round(pricedAndSold.length / pricedAndResolved.length * 100)
    : 0

  const markdownSales = soldInPeriod.filter(i => markdownByItem.has(i.id)).length
  const fullPriceSales = soldInPeriod.length - markdownSales

  // ─── Section 3: Inventory Snapshot ──────────────────────────
  const activeConsignors = consignors.filter(c => c.status === 'active').length
  const pendingItems = items.filter(i => i.status === 'pending').length
  const pricedOnFloor = items.filter(i => i.status === 'priced').length
  const inventoryValue = items
    .filter(i => i.status === 'priced' && i.price)
    .reduce((s, i) => s + (i.price ?? 0), 0)

  const today = new Date()
  const sevenDaysOut = new Date()
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)

  const expiringItems = items.filter(i => {
    if (i.status !== 'priced' && i.status !== 'pending') return false
    const expiry = i.consignor?.expiry_date
    if (!expiry) return false
    const d = new Date(expiry)
    return d >= today && d <= sevenDaysOut
  }).length

  // ─── CSV Exports ────────────────────────────────────────────
  const dateSlug = new Date().toISOString().split('T')[0]
  const periodSlug = period

  function exportPayoutReport() {
    // Group sold items by consignor
    const byConsignor = new Map<string, {
      name: string; phone: string; email: string; locationId: string;
      splitStore: number; splitConsignor: number;
      items: ItemRow[]
    }>()

    for (const item of soldInPeriod) {
      const cId = item.consignor_id
      if (!byConsignor.has(cId)) {
        byConsignor.set(cId, {
          name: item.consignor?.name ?? 'Unknown',
          phone: item.consignor?.phone ?? '',
          email: item.consignor?.email ?? '',
          locationId: item.location_id,
          splitStore: item.consignor?.split_store ?? 50,
          splitConsignor: item.consignor?.split_consignor ?? 50,
          items: [],
        })
      }
      byConsignor.get(cId)!.items.push(item)
    }

    const headers = [
      'Location', 'Consignor Name', 'Consignor Phone', 'Consignor Email',
      'Items Sold', 'Total Sold Value', 'Store Earnings', 'Consignor Payout Owed',
      'Payout Status', 'Export Period',
    ]

    const rows = Array.from(byConsignor.values()).map(c => {
      const totalSold = c.items.reduce((s, i) => s + (i.sold_price ?? 0), 0)
      return [
        getLocationName(c.locationId),
        c.name,
        c.phone ?? '',
        c.email ?? '',
        c.items.length.toString(),
        totalSold.toFixed(2),
        (totalSold * c.splitStore / 100).toFixed(2),
        (totalSold * c.splitConsignor / 100).toFixed(2),
        'Unpaid',
        periodLabel,
      ]
    })

    downloadCsv(toCsvString([headers, ...rows]), `consigniq-payouts-${periodSlug}-${dateSlug}.csv`)
  }

  function exportItemDetail() {
    const headers = [
      'Location', 'Consignor Name', 'Consignor Phone', 'Consignor Email',
      'Item Name', 'Category', 'Condition', 'Intake Date',
      'Original Asking Price', 'Markdown % Applied', 'Final Sale Price',
      'Days to Sell', 'Sold Date', 'Store Cut $', 'Consignor Cut $', 'Split %',
    ]

    const rows = soldInPeriod.map(i => {
      const md = markdownByItem.get(i.id)
      const splitStore = i.consignor?.split_store ?? 50
      const splitConsignor = i.consignor?.split_consignor ?? 50
      return [
        getLocationName(i.location_id),
        i.consignor?.name ?? 'Unknown',
        i.consignor?.phone ?? '',
        i.consignor?.email ?? '',
        i.name,
        i.category,
        i.condition,
        i.intake_date,
        (i.price ?? 0).toFixed(2),
        md ? md.markdown_pct.toString() : '0',
        (i.sold_price ?? 0).toFixed(2),
        i.sold_date && i.intake_date ? daysBetween(i.intake_date, i.sold_date).toString() : '',
        i.sold_date ?? '',
        ((i.sold_price ?? 0) * splitStore / 100).toFixed(2),
        ((i.sold_price ?? 0) * splitConsignor / 100).toFixed(2),
        splitConsignor.toString(),
      ]
    })

    downloadCsv(toCsvString([headers, ...rows]), `consigniq-item-detail-${periodSlug}-${dateSlug}.csv`)
  }

  function exportDonationReport() {
    const headers = [
      'Location', 'Consignor Name', 'Item Name', 'Category', 'Condition',
      'Original Asking Price', 'Intake Date', 'Donation Date',
    ]

    const rows = donatedInPeriod.map(i => [
      getLocationName(i.location_id),
      i.consignor?.name ?? 'Unknown',
      i.name,
      i.category,
      i.condition,
      (i.price ?? 0).toFixed(2),
      i.intake_date,
      i.donated_at ?? '',
    ])

    downloadCsv(toCsvString([headers, ...rows]), `consigniq-donations-${dateSlug}.csv`)
  }

  // ─── Render ─────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-400">{periodLabel}</p>
        </div>
      </div>

      {/* Location toggle (owner only) */}
      {user.role === 'owner' && locations.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-gray-400" />
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="appearance-none px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Locations</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Time filter bar */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              period === p.value
                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* ═══ Section 1: Store Performance ═══ */}
          <Section title="Store Performance">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                icon={DollarSign}
                label="Total Revenue"
                value={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color="emerald"
              />
              <StatCard
                icon={TrendingUp}
                label="Store Earnings"
                value={`$${storeEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color="indigo"
              />
              <StatCard
                icon={Users}
                label="Consignor Payouts Owed"
                value={`$${consignorPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub={`${soldInPeriod.length} item${soldInPeriod.length !== 1 ? 's' : ''} sold`}
                color="amber"
              />
              <StatCard
                icon={Tag}
                label="Items Sold"
                value={soldInPeriod.length}
                color="emerald"
              />
              <StatCard
                icon={Gift}
                label="Items Donated"
                value={donatedInPeriod.length}
                color="gray"
              />
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={exportPayoutReport}
                disabled={soldInPeriod.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Payout Report
              </button>
              <button
                onClick={exportItemDetail}
                disabled={soldInPeriod.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Item Detail Report
              </button>
            </div>
          </Section>

          {/* ═══ Section 2: Pricing Performance ═══ */}
          <Section title="Pricing Performance">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={Clock}
                label="Avg Days to Sell"
                value={avgDaysToSell}
                sub="days"
                color="indigo"
              />
              <StatCard
                icon={DollarSign}
                label="Avg Sale Price"
                value={`$${avgSalePrice.toFixed(2)}`}
                color="emerald"
              />
              <StatCard
                icon={TrendingUp}
                label="Sell-Through Rate"
                value={`${sellThroughRate}%`}
                sub={`${pricedAndSold.length} of ${pricedAndResolved.length} resolved`}
                color={sellThroughRate >= 60 ? 'emerald' : sellThroughRate >= 40 ? 'amber' : 'red'}
              />
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-400 mb-1">Full Price vs Markdown</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{fullPriceSales}</span>
                  <span className="text-xs text-gray-400">full</span>
                  <span className="text-lg font-bold text-amber-600">{markdownSales}</span>
                  <span className="text-xs text-gray-400">markdown</span>
                </div>
                {soldInPeriod.length > 0 && (
                  <div className="flex gap-0.5 mt-2 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 rounded-l-full"
                      style={{ width: `${fullPriceSales / soldInPeriod.length * 100}%` }}
                    />
                    <div
                      className="bg-amber-400 rounded-r-full"
                      style={{ width: `${markdownSales / soldInPeriod.length * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ═══ Section 3: Inventory Snapshot ═══ */}
          <Section title="Inventory Snapshot">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                icon={Users}
                label="Active Consignors"
                value={activeConsignors}
                color="indigo"
              />
              <StatCard
                icon={Package}
                label="Pending Pricing"
                value={pendingItems}
                color="amber"
              />
              <StatCard
                icon={Tag}
                label="Priced / On Floor"
                value={pricedOnFloor}
                color="emerald"
              />
              <StatCard
                icon={DollarSign}
                label="Inventory Value"
                value={`$${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                color="emerald"
              />
              <StatCard
                icon={Calendar}
                label="Expiring in 7 Days"
                value={expiringItems}
                sub="items on consignors near expiry"
                color={expiringItems > 0 ? 'red' : 'gray'}
              />
            </div>

            {/* Donation export */}
            <div className="mt-4">
              <button
                onClick={exportDonationReport}
                disabled={donatedInPeriod.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Donation Report ({donatedInPeriod.length} items)
              </button>
            </div>
          </Section>

          {/* ═══ Section 4: Activity Summary ═══ */}
          <Section title="Activity Summary">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              <ActivityRow icon={Package} label="Items Intake'd" value={intakedInPeriod.length} />
              <ActivityRow icon={Tag} label="Items Priced" value={pricedInPeriod.length} />
              <ActivityRow icon={DollarSign} label="Items Sold" value={soldInPeriod.length} />
              <ActivityRow icon={Gift} label="Items Donated" value={donatedInPeriod.length} />
              <ActivityRow icon={Users} label="New Consignors" value={newConsignorsInPeriod.length} />
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function ActivityRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

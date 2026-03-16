'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Package, Users, Clock,
  Gift, Download, Loader2, MapPin, Calendar, Tag, Search, ChevronDown,
  Phone, Mail, User, ArrowUpDown, AlertTriangle, Target,
  FileText, Percent, Sparkles, X, Send,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useLocation } from '@/contexts/LocationContext'
import { createClient } from '@/lib/supabase/client'
import { getLifecycleStatus, COLOR_CLASSES, CONDITION_LABELS } from '@/types'

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
  intake_date: string
  expiry_date: string
  grace_end_date: string
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
  ai_reasoning: string | null
  current_markdown_pct: number | null
  low_price: number | null
  high_price: number | null
  consignor: {
    id: string
    name: string
    phone: string | null
    email: string | null
    split_store: number
    split_consignor: number
    intake_date: string
    expiry_date: string
    grace_end_date: string
  } | null
}

type SortDir = 'asc' | 'desc'
type SortConfig = { key: string; dir: SortDir }

interface MarkdownRow {
  id: string
  item_id: string
  markdown_pct: number
  original_price: number
  new_price: number
  applied_at: string
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
  color = 'brand',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'brand' | 'amber' | 'red' | 'emerald' | 'gray'
}) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
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

// ─── Sort helpers ────────────────────────────────────────────
function toggleSort(current: SortConfig, key: string): SortConfig {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: 'desc' }
}

function SortHeader({
  label, sortKey, current, onSort, align = 'left',
}: {
  label: string; sortKey: string; current: SortConfig; onSort: (key: string) => void; align?: 'left' | 'right'
}) {
  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} px-4 py-3 cursor-pointer hover:text-gray-600 select-none`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${current.key === sortKey ? 'text-brand-500' : 'text-gray-300'}`} />
      </span>
    </th>
  )
}

function sortRows<T>(rows: T[], key: string, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key]
    const bv = (b as Record<string, unknown>)[key]
    const an = typeof av === 'number' ? av : typeof av === 'string' ? av.toLowerCase() : 0
    const bn = typeof bv === 'number' ? bv : typeof bv === 'string' ? bv.toLowerCase() : 0
    if (an < bn) return dir === 'asc' ? -1 : 1
    if (an > bn) return dir === 'asc' ? 1 : -1
    return 0
  })
}

// ─── Main ─────────────────────────────────────────────────────
export default function ReportsPage() {
  const user = useUser()
  const { activeLocationId, isAllLocations, locations, canSwitchLocations, setActiveLocation } = useLocation()
  const supabase = useMemo(() => createClient(), [])

  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(true)

  const [items, setItems] = useState<ItemRow[]>([])
  const [consignors, setConsignors] = useState<ConsignorRow[]>([])
  const [markdowns, setMarkdowns] = useState<MarkdownRow[]>([])

  // AI prompt bar state
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{
    question: string
    sql: string
    summary: string
    rows: Record<string, unknown>[]
    columns: string[]
  } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const AI_SUGGESTED_PROMPTS = [
    'What are our top 5 selling categories this month?',
    'Which consignors have the most unsold items?',
    'Average days to sell by category',
    'Total revenue by consignor this month',
    'Items priced but not yet sold over 30 days',
    'How many items were donated vs sold this quarter?',
  ]

  async function handleAiQuery(question?: string) {
    const q = (question ?? aiQuery).trim()
    if (!q) return
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    try {
      const res = await fetch('/api/reports/query', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          location_id: isAllLocations ? 'all' : activeLocationId,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setAiError(body.error || 'Query failed')
      } else {
        setAiResult(body)
        setAiQuery(q)
      }
    } catch {
      setAiError('Failed to connect to the server')
    } finally {
      setAiLoading(false)
    }
  }

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const effectiveLocation = isAllLocations ? null : (activeLocationId ?? user.location_id)

    // I2: Limit fetches to 2000 records max to prevent memory spikes
    let itemsQuery = supabase
      .from('items')
      .select('id, name, category, condition, description, status, price, sold_price, sold_date, donated_at, priced_at, intake_date, location_id, consignor_id, ai_reasoning, current_markdown_pct, low_price, high_price, consignor:consignors(id, name, phone, email, split_store, split_consignor, intake_date, expiry_date, grace_end_date)')
      .order('intake_date', { ascending: false })
      .limit(2000)
    if (effectiveLocation) {
      itemsQuery = itemsQuery.eq('location_id', effectiveLocation)
    } else {
      itemsQuery = itemsQuery.eq('account_id', user.account_id)
    }

    let consignorsQuery = supabase
      .from('consignors')
      .select('id, name, phone, email, split_store, split_consignor, status, location_id, created_at, intake_date, expiry_date, grace_end_date')
      .limit(2000)
    if (effectiveLocation) {
      consignorsQuery = consignorsQuery.eq('location_id', effectiveLocation)
    } else {
      consignorsQuery = consignorsQuery.eq('account_id', user.account_id)
    }

    const markdownsQuery = supabase
      .from('markdowns')
      .select('id, item_id, markdown_pct, original_price, new_price, applied_at')
      .eq('account_id', user.account_id)
      .limit(2000)

    const [itemsRes, consignorsRes, markdownsRes] = await Promise.all([
      itemsQuery,
      consignorsQuery,
      markdownsQuery,
    ])

    setItems((itemsRes.data as ItemRow[] | null) ?? [])
    setConsignors((consignorsRes.data as ConsignorRow[] | null) ?? [])
    setMarkdowns((markdownsRes.data as MarkdownRow[] | null) ?? [])
    setLoading(false)
  }, [user, activeLocationId, isAllLocations, supabase])

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

  // ─── Sort states ──────────────────────────────────────────
  const [catSort, setCatSort] = useState<SortConfig>({ key: 'revenue', dir: 'desc' })
  const [rankSort, setRankSort] = useState<SortConfig>({ key: 'revenue', dir: 'desc' })

  // ─── Consignor Report ──────────────────────────────────────
  const [selectedConsignorId, setSelectedConsignorId] = useState<string>('')
  const [consignorSearch, setConsignorSearch] = useState('')
  const [consignorDropdownOpen, setConsignorDropdownOpen] = useState(false)
  const [consignorItems, setConsignorItems] = useState<ItemRow[]>([])
  const [consignorItemsLoading, setConsignorItemsLoading] = useState(false)

  const selectedConsignor = consignors.find(c => c.id === selectedConsignorId) ?? null

  const filteredConsignorList = useMemo(() => {
    const q = consignorSearch.toLowerCase()
    return consignors
      .filter(c => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [consignors, consignorSearch])

  // Fetch items for selected consignor
  useEffect(() => {
    if (!selectedConsignorId) {
      setConsignorItems([])
      return
    }
    setConsignorItemsLoading(true)
    fetch(`/api/items?consignor_id=${selectedConsignorId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { items: [] })
      .then(({ items: data }) => setConsignorItems(data ?? []))
      .catch(() => setConsignorItems([]))
      .finally(() => setConsignorItemsLoading(false))
  }, [selectedConsignorId])

  // Consignor computed stats
  const crSold = consignorItems.filter(i => i.status === 'sold')
  const crPending = consignorItems.filter(i => i.status === 'pending').length
  const crPriced = consignorItems.filter(i => i.status === 'priced').length
  const crDonated = consignorItems.filter(i => i.status === 'donated').length
  const crReturned = consignorItems.filter(i => i.status === 'returned').length
  const crTotalSoldValue = crSold.reduce((s, i) => s + (i.sold_price ?? 0), 0)
  const crConsignorOwed = selectedConsignor
    ? crSold.reduce((s, i) => s + (i.sold_price ?? 0) * selectedConsignor.split_consignor / 100, 0)
    : 0
  const crStoreEarnings = selectedConsignor
    ? crSold.reduce((s, i) => s + (i.sold_price ?? 0) * selectedConsignor.split_store / 100, 0)
    : 0
  const crAvgDaysToSell = crSold.length > 0
    ? Math.round(crSold.reduce((s, i) =>
        s + (i.sold_date && i.intake_date ? daysBetween(i.intake_date, i.sold_date) : 0), 0) / crSold.length)
    : 0

  function selectConsignor(id: string) {
    setSelectedConsignorId(id)
    setConsignorSearch('')
    setConsignorDropdownOpen(false)
  }

  function exportConsignorPayoutSlip() {
    if (!selectedConsignor) return
    const headers = [
      'Consignor Name', 'Consignor Phone', 'Consignor Email',
      'Item Name', 'Category', 'Condition', 'Intake Date',
      'Asking Price', 'Sold Price', 'Days to Sell',
      'Store Cut $', 'Consignor Cut $', 'Split %', 'Status',
    ]

    const rows = consignorItems.map(i => {
      const isSold = i.status === 'sold'
      return [
        selectedConsignor.name,
        selectedConsignor.phone ?? '',
        selectedConsignor.email ?? '',
        i.name,
        i.category,
        i.condition,
        i.intake_date,
        (i.price ?? 0).toFixed(2),
        isSold ? (i.sold_price ?? 0).toFixed(2) : '',
        isSold && i.sold_date ? daysBetween(i.intake_date, i.sold_date).toString() : '',
        isSold ? ((i.sold_price ?? 0) * selectedConsignor.split_store / 100).toFixed(2) : '',
        isSold ? ((i.sold_price ?? 0) * selectedConsignor.split_consignor / 100).toFixed(2) : '',
        selectedConsignor.split_consignor.toString(),
        i.status,
      ]
    })

    // Summary row
    rows.push([
      'TOTAL', '', '', '', '', '', '',
      '',
      crTotalSoldValue.toFixed(2),
      '',
      crStoreEarnings.toFixed(2),
      crConsignorOwed.toFixed(2),
      '',
      `${crSold.length} sold`,
    ])

    const nameSlug = selectedConsignor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-consignor-${nameSlug}-${dateSlug}.csv`)
  }

  // ─── Section 6: Category Performance ─────────────────────────
  const categoryStats = useMemo(() => {
    const cats = new Map<string, { items: number; sold: number; revenue: number; daysSum: number; daysCount: number }>()
    for (const i of items) {
      const c = i.category || 'Uncategorized'
      if (!cats.has(c)) cats.set(c, { items: 0, sold: 0, revenue: 0, daysSum: 0, daysCount: 0 })
      cats.get(c)!.items++
    }
    for (const i of soldInPeriod) {
      const c = i.category || 'Uncategorized'
      if (!cats.has(c)) cats.set(c, { items: 0, sold: 0, revenue: 0, daysSum: 0, daysCount: 0 })
      const e = cats.get(c)!
      e.sold++
      e.revenue += i.sold_price ?? 0
      if (i.sold_date && i.intake_date) { e.daysSum += daysBetween(i.intake_date, i.sold_date); e.daysCount++ }
    }
    return Array.from(cats.entries()).map(([category, s]) => ({
      category,
      items: s.items,
      sold: s.sold,
      revenue: s.revenue,
      avgPrice: s.sold > 0 ? s.revenue / s.sold : 0,
      avgDays: s.daysCount > 0 ? Math.round(s.daysSum / s.daysCount) : 0,
      sellThrough: s.items > 0 ? Math.round(s.sold / s.items * 100) : 0,
    }))
  }, [items, soldInPeriod])

  const sortedCategoryStats = useMemo(() => sortRows(categoryStats, catSort.key, catSort.dir), [categoryStats, catSort])

  function exportCategoryPerformance() {
    const headers = ['Category', 'Total Items', 'Sold', 'Revenue', 'Avg Sale Price', 'Avg Days to Sell', 'Sell-Through %']
    const rows = sortedCategoryStats.map(c => [
      c.category, c.items.toString(), c.sold.toString(), c.revenue.toFixed(2),
      c.avgPrice.toFixed(2), c.avgDays.toString(), c.sellThrough.toString(),
    ])
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-category-performance-${periodSlug}-${dateSlug}.csv`)
  }

  // ─── Section 7: Aging Inventory ─────────────────────────────
  const agingItems = useMemo(() => {
    const active = items.filter(i => i.status === 'pending' || i.status === 'priced')
    return active
      .map(i => {
        const daysOnFloor = daysBetween(i.intake_date, new Date().toISOString().split('T')[0])
        const expiryDate = i.consignor?.expiry_date
        const daysUntilExpiry = expiryDate ? daysBetween(new Date().toISOString().split('T')[0], expiryDate) : null
        return { ...i, daysOnFloor, daysUntilExpiry }
      })
      .sort((a, b) => a.daysOnFloor - b.daysOnFloor > 0 ? -1 : 1) // oldest first
  }, [items])

  function exportAgingInventory() {
    const headers = ['Item Name', 'Category', 'Condition', 'Status', 'Intake Date', 'Days on Floor',
      'Asking Price', 'Consignor', 'Expiry Date', 'Days Until Expiry']
    const rows = agingItems.map(i => [
      i.name, i.category, i.condition, i.status, i.intake_date, i.daysOnFloor.toString(),
      (i.price ?? 0).toFixed(2), i.consignor?.name ?? 'Unknown',
      i.consignor?.expiry_date ?? '', i.daysUntilExpiry?.toString() ?? '',
    ])
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-aging-inventory-${dateSlug}.csv`)
  }

  // ─── Section 8: Consignor Performance Rankings ──────────────
  const consignorRankings = useMemo(() => {
    const map = new Map<string, {
      name: string; items: number; sold: number; revenue: number
      daysSum: number; daysCount: number; consignorEarned: number
    }>()
    for (const i of items) {
      const cId = i.consignor_id
      if (!map.has(cId)) {
        map.set(cId, { name: i.consignor?.name ?? 'Unknown', items: 0, sold: 0, revenue: 0, daysSum: 0, daysCount: 0, consignorEarned: 0 })
      }
      map.get(cId)!.items++
    }
    for (const i of soldInPeriod) {
      const cId = i.consignor_id
      if (!map.has(cId)) {
        map.set(cId, { name: i.consignor?.name ?? 'Unknown', items: 0, sold: 0, revenue: 0, daysSum: 0, daysCount: 0, consignorEarned: 0 })
      }
      const e = map.get(cId)!
      e.sold++
      e.revenue += i.sold_price ?? 0
      e.consignorEarned += (i.sold_price ?? 0) * (i.consignor?.split_consignor ?? 50) / 100
      if (i.sold_date && i.intake_date) { e.daysSum += daysBetween(i.intake_date, i.sold_date); e.daysCount++ }
    }
    return Array.from(map.entries()).map(([id, s]) => ({
      id,
      name: s.name,
      items: s.items,
      sold: s.sold,
      revenue: s.revenue,
      avgDays: s.daysCount > 0 ? Math.round(s.daysSum / s.daysCount) : 0,
      consignorEarned: s.consignorEarned,
      sellThrough: s.items > 0 ? Math.round(s.sold / s.items * 100) : 0,
    }))
  }, [items, soldInPeriod])

  const sortedRankings = useMemo(() => sortRows(consignorRankings, rankSort.key, rankSort.dir), [consignorRankings, rankSort])

  function exportConsignorRankings() {
    const headers = ['Consignor', 'Total Items', 'Sold', 'Revenue', 'Avg Days to Sell', 'Consignor Earned', 'Sell-Through %']
    const rows = sortedRankings.map(c => [
      c.name, c.items.toString(), c.sold.toString(), c.revenue.toFixed(2),
      c.avgDays.toString(), c.consignorEarned.toFixed(2), c.sellThrough.toString(),
    ])
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-consignor-rankings-${periodSlug}-${dateSlug}.csv`)
  }

  // ─── Section 9: Weekly Operations Summary ───────────────────
  const weeklyOps = useMemo(() => {
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(thisWeekStart.getDate() - 7)
    thisWeekStart.setHours(0, 0, 0, 0)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const inRange = (dateStr: string | null, from: Date, to: Date) => {
      if (!dateStr) return false
      const d = new Date(dateStr)
      return d >= from && d <= to
    }

    const thisWeek = {
      intaked: items.filter(i => inRange(i.intake_date, thisWeekStart, now)).length,
      priced: items.filter(i => inRange(i.priced_at, thisWeekStart, now)).length,
      sold: items.filter(i => i.status === 'sold' && inRange(i.sold_date, thisWeekStart, now)).length,
      donated: items.filter(i => i.status === 'donated' && inRange(i.donated_at, thisWeekStart, now)).length,
      revenue: items.filter(i => i.status === 'sold' && inRange(i.sold_date, thisWeekStart, now))
        .reduce((s, i) => s + (i.sold_price ?? 0), 0),
    }
    const lastWeek = {
      intaked: items.filter(i => inRange(i.intake_date, lastWeekStart, thisWeekStart)).length,
      priced: items.filter(i => inRange(i.priced_at, lastWeekStart, thisWeekStart)).length,
      sold: items.filter(i => i.status === 'sold' && inRange(i.sold_date, lastWeekStart, thisWeekStart)).length,
      donated: items.filter(i => i.status === 'donated' && inRange(i.donated_at, lastWeekStart, thisWeekStart)).length,
      revenue: items.filter(i => i.status === 'sold' && inRange(i.sold_date, lastWeekStart, thisWeekStart))
        .reduce((s, i) => s + (i.sold_price ?? 0), 0),
    }

    return { thisWeek, lastWeek }
  }, [items])

  // ─── Section 10: Markdown Effectiveness ─────────────────────
  const markdownStats = useMemo(() => {
    const soldWithMarkdown = soldInPeriod.filter(i => markdownByItem.has(i.id))
    const byLevel = new Map<number, { count: number; origSum: number; soldSum: number; daysSum: number; daysCount: number }>()

    for (const i of soldWithMarkdown) {
      const md = markdownByItem.get(i.id)!
      const pct = md.markdown_pct
      if (!byLevel.has(pct)) byLevel.set(pct, { count: 0, origSum: 0, soldSum: 0, daysSum: 0, daysCount: 0 })
      const e = byLevel.get(pct)!
      e.count++
      e.origSum += md.original_price
      e.soldSum += i.sold_price ?? 0
      if (i.sold_date && i.intake_date) { e.daysSum += daysBetween(i.intake_date, i.sold_date); e.daysCount++ }
    }

    const totalSoldCount = soldInPeriod.length
    const markdownCount = soldWithMarkdown.length
    const markdownRevenue = soldWithMarkdown.reduce((s, i) => s + (i.sold_price ?? 0), 0)
    const fullPriceRevenue = soldInPeriod.filter(i => !markdownByItem.has(i.id)).reduce((s, i) => s + (i.sold_price ?? 0), 0)

    const levels = Array.from(byLevel.entries())
      .map(([pct, s]) => ({
        pct,
        count: s.count,
        avgOriginal: s.count > 0 ? s.origSum / s.count : 0,
        avgSold: s.count > 0 ? s.soldSum / s.count : 0,
        totalRevenue: s.soldSum,
        avgDays: s.daysCount > 0 ? Math.round(s.daysSum / s.daysCount) : 0,
      }))
      .sort((a, b) => a.pct - b.pct)

    return { markdownCount, totalSoldCount, markdownRevenue, fullPriceRevenue, levels }
  }, [soldInPeriod, markdownByItem])

  function exportMarkdownEffectiveness() {
    const headers = ['Markdown %', 'Items Sold', 'Avg Original Price', 'Avg Sold Price', 'Total Revenue', 'Avg Days to Sell']
    const rows = markdownStats.levels.map(l => [
      `${l.pct}%`, l.count.toString(), l.avgOriginal.toFixed(2), l.avgSold.toFixed(2),
      l.totalRevenue.toFixed(2), l.avgDays.toString(),
    ])
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-markdown-effectiveness-${periodSlug}-${dateSlug}.csv`)
  }

  // ─── Section 11: Pricing Accuracy ───────────────────────────
  const pricingAccuracy = useMemo(() => {
    const aiPriced = soldInPeriod.filter(i => i.low_price != null && i.high_price != null && i.sold_price != null)
    let withinRange = 0
    let aboveRange = 0
    let belowRange = 0
    let totalVariance = 0

    const details = aiPriced.map(i => {
      const low = i.low_price!
      const high = i.high_price!
      const sold = i.sold_price!
      const midpoint = (low + high) / 2
      const variance = ((sold - midpoint) / midpoint) * 100
      totalVariance += Math.abs(variance)

      let accuracy: 'within' | 'above' | 'below'
      if (sold >= low && sold <= high) { accuracy = 'within'; withinRange++ }
      else if (sold > high) { accuracy = 'above'; aboveRange++ }
      else { accuracy = 'below'; belowRange++ }

      return { ...i, low, high, sold, midpoint, variance, accuracy }
    })

    const total = aiPriced.length
    const avgVariance = total > 0 ? totalVariance / total : 0

    return { total, withinRange, aboveRange, belowRange, avgVariance, details }
  }, [soldInPeriod])

  function exportPricingAccuracy() {
    const headers = ['Item Name', 'Category', 'AI Low', 'AI High', 'AI Midpoint', 'Sold Price', 'Variance %', 'Accuracy']
    const rows = pricingAccuracy.details.map(d => [
      d.name, d.category, d.low.toFixed(2), d.high.toFixed(2), d.midpoint.toFixed(2),
      d.sold.toFixed(2), d.variance.toFixed(1), d.accuracy,
    ])
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-pricing-accuracy-${periodSlug}-${dateSlug}.csv`)
  }

  // ─── Section 12: Payout Reconciliation ──────────────────────
  const payoutReconciliation = useMemo(() => {
    // All-time — ignores period filter
    const allSold = items.filter(i => i.status === 'sold')
    const byConsignor = new Map<string, {
      name: string; phone: string; email: string
      totalSold: number; consignorShare: number; paidAmount: number
    }>()

    for (const i of allSold) {
      const cId = i.consignor_id
      if (!byConsignor.has(cId)) {
        byConsignor.set(cId, {
          name: i.consignor?.name ?? 'Unknown',
          phone: i.consignor?.phone ?? '',
          email: i.consignor?.email ?? '',
          totalSold: 0, consignorShare: 0, paidAmount: 0,
        })
      }
      const e = byConsignor.get(cId)!
      e.totalSold += i.sold_price ?? 0
      e.consignorShare += (i.sold_price ?? 0) * (i.consignor?.split_consignor ?? 50) / 100
    }

    return Array.from(byConsignor.entries()).map(([id, s]) => ({
      id, ...s, balance: s.consignorShare - s.paidAmount,
    })).sort((a, b) => b.balance - a.balance)
  }, [items])

  function exportPayoutReconciliation() {
    const headers = ['Consignor', 'Phone', 'Email', 'Total Sold Value', 'Consignor Share', 'Paid', 'Balance Owed']
    const rows = payoutReconciliation.map(c => [
      c.name, c.phone, c.email, c.totalSold.toFixed(2),
      c.consignorShare.toFixed(2), c.paidAmount.toFixed(2), c.balance.toFixed(2),
    ])
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-payout-reconciliation-${dateSlug}.csv`)
  }

  // ─── Section 13: Donation & Tax Report ──────────────────────
  const donationTaxData = useMemo(() => {
    const donated = donatedInPeriod
    const byConsignor = new Map<string, { name: string; items: typeof donated; totalFMV: number }>()

    for (const i of donated) {
      const cId = i.consignor_id
      if (!byConsignor.has(cId)) {
        byConsignor.set(cId, { name: i.consignor?.name ?? 'Unknown', items: [], totalFMV: 0 })
      }
      const e = byConsignor.get(cId)!
      e.items.push(i)
      e.totalFMV += i.price ?? 0
    }

    const totalFMV = donated.reduce((s, i) => s + (i.price ?? 0), 0)
    const groups = Array.from(byConsignor.values()).sort((a, b) => b.totalFMV - a.totalFMV)
    return { totalItems: donated.length, totalFMV, groups }
  }, [donatedInPeriod])

  function exportDonationTax() {
    const headers = ['Consignor', 'Item Name', 'Category', 'Condition', 'Original Asking Price (FMV)',
      'Intake Date', 'Donation Date', 'Location']
    const rows = donatedInPeriod.map(i => [
      i.consignor?.name ?? 'Unknown', i.name, i.category, i.condition,
      (i.price ?? 0).toFixed(2), i.intake_date, i.donated_at ?? '', getLocationName(i.location_id),
    ])
    downloadCsv(toCsvString([headers, ...rows]), `consigniq-donation-tax-${periodSlug}-${dateSlug}.csv`)
  }

  // ─── Render ─────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="w-full lg:max-w-5xl lg:mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-400">{periodLabel}</p>
        </div>
      </div>

      {/* Location toggle (owner only) */}
      {canSwitchLocations && (
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-gray-400" />
          <select
            value={isAllLocations ? 'all' : (activeLocationId ?? '')}
            onChange={e => setActiveLocation(e.target.value)}
            className="appearance-none px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ═══ AI Report Prompt Bar ═══ */}
      <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-semibold text-brand-700">Ask a question about your data</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={e => setAiQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !aiLoading && handleAiQuery()}
            placeholder="e.g. What are our top selling categories this month?"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            disabled={aiLoading}
          />
          <button
            onClick={() => handleAiQuery()}
            disabled={aiLoading || !aiQuery.trim()}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ask
          </button>
        </div>
        {/* Suggested prompts */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {AI_SUGGESTED_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => { setAiQuery(prompt); handleAiQuery(prompt) }}
              disabled={aiLoading}
              className="px-2.5 py-1 text-xs rounded-full bg-white border border-brand-200 text-brand-600 hover:bg-brand-100 disabled:opacity-50 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* AI Result */}
      {aiError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{aiError}</p>
            <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {aiResult && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-semibold text-gray-900">{aiResult.question}</span>
            </div>
            <button onClick={() => { setAiResult(null); setAiQuery('') }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {aiResult.summary && (
            <p className="text-sm text-gray-700 mb-3 bg-brand-50 rounded-lg p-3">{aiResult.summary}</p>
          )}
          {aiResult.rows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {aiResult.columns.map(col => (
                      <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aiResult.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {aiResult.columns.map(col => (
                        <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {row[col] == null ? '—' : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No results returned.</p>
          )}
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <Sparkles className="w-3 h-3" />
            Powered by AI
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
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
                color="brand"
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
                disabled={items.length === 0}
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
                color="brand"
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
                      className="bg-brand-500 rounded-l-full"
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
                color="brand"
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

          {/* ═══ Section 5: Consignor Report ═══ */}
          <Section title="Consignor Report">
            {/* Searchable consignor dropdown */}
            <div className="relative mb-4">
              <div
                className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors"
                onClick={() => setConsignorDropdownOpen(!consignorDropdownOpen)}
              >
                <User className="w-4 h-4 text-gray-400" />
                <span className={`flex-1 text-sm ${selectedConsignor ? 'text-gray-900' : 'text-gray-400'}`}>
                  {selectedConsignor?.name ?? 'Select a consignor...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${consignorDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {consignorDropdownOpen && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                      <input
                        type="text"
                        value={consignorSearch}
                        onChange={e => setConsignorSearch(e.target.value)}
                        placeholder="Search consignors..."
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {selectedConsignorId && (
                      <button
                        onClick={() => { setSelectedConsignorId(''); setConsignorDropdownOpen(false); setConsignorSearch(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        Clear selection
                      </button>
                    )}
                    {filteredConsignorList.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No consignors found</p>
                    ) : (
                      filteredConsignorList.map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectConsignor(c.id)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            c.id === selectedConsignorId
                              ? 'bg-brand-50 text-brand-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {c.name}
                          <span className="ml-2 text-xs text-gray-400 capitalize">{c.status}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Consignor report content */}
            {selectedConsignor && (
              consignorItemsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary card */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{selectedConsignor.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {selectedConsignor.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {selectedConsignor.phone}
                            </span>
                          )}
                          {selectedConsignor.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {selectedConsignor.email}
                            </span>
                          )}
                        </div>
                      </div>
                      {(() => {
                        const lc = getLifecycleStatus(selectedConsignor.intake_date, selectedConsignor.expiry_date, selectedConsignor.grace_end_date)
                        const colors = COLOR_CLASSES[lc.color]
                        return (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                            {lc.label}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Intake Date</p>
                        <p className="font-medium text-gray-900">{new Date(selectedConsignor.intake_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Expiry Date</p>
                        <p className="font-medium text-gray-900">{new Date(selectedConsignor.expiry_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Grace End</p>
                        <p className="font-medium text-gray-900">{new Date(selectedConsignor.grace_end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Split</p>
                        <p className="font-medium text-gray-900">
                          {selectedConsignor.split_store}% store / {selectedConsignor.split_consignor}% consignor
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Item breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={Package} label="Total Items" value={consignorItems.length} color="brand" />
                    <StatCard icon={Clock} label="Pending Pricing" value={crPending} color="amber" />
                    <StatCard icon={Tag} label="Priced / On Floor" value={crPriced} color="emerald" />
                    <StatCard
                      icon={DollarSign}
                      label="Items Sold"
                      value={crSold.length}
                      sub={`$${crTotalSoldValue.toFixed(2)} total`}
                      color="emerald"
                    />
                    <StatCard icon={Gift} label="Donated" value={crDonated} color="gray" />
                    <StatCard
                      icon={DollarSign}
                      label="Owed to Consignor"
                      value={`$${crConsignorOwed.toFixed(2)}`}
                      sub={`${selectedConsignor.split_consignor}% of sold`}
                      color="amber"
                    />
                    <StatCard
                      icon={Clock}
                      label="Avg Days to Sell"
                      value={crAvgDaysToSell}
                      sub="days"
                      color="brand"
                    />
                    {crReturned > 0 && (
                      <StatCard icon={Package} label="Returned/Expired" value={crReturned} color="red" />
                    )}
                  </div>

                  {/* Item detail table */}
                  {consignorItems.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                              <th className="text-left px-4 py-3">Item Name</th>
                              <th className="text-left px-4 py-3">Category</th>
                              <th className="text-left px-4 py-3">Condition</th>
                              <th className="text-left px-4 py-3">Status</th>
                              <th className="text-right px-4 py-3">Asking</th>
                              <th className="text-right px-4 py-3">Sold</th>
                              <th className="text-right px-4 py-3">Days</th>
                              <th className="text-right px-4 py-3">Consignor Cut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {consignorItems.map(i => {
                              const isSold = i.status === 'sold'
                              const dts = isSold && i.sold_date ? daysBetween(i.intake_date, i.sold_date) : null
                              const cut = isSold ? (i.sold_price ?? 0) * selectedConsignor.split_consignor / 100 : null
                              return (
                                <tr key={i.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{i.name}</td>
                                  <td className="px-4 py-2.5 text-gray-500">{i.category}</td>
                                  <td className="px-4 py-2.5 text-gray-500">{CONDITION_LABELS[i.condition as keyof typeof CONDITION_LABELS] ?? i.condition}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                      i.status === 'sold' ? 'bg-emerald-50 text-emerald-600'
                                      : i.status === 'priced' ? 'bg-brand-50 text-brand-600'
                                      : i.status === 'pending' ? 'bg-amber-50 text-amber-600'
                                      : i.status === 'donated' ? 'bg-gray-100 text-gray-500'
                                      : 'bg-red-50 text-red-600'
                                    }`}>
                                      {i.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-gray-700">{i.price != null ? `$${i.price.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right text-gray-700">{isSold && i.sold_price != null ? `$${i.sold_price.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right text-gray-500">{dts != null ? dts : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{cut != null ? `$${cut.toFixed(2)}` : '—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {crSold.length > 0 && (
                            <tfoot>
                              <tr className="border-t border-gray-200 bg-gray-50/50 font-semibold text-sm">
                                <td className="px-4 py-2.5 text-gray-900" colSpan={4}>Totals ({crSold.length} sold)</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">—</td>
                                <td className="px-4 py-2.5 text-right text-gray-900">${crTotalSoldValue.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{crAvgDaysToSell}d avg</td>
                                <td className="px-4 py-2.5 text-right text-gray-900">${crConsignorOwed.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Export button */}
                  <button
                    onClick={exportConsignorPayoutSlip}
                    disabled={consignorItems.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Consignor Payout Slip
                  </button>
                </div>
              )
            )}
          </Section>

          {/* ═══ Section 6: Category Performance ═══ */}
          <Section title="Category Performance">
            {sortedCategoryStats.length === 0 ? (
              <p className="text-sm text-gray-400">No category data available.</p>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                          <SortHeader label="Category" sortKey="category" current={catSort} onSort={k => setCatSort(toggleSort(catSort, k))} />
                          <SortHeader label="Items" sortKey="items" current={catSort} onSort={k => setCatSort(toggleSort(catSort, k))} align="right" />
                          <SortHeader label="Sold" sortKey="sold" current={catSort} onSort={k => setCatSort(toggleSort(catSort, k))} align="right" />
                          <SortHeader label="Revenue" sortKey="revenue" current={catSort} onSort={k => setCatSort(toggleSort(catSort, k))} align="right" />
                          <SortHeader label="Avg Price" sortKey="avgPrice" current={catSort} onSort={k => setCatSort(toggleSort(catSort, k))} align="right" />
                          <SortHeader label="Avg Days" sortKey="avgDays" current={catSort} onSort={k => setCatSort(toggleSort(catSort, k))} align="right" />
                          <SortHeader label="Sell-Through" sortKey="sellThrough" current={catSort} onSort={k => setCatSort(toggleSort(catSort, k))} align="right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedCategoryStats.map(c => (
                          <tr key={c.category} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{c.category}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{c.items}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{c.sold}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${c.revenue.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">${c.avgPrice.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{c.avgDays}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`text-xs font-semibold ${c.sellThrough >= 60 ? 'text-emerald-600' : c.sellThrough >= 30 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {c.sellThrough}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4">
                  <button onClick={exportCategoryPerformance} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Category Performance CSV
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ═══ Section 7: Aging Inventory ═══ */}
          <Section title="Aging Inventory">
            {agingItems.length === 0 ? (
              <p className="text-sm text-gray-400">No active inventory items.</p>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">{agingItems.length} active items, oldest first</p>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                          <th className="text-left px-4 py-3">Item Name</th>
                          <th className="text-left px-4 py-3">Category</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-right px-4 py-3">Days on Floor</th>
                          <th className="text-right px-4 py-3">Asking Price</th>
                          <th className="text-left px-4 py-3">Consignor</th>
                          <th className="text-right px-4 py-3">Expiry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {agingItems.slice(0, 50).map(i => {
                          const expiryColor = i.daysUntilExpiry == null ? 'text-gray-400'
                            : i.daysUntilExpiry <= 0 ? 'text-red-600 font-semibold'
                            : i.daysUntilExpiry <= 7 ? 'text-red-500'
                            : i.daysUntilExpiry <= 14 ? 'text-amber-500'
                            : 'text-emerald-600'
                          return (
                            <tr key={i.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{i.name}</td>
                              <td className="px-4 py-2.5 text-gray-500">{i.category}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  i.status === 'priced' ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-amber-600'
                                }`}>{i.status}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-gray-900">{i.daysOnFloor}d</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">{i.price != null ? `$${i.price.toFixed(2)}` : '—'}</td>
                              <td className="px-4 py-2.5 text-gray-500">{i.consignor?.name ?? 'Unknown'}</td>
                              <td className={`px-4 py-2.5 text-right ${expiryColor}`}>
                                {i.daysUntilExpiry != null ? (i.daysUntilExpiry <= 0 ? 'Expired' : `${i.daysUntilExpiry}d`) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {agingItems.length > 50 && (
                    <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                      Showing 50 of {agingItems.length} items. Export CSV for full list.
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <button onClick={exportAgingInventory} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Aging Inventory CSV
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ═══ Section 8: Consignor Performance Rankings ═══ */}
          <Section title="Consignor Performance Rankings">
            {sortedRankings.length === 0 ? (
              <p className="text-sm text-gray-400">No consignor data available.</p>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                          <SortHeader label="Consignor" sortKey="name" current={rankSort} onSort={k => setRankSort(toggleSort(rankSort, k))} />
                          <SortHeader label="Items" sortKey="items" current={rankSort} onSort={k => setRankSort(toggleSort(rankSort, k))} align="right" />
                          <SortHeader label="Sold" sortKey="sold" current={rankSort} onSort={k => setRankSort(toggleSort(rankSort, k))} align="right" />
                          <SortHeader label="Revenue" sortKey="revenue" current={rankSort} onSort={k => setRankSort(toggleSort(rankSort, k))} align="right" />
                          <SortHeader label="Avg Days" sortKey="avgDays" current={rankSort} onSort={k => setRankSort(toggleSort(rankSort, k))} align="right" />
                          <SortHeader label="Earned" sortKey="consignorEarned" current={rankSort} onSort={k => setRankSort(toggleSort(rankSort, k))} align="right" />
                          <SortHeader label="Sell-Through" sortKey="sellThrough" current={rankSort} onSort={k => setRankSort(toggleSort(rankSort, k))} align="right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedRankings.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{c.items}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{c.sold}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${c.revenue.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{c.avgDays}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${c.consignorEarned.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`text-xs font-semibold ${c.sellThrough >= 60 ? 'text-emerald-600' : c.sellThrough >= 30 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {c.sellThrough}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4">
                  <button onClick={exportConsignorRankings} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Consignor Rankings CSV
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ═══ Section 9: Weekly Operations Summary ═══ */}
          <Section title="Weekly Operations Summary">
            <p className="text-xs text-gray-400 mb-3">Last 7 days vs previous 7 days</p>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {([
                { label: 'Items Intake\'d', icon: Package, thisWeek: weeklyOps.thisWeek.intaked, lastWeek: weeklyOps.lastWeek.intaked },
                { label: 'Items Priced', icon: Tag, thisWeek: weeklyOps.thisWeek.priced, lastWeek: weeklyOps.lastWeek.priced },
                { label: 'Items Sold', icon: DollarSign, thisWeek: weeklyOps.thisWeek.sold, lastWeek: weeklyOps.lastWeek.sold },
                { label: 'Items Donated', icon: Gift, thisWeek: weeklyOps.thisWeek.donated, lastWeek: weeklyOps.lastWeek.donated },
              ] as const).map(row => {
                const pctChange = row.lastWeek > 0 ? Math.round((row.thisWeek - row.lastWeek) / row.lastWeek * 100) : (row.thisWeek > 0 ? 100 : 0)
                return (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <row.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">{row.thisWeek}</span>
                      <span className="text-xs text-gray-400">vs {row.lastWeek}</span>
                      {pctChange !== 0 && (
                        <span className={`text-xs font-semibold ${pctChange > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {pctChange > 0 ? '+' : ''}{pctChange}%
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Revenue</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">${weeklyOps.thisWeek.revenue.toFixed(2)}</span>
                  <span className="text-xs text-gray-400">vs ${weeklyOps.lastWeek.revenue.toFixed(2)}</span>
                  {weeklyOps.lastWeek.revenue > 0 && (() => {
                    const pct = Math.round((weeklyOps.thisWeek.revenue - weeklyOps.lastWeek.revenue) / weeklyOps.lastWeek.revenue * 100)
                    return pct !== 0 ? (
                      <span className={`text-xs font-semibold ${pct > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pct > 0 ? '+' : ''}{pct}%
                      </span>
                    ) : null
                  })()}
                </div>
              </div>
            </div>
          </Section>

          {/* ═══ Section 10: Markdown Effectiveness ═══ */}
          <Section title="Markdown Effectiveness">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard icon={Percent} label="Markdown Sales" value={markdownStats.markdownCount}
                sub={`of ${markdownStats.totalSoldCount} total sold`} color="amber" />
              <StatCard icon={DollarSign} label="Markdown Revenue" value={`$${markdownStats.markdownRevenue.toFixed(2)}`} color="amber" />
              <StatCard icon={DollarSign} label="Full Price Revenue" value={`$${markdownStats.fullPriceRevenue.toFixed(2)}`} color="emerald" />
              <StatCard icon={TrendingUp} label="Markdown Rate"
                value={markdownStats.totalSoldCount > 0 ? `${Math.round(markdownStats.markdownCount / markdownStats.totalSoldCount * 100)}%` : '0%'}
                color={markdownStats.markdownCount > markdownStats.totalSoldCount / 2 ? 'red' : 'brand'} />
            </div>

            {markdownStats.levels.length > 0 && (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                          <th className="text-left px-4 py-3">Markdown %</th>
                          <th className="text-right px-4 py-3">Items Sold</th>
                          <th className="text-right px-4 py-3">Avg Original</th>
                          <th className="text-right px-4 py-3">Avg Sold</th>
                          <th className="text-right px-4 py-3">Total Revenue</th>
                          <th className="text-right px-4 py-3">Avg Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {markdownStats.levels.map(l => (
                          <tr key={l.pct} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{l.pct}%</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{l.count}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">${l.avgOriginal.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${l.avgSold.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${l.totalRevenue.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{l.avgDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4">
                  <button onClick={exportMarkdownEffectiveness} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Markdown Effectiveness CSV
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ═══ Section 11: Pricing Accuracy ═══ */}
          <Section title="Pricing Accuracy (AI vs Actual)">
            {pricingAccuracy.total === 0 ? (
              <p className="text-sm text-gray-400">No AI-priced sold items available for accuracy analysis.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <StatCard icon={Target} label="AI-Priced & Sold" value={pricingAccuracy.total} color="brand" />
                  <StatCard icon={Target} label="Within Range"
                    value={`${Math.round(pricingAccuracy.withinRange / pricingAccuracy.total * 100)}%`}
                    sub={`${pricingAccuracy.withinRange} items`} color="emerald" />
                  <StatCard icon={TrendingUp} label="Sold Above Range"
                    value={pricingAccuracy.aboveRange} sub="under-priced by AI" color="amber" />
                  <StatCard icon={AlertTriangle} label="Sold Below Range"
                    value={pricingAccuracy.belowRange} sub="over-priced by AI" color="red" />
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                          <th className="text-left px-4 py-3">Item Name</th>
                          <th className="text-left px-4 py-3">Category</th>
                          <th className="text-right px-4 py-3">AI Range</th>
                          <th className="text-right px-4 py-3">Sold Price</th>
                          <th className="text-right px-4 py-3">Variance</th>
                          <th className="text-left px-4 py-3">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pricingAccuracy.details.slice(0, 50).map(d => (
                          <tr key={d.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{d.name}</td>
                            <td className="px-4 py-2.5 text-gray-500">{d.category}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">${d.low.toFixed(0)}–${d.high.toFixed(0)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${d.sold.toFixed(2)}</td>
                            <td className={`px-4 py-2.5 text-right font-medium ${
                              d.accuracy === 'within' ? 'text-emerald-600' : d.accuracy === 'above' ? 'text-amber-600' : 'text-red-500'
                            }`}>
                              {d.variance > 0 ? '+' : ''}{d.variance.toFixed(1)}%
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                d.accuracy === 'within' ? 'bg-emerald-50 text-emerald-600'
                                : d.accuracy === 'above' ? 'bg-amber-50 text-amber-600'
                                : 'bg-red-50 text-red-600'
                              }`}>
                                {d.accuracy}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pricingAccuracy.details.length > 50 && (
                    <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                      Showing 50 of {pricingAccuracy.details.length} items. Export CSV for full list.
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <button onClick={exportPricingAccuracy} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Pricing Accuracy CSV
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ═══ Section 12: Payout Reconciliation ═══ */}
          <Section title="Payout Reconciliation (All Time)">
            {payoutReconciliation.length === 0 ? (
              <p className="text-sm text-gray-400">No sold items for reconciliation.</p>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  All-time ledger. Paid tracking is stubbed — mark payouts as complete in a future update.
                </p>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                          <th className="text-left px-4 py-3">Consignor</th>
                          <th className="text-right px-4 py-3">Total Sold</th>
                          <th className="text-right px-4 py-3">Consignor Share</th>
                          <th className="text-right px-4 py-3">Paid</th>
                          <th className="text-right px-4 py-3">Balance Owed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {payoutReconciliation.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${c.totalSold.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">${c.consignorShare.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">${c.paidAmount.toFixed(2)}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold ${c.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              ${c.balance.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 bg-gray-50/50 font-semibold text-sm">
                          <td className="px-4 py-2.5 text-gray-900">Total</td>
                          <td className="px-4 py-2.5 text-right text-gray-900">
                            ${payoutReconciliation.reduce((s, c) => s + c.totalSold, 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-900">
                            ${payoutReconciliation.reduce((s, c) => s + c.consignorShare, 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-400">
                            ${payoutReconciliation.reduce((s, c) => s + c.paidAmount, 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-amber-600">
                            ${payoutReconciliation.reduce((s, c) => s + c.balance, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                <div className="mt-4">
                  <button onClick={exportPayoutReconciliation} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Payout Reconciliation CSV
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ═══ Section 13: Donation & Tax Report ═══ */}
          <Section title="Donation & Tax Report">
            {donationTaxData.totalItems === 0 ? (
              <p className="text-sm text-gray-400">No donated items in this period.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <StatCard icon={Gift} label="Items Donated" value={donationTaxData.totalItems} color="gray" />
                  <StatCard icon={DollarSign} label="Total Fair Market Value"
                    value={`$${donationTaxData.totalFMV.toFixed(2)}`}
                    sub="based on original asking price" color="brand" />
                  <StatCard icon={FileText} label="Consignors" value={donationTaxData.groups.length} color="brand" />
                </div>

                {donationTaxData.groups.map(group => (
                  <div key={group.name} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">{group.name}</h3>
                      <span className="text-xs text-gray-400">
                        {group.items.length} items — FMV: ${group.totalFMV.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                              <th className="text-left px-4 py-2">Item Name</th>
                              <th className="text-left px-4 py-2">Category</th>
                              <th className="text-left px-4 py-2">Condition</th>
                              <th className="text-right px-4 py-2">FMV (Asking Price)</th>
                              <th className="text-left px-4 py-2">Intake Date</th>
                              <th className="text-left px-4 py-2">Donation Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {group.items.map(i => (
                              <tr key={i.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-2 font-medium text-gray-900 max-w-[200px] truncate">{i.name}</td>
                                <td className="px-4 py-2 text-gray-500">{i.category}</td>
                                <td className="px-4 py-2 text-gray-500">{CONDITION_LABELS[i.condition as keyof typeof CONDITION_LABELS] ?? i.condition}</td>
                                <td className="px-4 py-2 text-right text-gray-700">${(i.price ?? 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-gray-500">{i.intake_date}</td>
                                <td className="px-4 py-2 text-gray-500">{i.donated_at ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-100 bg-gray-50/50">
                              <td className="px-4 py-2 font-semibold text-gray-700" colSpan={3}>Subtotal</td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-900">${group.totalFMV.toFixed(2)}</td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={exportDonationTax} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Donation & Tax Report CSV
                </button>
              </>
            )}
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

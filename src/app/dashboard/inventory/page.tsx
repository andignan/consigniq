// app/dashboard/inventory/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Filter, Download, Package, Loader2, X,
  Tag, DollarSign, Gift, Pencil, Sparkles, Users,
} from 'lucide-react'
import type { Item, ItemStatus, ItemCondition } from '@/types'
import { ITEM_CATEGORIES, CONDITION_LABELS } from '@/types'
import { useUser } from '@/contexts/UserContext'

interface ConsignorOption {
  id: string
  name: string
}

// ─── Status config ────────────────────────────────────────────
const STATUS_TABS: { value: ItemStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'priced', label: 'Priced', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'sold', label: 'Sold', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'donated', label: 'Donated', color: 'bg-gray-100 text-gray-500' },
]

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  priced: 'bg-indigo-50 text-indigo-600',
  sold: 'bg-emerald-50 text-emerald-600',
  donated: 'bg-gray-100 text-gray-500',
  returned: 'bg-red-50 text-red-600',
}

// ─── Types ────────────────────────────────────────────────────
type ModalMode = null | 'edit' | 'sell' | 'donate'

interface ItemWithConsignor extends Item {
  consignor?: { id: string; name: string }
}

// ─── Main page ────────────────────────────────────────────────
export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useUser()

  const [items, setItems] = useState<ItemWithConsignor[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>(
    (searchParams.get('status') as ItemStatus) || 'all'
  )
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [consignorFilter, setConsignorFilter] = useState(searchParams.get('consignor_id') || '')
  const [consignors, setConsignors] = useState<ConsignorOption[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Modal state
  const [modalItem, setModalItem] = useState<ItemWithConsignor | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editCondition, setEditCondition] = useState<ItemCondition>('good')
  const [editDescription, setEditDescription] = useState('')

  // Sell form state
  const [soldPrice, setSoldPrice] = useState('')

  // ─── Fetch consignors for filter dropdown ────────────────
  useEffect(() => {
    if (!user?.location_id) return
    fetch(`/api/consignors?location_id=${user.location_id}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { consignors: [] })
      .then(({ consignors: data }) => {
        const sorted = (data ?? [])
          .map((c: ConsignorOption) => ({ id: c.id, name: c.name }))
          .sort((a: ConsignorOption, b: ConsignorOption) => a.name.localeCompare(b.name))
        setConsignors(sorted)
      })
      .catch(() => setConsignors([]))
  }, [user?.location_id])

  // ─── Fetch items ──────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (user?.location_id) params.set('location_id', user.location_id)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    if (consignorFilter) params.set('consignor_id', consignorFilter)
    if (searchQuery) params.set('search', searchQuery)

    try {
      const res = await fetch(`/api/items?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load')
      const { items: data } = await res.json()
      setItems(data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, consignorFilter, searchQuery, user?.location_id])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    if (consignorFilter) params.set('consignor_id', consignorFilter)
    if (searchQuery) params.set('search', searchQuery)
    const qs = params.toString()
    router.replace('/dashboard/inventory' + (qs ? '?' + qs : ''), { scroll: false })
  }, [statusFilter, categoryFilter, consignorFilter, searchQuery, router])

  // Debounced search
  function handleSearch(value: string) {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      // fetchItems will fire via useEffect
    }, 300)
  }

  // ─── Modal open helpers ───────────────────────────────────
  function openEdit(item: ItemWithConsignor) {
    setModalItem(item)
    setEditName(item.name)
    setEditCategory(item.category)
    setEditCondition(item.condition)
    setEditDescription(item.description ?? '')
    setModalMode('edit')
  }

  function openSell(item: ItemWithConsignor) {
    setModalItem(item)
    setSoldPrice(item.price?.toString() ?? '')
    setModalMode('sell')
  }

  function openDonate(item: ItemWithConsignor) {
    setModalItem(item)
    setModalMode('donate')
  }

  function closeModal() {
    setModalItem(null)
    setModalMode(null)
    setSaving(false)
  }

  // ─── Save handlers ───────────────────────────────────────
  async function saveEdit() {
    if (!modalItem) return
    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalItem.id,
          name: editName,
          category: editCategory,
          condition: editCondition,
          description: editDescription || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      closeModal()
      fetchItems()
    } catch {
      setSaving(false)
    }
  }

  async function saveSold() {
    if (!modalItem || !soldPrice) return
    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalItem.id,
          status: 'sold',
          sold_price: parseFloat(soldPrice),
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      closeModal()
      fetchItems()
    } catch {
      setSaving(false)
    }
  }

  async function saveDonate() {
    if (!modalItem) return
    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalItem.id,
          status: 'donated',
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      closeModal()
      fetchItems()
    } catch {
      setSaving(false)
    }
  }

  // ─── CSV Export ───────────────────────────────────────────
  function exportCSV() {
    const headers = [
      'Name', 'Category', 'Condition', 'Status', 'Price', 'Sold Price',
      'Consignor', 'Intake Date', 'Description',
    ]
    const rows = items.map(i => [
      i.name,
      i.category,
      i.condition,
      i.status,
      i.price?.toString() ?? '',
      i.sold_price?.toString() ?? '',
      i.consignor?.name ?? '',
      i.intake_date,
      (i.description ?? '').replace(/"/g, '""'),
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const consignorSlug = consignorFilter
      ? (consignors.find(c => c.id === consignorFilter)?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'consignor'
      : ''
    const parts = ['inventory', statusFilter, consignorSlug, categoryFilter.toLowerCase().replace(/[^a-z0-9]+/g, '')]
      .filter(Boolean)
    a.download = `${parts.join('-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-400">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={items.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? tab.color + ' ring-1 ring-gray-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + category filter row */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          <select
            value={consignorFilter}
            onChange={e => setConsignorFilter(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Consignors</option>
            {consignors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {ITEM_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No items found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {item.name}
                    </h3>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{item.category}</span>
                    <span className="text-gray-200">·</span>
                    <span>{CONDITION_LABELS[item.condition] ?? item.condition}</span>
                    {item.consignor?.name && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span>{item.consignor.name}</span>
                      </>
                    )}
                  </div>
                  {item.price != null && (
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      ${item.price.toFixed(2)}
                      {item.sold_price != null && item.status === 'sold' && (
                        <span className="text-emerald-600 ml-2">
                          Sold ${item.sold_price.toFixed(2)}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1 shrink-0">
                  {item.status === 'pending' && (
                    <Link
                      href={`/dashboard/inventory/${item.id}/price`}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Price
                    </Link>
                  )}
                  {(item.status === 'pending' || item.status === 'priced') && (
                    <>
                      <button
                        onClick={() => openSell(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Sell
                      </button>
                      <button
                        onClick={() => openDonate(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Gift className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => openEdit(item)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal overlay ──────────────────────────────────── */}
      {modalMode && modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Edit modal */}
            {modalMode === 'edit' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900">Edit Item</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {ITEM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Condition</label>
                    <select
                      value={editCondition}
                      onChange={e => setEditCondition(e.target.value as ItemCondition)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving || !editName.trim()}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}

            {/* Sell modal */}
            {modalMode === 'sell' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900">Mark as Sold</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-1">{modalItem.name}</p>
                {modalItem.price != null && (
                  <p className="text-xs text-gray-400 mb-4">
                    Listed at ${modalItem.price.toFixed(2)}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sold Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={soldPrice}
                      onChange={e => setSoldPrice(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSold}
                    disabled={saving || !soldPrice || parseFloat(soldPrice) <= 0}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Confirm Sale'}
                  </button>
                </div>
              </>
            )}

            {/* Donate modal */}
            {modalMode === 'donate' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900">Mark as Donated</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-1">{modalItem.name}</p>
                <p className="text-sm text-gray-700 mt-3 bg-gray-50 rounded-xl p-4">
                  This will mark the item as donated. This action cannot be undone.
                </p>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDonate}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors"
                  >
                    <Gift className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Confirm Donation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

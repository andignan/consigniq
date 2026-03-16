'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocation } from '@/contexts/LocationContext'

interface PayoutItem {
  id: string
  consignor_id: string
  name: string
  sold_price: number | null
  sold_date: string | null
  price: number | null
  paid_at: string | null
  payout_note: string | null
  category: string
}

interface PayoutConsignor {
  id: string
  name: string
  phone: string | null
  email: string | null
  split_store: number
  split_consignor: number
  status: string
}

interface PayoutEntry {
  consignor: PayoutConsignor
  items: PayoutItem[]
  summary: {
    total_items: number
    total_sold: number
    store_share: number
    consignor_share: number
    unpaid_items: number
    unpaid_total: number
    unpaid_consignor_share: number
  }
}

type FilterStatus = 'unpaid' | 'paid' | 'all'

export default function PayoutsPage() {
  const { activeLocationId } = useLocation()
  const [payouts, setPayouts] = useState<PayoutEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('unpaid')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [marking, setMarking] = useState(false)
  const [expandedConsignor, setExpandedConsignor] = useState<string | null>(null)
  const [payoutNote, setPayoutNote] = useState('')

  const fetchPayouts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeLocationId) params.set('location_id', activeLocationId)
    params.set('status', filter)

    const res = await fetch(`/api/payouts?${params}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setPayouts(data.payouts || [])
    }
    setLoading(false)
  }, [activeLocationId, filter])

  useEffect(() => {
    fetchPayouts()
  }, [fetchPayouts])

  function toggleItem(itemId: string) {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function selectAllUnpaid(consignorId: string) {
    const entry = payouts.find(p => p.consignor.id === consignorId)
    if (!entry) return
    const unpaidIds = entry.items.filter(i => !i.paid_at).map(i => i.id)
    setSelectedItems(prev => {
      const next = new Set(prev)
      const allSelected = unpaidIds.every(id => next.has(id))
      if (allSelected) {
        unpaidIds.forEach(id => next.delete(id))
      } else {
        unpaidIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  async function markAsPaid() {
    if (selectedItems.size === 0) return
    setMarking(true)
    const res = await fetch('/api/payouts', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_ids: Array.from(selectedItems),
        payout_note: payoutNote || undefined,
      }),
    })
    if (res.ok) {
      setSelectedItems(new Set())
      setPayoutNote('')
      await fetchPayouts()
    }
    setMarking(false)
  }

  function exportCsv() {
    const rows = [['Consignor', 'Item', 'Category', 'Sold Price', 'Sold Date', 'Split %', 'Consignor Share', 'Store Share', 'Paid At', 'Note']]
    for (const entry of payouts) {
      for (const item of entry.items) {
        const soldPrice = item.sold_price || 0
        const consignorShare = Math.round(soldPrice * (entry.consignor.split_consignor / 100) * 100) / 100
        const storeShare = Math.round(soldPrice * (entry.consignor.split_store / 100) * 100) / 100
        rows.push([
          entry.consignor.name,
          item.name,
          item.category,
          soldPrice.toFixed(2),
          item.sold_date || '',
          `${entry.consignor.split_consignor}/${entry.consignor.split_store}`,
          consignorShare.toFixed(2),
          storeShare.toFixed(2),
          item.paid_at || '',
          item.payout_note || '',
        ])
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalUnpaid = payouts.reduce((sum, p) => sum + p.summary.unpaid_consignor_share, 0)
  const totalPaidOut = payouts.reduce((sum, p) => sum + (p.summary.consignor_share - p.summary.unpaid_consignor_share), 0)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage consignor payouts</p>
        </div>
        <button
          onClick={exportCsv}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Owed (Unpaid)</p>
          <p className={`text-2xl font-bold ${totalUnpaid > 0 ? 'text-red-600' : 'text-gray-400'}`}>${totalUnpaid.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Paid Out</p>
          <p className={`text-2xl font-bold ${totalPaidOut > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>${totalPaidOut.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Consignors with Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {payouts.filter(p => p.summary.unpaid_items > 0).length}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['unpaid', 'paid', 'all'] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setSelectedItems(new Set()) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-brand-100 text-brand-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'unpaid' ? 'Unpaid' : s === 'paid' ? 'Paid' : 'All'}
          </button>
        ))}
      </div>

      {/* Mark as paid bar */}
      {selectedItems.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <span className="text-sm font-medium text-amber-800">
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </span>
          <input
            type="text"
            placeholder="Payout note (optional)"
            value={payoutNote}
            onChange={e => setPayoutNote(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-amber-300 rounded-lg text-sm"
          />
          <button
            onClick={markAsPaid}
            disabled={marking}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {marking ? 'Marking...' : 'Mark as Paid'}
          </button>
        </div>
      )}

      {/* Payout list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading payouts...</div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No payouts due yet.</p>
          <p className="text-xs text-gray-400 mt-1">Mark items as sold to track what you owe each consignor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map(entry => {
            const isExpanded = expandedConsignor === entry.consignor.id
            return (
              <div key={entry.consignor.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Consignor header */}
                <button
                  onClick={() => setExpandedConsignor(isExpanded ? null : entry.consignor.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{entry.consignor.name}</p>
                      <p className="text-xs text-gray-500">
                        {entry.summary.total_items} sold item{entry.summary.total_items !== 1 ? 's' : ''} &middot; {entry.consignor.split_consignor}/{entry.consignor.split_store} split
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {entry.summary.unpaid_items > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">
                          ${entry.summary.unpaid_consignor_share.toFixed(2)} owed
                        </p>
                        <p className="text-xs text-gray-500">{entry.summary.unpaid_items} unpaid</p>
                      </div>
                    )}
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                      <button
                        onClick={() => selectAllUnpaid(entry.consignor.id)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {entry.items.filter(i => !i.paid_at).every(i => selectedItems.has(i.id)) && entry.items.some(i => !i.paid_at)
                          ? 'Deselect all unpaid'
                          : 'Select all unpaid'}
                      </button>
                      <p className="text-xs text-gray-500">
                        Total: ${entry.summary.total_sold.toFixed(2)} &middot;
                        Store: ${entry.summary.store_share.toFixed(2)} &middot;
                        Consignor: ${entry.summary.consignor_share.toFixed(2)}
                      </p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {entry.items.map(item => (
                        <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
                          {!item.paid_at && (
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => toggleItem(item.id)}
                              className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                            />
                          )}
                          {item.paid_at && (
                            <span className="w-5 h-5 flex items-center justify-center">
                              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.category} &middot; Sold {item.sold_date || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">${(item.sold_price || 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">
                              Share: ${(Math.round((item.sold_price || 0) * (entry.consignor.split_consignor / 100) * 100) / 100).toFixed(2)}
                            </p>
                          </div>
                          {item.paid_at && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              Paid
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

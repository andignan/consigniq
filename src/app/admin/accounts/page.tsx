'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

interface AccountRow {
  id: string
  name: string
  tier: string
  status: string
  location_count: number
  user_count: number
  created_at: string
}

const TIER_BADGE: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600',
  standard: 'bg-brand-50 text-brand-600',
  pro: 'bg-amber-50 text-amber-700',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  suspended: 'bg-orange-50 text-orange-600',
  cancelled: 'bg-red-50 text-red-600',
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const params = new URLSearchParams()
      if (tierFilter) params.set('tier', tierFilter)
      if (statusFilter) params.set('status', statusFilter)
      try {
        const res = await fetch(`/api/admin/accounts?${params}`, { credentials: 'include' })
        if (res.ok) {
          const { accounts: data } = await res.json()
          setAccounts(data ?? [])
        }
      } catch {
        // handled
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tierFilter, statusFilter])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Accounts</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All Tiers</option>
          <option value="starter">Starter</option>
          <option value="standard">Standard</option>
          <option value="pro">Pro</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No accounts found.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Locations</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Users</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <Link
                    key={a.id}
                    href={`/admin/accounts/${a.id}`}
                    className="contents"
                  >
                    <tr className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_BADGE[a.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                          {a.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{a.location_count}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{a.user_count}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </td>
                    </tr>
                  </Link>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

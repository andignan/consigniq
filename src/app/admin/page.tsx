'use client'

import { useEffect, useState } from 'react'
import { Loader2, Building2, MapPin, Users, Package, UserCheck } from 'lucide-react'

interface Stats {
  accounts: { total: number; byTier: { starter: number; standard: number; pro: number }; byStatus: { active: number; suspended: number; cancelled: number } }
  locations: { total: number }
  users: { total: number }
  items: { total: number; byStatus: { pending: number; priced: number; sold: number; donated: number } }
  consignors: { total: number; byStatus: { active: number; expired: number; grace: number; closed: number } }
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/stats', { credentials: 'include' })
        if (res.ok) setStats(await res.json())
      } catch {
        // handled by null stats
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    )
  }

  if (!stats) {
    return <div className="p-6 text-sm text-red-600">Failed to load admin stats.</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Admin Overview</h1>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Building2} label="Accounts" value={stats.accounts.total} color="red" />
        <StatCard icon={MapPin} label="Locations" value={stats.locations.total} color="blue" />
        <StatCard icon={Users} label="Users" value={stats.users.total} color="indigo" />
        <StatCard icon={Package} label="Items" value={stats.items.total} color="emerald" />
        <StatCard icon={UserCheck} label="Consignors" value={stats.consignors.total} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Accounts by tier */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Accounts by Tier</h2>
          <div className="space-y-3">
            <TierRow label="Starter" count={stats.accounts.byTier.starter} total={stats.accounts.total} color="bg-gray-400" />
            <TierRow label="Standard" count={stats.accounts.byTier.standard} total={stats.accounts.total} color="bg-indigo-500" />
            <TierRow label="Pro" count={stats.accounts.byTier.pro} total={stats.accounts.total} color="bg-amber-500" />
          </div>
        </div>

        {/* Account status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Account Status</h2>
          <div className="space-y-3">
            <TierRow label="Active" count={stats.accounts.byStatus.active} total={stats.accounts.total} color="bg-emerald-500" />
            <TierRow label="Suspended" count={stats.accounts.byStatus.suspended} total={stats.accounts.total} color="bg-orange-500" />
            <TierRow label="Cancelled" count={stats.accounts.byStatus.cancelled} total={stats.accounts.total} color="bg-red-500" />
          </div>
        </div>

        {/* Items by status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Items by Status</h2>
          <div className="space-y-3">
            <TierRow label="Pending" count={stats.items.byStatus.pending} total={stats.items.total} color="bg-amber-400" />
            <TierRow label="Priced" count={stats.items.byStatus.priced} total={stats.items.total} color="bg-blue-500" />
            <TierRow label="Sold" count={stats.items.byStatus.sold} total={stats.items.total} color="bg-emerald-500" />
            <TierRow label="Donated" count={stats.items.byStatus.donated} total={stats.items.total} color="bg-gray-400" />
          </div>
        </div>

        {/* Consignors by status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Consignors by Status</h2>
          <div className="space-y-3">
            <TierRow label="Active" count={stats.consignors.byStatus.active} total={stats.consignors.total} color="bg-emerald-500" />
            <TierRow label="Expired" count={stats.consignors.byStatus.expired} total={stats.consignors.total} color="bg-red-500" />
            <TierRow label="Grace" count={stats.consignors.byStatus.grace} total={stats.consignors.total} color="bg-orange-500" />
            <TierRow label="Closed" count={stats.consignors.byStatus.closed} total={stats.consignors.total} color="bg-gray-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <Icon className={`w-5 h-5 text-${color}-500 mb-2`} />
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function TierRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">{count}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

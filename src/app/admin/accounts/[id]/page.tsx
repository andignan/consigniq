'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Save, MapPin, Users, Package } from 'lucide-react'

interface AccountDetail {
  id: string
  name: string
  tier: string
  status: string
  stripe_customer_id: string | null
  created_at: string
  account_type: string
  trial_ends_at: string | null
  is_complimentary: boolean
  complimentary_tier: string | null
  bonus_lookups: number
  bonus_lookups_used: number
}

interface LocationRow {
  id: string
  name: string
  city: string | null
  state: string | null
  created_at: string
}

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  location_id: string | null
  created_at: string
}

interface ItemCounts {
  total: number
  pending: number
  priced: number
  sold: number
  donated: number
}

const TIER_OPTIONS = ['solo', 'starter', 'standard', 'pro']
const STATUS_OPTIONS = ['active', 'suspended', 'cancelled', 'inactive']

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [items, setItems] = useState<ItemCounts | null>(null)
  const [loading, setLoading] = useState(true)

  const [editTier, setEditTier] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [actionSaving, setActionSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/accounts?id=${id}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setAccount(data.account)
          setLocations(data.locations ?? [])
          setUsers(data.users ?? [])
          setItems(data.items ?? null)
          setEditTier(data.account.tier)
          setEditStatus(data.account.status)
        }
      } catch {
        // handled
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function saveTier() {
    if (!account || editTier === account.tier) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, tier: editTier }),
      })
      if (res.ok) {
        const { account: updated } = await res.json()
        setAccount(updated)
        setSaveMsg('Tier updated')
      } else {
        setSaveMsg('Failed to update tier')
      }
    } catch {
      setSaveMsg('Failed to update tier')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function saveStatus() {
    if (!account || editStatus === account.status) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, status: editStatus }),
      })
      if (res.ok) {
        const { account: updated } = await res.json()
        setAccount(updated)
        setSaveMsg('Status updated')
      } else {
        setSaveMsg('Failed to update status')
      }
    } catch {
      setSaveMsg('Failed to update status')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function patchAccount(body: Record<string, unknown>) {
    setActionSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account?.id, ...body }),
      })
      if (res.ok) {
        const { account: updated } = await res.json()
        setAccount(updated)
        setEditTier(updated.tier)
        setEditStatus(updated.status)
        setSaveMsg('Updated successfully')
      } else {
        setSaveMsg('Update failed')
      }
    } catch {
      setSaveMsg('Update failed')
    } finally {
      setActionSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  function getTrialDaysRemaining(): number | null {
    if (!account?.trial_ends_at) return null
    return Math.ceil((new Date(account.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    )
  }

  if (!account) {
    return <div className="p-6 text-sm text-red-600">Account not found.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={() => router.push('/admin/accounts')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        All Accounts
      </button>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-lg font-bold text-gray-900">{account.name}</h1>
          {account.account_type === 'trial' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              Trial {(() => {
                const days = getTrialDaysRemaining()
                return days !== null ? (days > 0 ? `(${days}d remaining)` : '(Expired)') : ''
              })()}
            </span>
          )}
          {account.account_type === 'complimentary' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
              Complimentary{account.complimentary_tier ? ` (${account.complimentary_tier})` : ''}
            </span>
          )}
          {account.account_type === 'paid' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              Paid
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block text-xs mb-0.5">Created</span>
            <span className="text-gray-900">{new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs mb-0.5">Stripe ID</span>
            <span className="text-gray-900 font-mono text-xs">{account.stripe_customer_id ?? '—'}</span>
          </div>
          {account.trial_ends_at && (
            <div>
              <span className="text-gray-500 block text-xs mb-0.5">Trial Ends</span>
              <span className="text-gray-900">{new Date(account.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tier + Status controls */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-medium text-gray-500 mb-2">Tier</label>
          <div className="flex gap-2">
            <select
              value={editTier}
              onChange={e => setEditTier(e.target.value)}
              disabled={saving}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {TIER_OPTIONS.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={saveTier}
              disabled={saving || editTier === account.tier}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-medium text-gray-500 mb-2">Status</label>
          <div className="flex gap-2">
            <select
              value={editStatus}
              onChange={e => setEditStatus(e.target.value)}
              disabled={saving}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={saveStatus}
              disabled={saving || editStatus === account.status}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>

      {saveMsg && (
        <p className={`text-xs mb-4 ${saveMsg.includes('Failed') || saveMsg.includes('failed') ? 'text-red-600' : 'text-emerald-600'}`}>{saveMsg}</p>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-3">Actions</label>
        <div className="flex flex-wrap gap-2">
          {account.account_type === 'trial' && (
            <button
              onClick={() => patchAccount({ extend_trial: true })}
              disabled={actionSaving}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              Extend Trial (+30d)
            </button>
          )}
          {account.account_type !== 'complimentary' && (
            <button
              onClick={() => patchAccount({ account_type: 'complimentary', is_complimentary: true, complimentary_tier: account.tier })}
              disabled={actionSaving}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              Convert to Complimentary
            </button>
          )}
          {account.account_type !== 'paid' && (
            <button
              onClick={() => patchAccount({ account_type: 'paid' })}
              disabled={actionSaving}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              Convert to Paid
            </button>
          )}
          <button
            onClick={() => patchAccount({ status: account.status === 'active' ? 'inactive' : 'active' })}
            disabled={actionSaving}
            className={`px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${
              account.status === 'active'
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {account.status === 'active' ? 'Disable Account' : 'Enable Account'}
          </button>
        </div>
      </div>

      {/* Item counts */}
      {items && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Items ({items.total})</h2>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-amber-600">{items.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{items.priced}</p>
              <p className="text-xs text-gray-500">Priced</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{items.sold}</p>
              <p className="text-xs text-gray-500">Sold</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-500">{items.donated}</p>
              <p className="text-xs text-gray-500">Donated</p>
            </div>
          </div>
        </div>
      )}

      {/* Locations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Locations ({locations.length})</h2>
        </div>
        {locations.length === 0 ? (
          <p className="text-sm text-gray-400">No locations.</p>
        ) : (
          <div className="space-y-2">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{loc.name}</p>
                  {(loc.city || loc.state) && (
                    <p className="text-xs text-gray-500">{[loc.city, loc.state].filter(Boolean).join(', ')}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(loc.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Users ({users.length})</h2>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-gray-400">No users.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.full_name ?? u.email}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  u.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

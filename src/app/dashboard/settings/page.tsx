'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Loader2, Save, MapPin, Building2, Mail, Shield,
  ChevronDown, X, Plus, ExternalLink, AlertCircle,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'

// ─── Types ────────────────────────────────────────────────────
interface LocationSettings {
  id: string
  account_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  default_split_store: number
  default_split_consignor: number
  agreement_days: number
  grace_days: number
  markdown_enabled: boolean
}

interface AccountData {
  id: string
  name: string
  tier: string
  stripe_customer_id: string | null
  status: string
}

interface AccountUser {
  id: string
  full_name: string | null
  email: string
  role: string
  location_id: string | null
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  accepted_at: string | null
}

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600',
  standard: 'bg-indigo-50 text-indigo-600',
  pro: 'bg-amber-50 text-amber-600',
}

// ─── Main ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const user = useUser()
  const isOwner = user?.role === 'owner'

  // Tab state (owner only sees both tabs)
  const [activeTab, setActiveTab] = useState<'location' | 'account'>('location')

  // Location settings
  const [location, setLocation] = useState<LocationSettings | null>(null)
  const [locationDraft, setLocationDraft] = useState<LocationSettings | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [locationSaving, setLocationSaving] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationSuccess, setLocationSuccess] = useState('')

  // Account settings (owner only)
  const [account, setAccount] = useState<AccountData | null>(null)
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountNameDraft, setAccountNameDraft] = useState('')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [accountSuccess, setAccountSuccess] = useState('')

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'owner' | 'staff'>('staff')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Split validation
  const splitValid = useMemo(() => {
    if (!locationDraft) return true
    return locationDraft.default_split_store + locationDraft.default_split_consignor === 100
  }, [locationDraft])

  const locationDirty = useMemo(() => {
    if (!location || !locationDraft) return false
    return JSON.stringify(location) !== JSON.stringify(locationDraft)
  }, [location, locationDraft])

  // ─── Fetch location settings ──────────────────────────────
  useEffect(() => {
    if (!user?.location_id) {
      setLocationLoading(false)
      return
    }
    setLocationLoading(true)
    fetch(`/api/settings/location?location_id=${user.location_id}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(({ location: loc }) => {
        setLocation(loc)
        setLocationDraft({ ...loc })
      })
      .catch(() => setLocationError('Failed to load location settings'))
      .finally(() => setLocationLoading(false))
  }, [user?.location_id])

  // ─── Fetch account settings (owner only) ──────────────────
  useEffect(() => {
    if (!isOwner) return
    setAccountLoading(true)
    fetch('/api/settings/account', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(({ account: acc, users: u, invitations: inv }) => {
        setAccount(acc)
        setAccountNameDraft(acc.name)
        setAccountUsers(u)
        setInvitations(inv)
      })
      .catch(() => setAccountError('Failed to load account settings'))
      .finally(() => setAccountLoading(false))
  }, [isOwner])

  // ─── Save location settings ───────────────────────────────
  async function saveLocation() {
    if (!locationDraft || !splitValid) return
    setLocationSaving(true)
    setLocationError('')
    setLocationSuccess('')

    try {
      const res = await fetch('/api/settings/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(locationDraft),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Failed to save')
      }
      const { location: updated } = await res.json()
      setLocation(updated)
      setLocationDraft({ ...updated })
      setLocationSuccess('Settings saved')
      setTimeout(() => setLocationSuccess(''), 3000)
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLocationSaving(false)
    }
  }

  // ─── Save account name ────────────────────────────────────
  async function saveAccountName() {
    if (!account || accountNameDraft === account.name) return
    setAccountSaving(true)
    setAccountError('')
    setAccountSuccess('')

    try {
      const res = await fetch('/api/settings/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: accountNameDraft }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const { account: updated } = await res.json()
      setAccount(updated)
      setAccountSuccess('Account name saved')
      setTimeout(() => setAccountSuccess(''), 3000)
    } catch {
      setAccountError('Failed to save account name')
    } finally {
      setAccountSaving(false)
    }
  }

  // ─── Send invite ──────────────────────────────────────────
  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteError('')

    try {
      const res = await fetch('/api/settings/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')

      setInvitations(prev => [data.invitation, ...prev])
      setInviteEmail('')
      setInviteRole('staff')
      setInviteOpen(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviteSending(false)
    }
  }

  // ─── Helper: update location draft field ──────────────────
  function updateDraft<K extends keyof LocationSettings>(key: K, value: LocationSettings[K]) {
    setLocationDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  // ─── Render ───────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400">Manage your location and account settings</p>
      </div>

      {/* Tabs (owner sees both, staff sees only Location) */}
      <div className="flex gap-1.5 mb-6 border-b border-gray-200 pb-px">
        <button
          onClick={() => setActiveTab('location')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'location'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            Location Settings
          </span>
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'account'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              Account Settings
            </span>
          </button>
        )}
      </div>

      {/* ═══ Location Settings Tab ═══ */}
      {activeTab === 'location' && (
        locationLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : !locationDraft ? (
          <p className="text-sm text-gray-400">No location assigned to your account.</p>
        ) : (
          <div className="space-y-6">
            {/* Location Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Location Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={locationDraft.name}
                    onChange={e => updateDraft('name', e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={locationDraft.phone ?? ''}
                    onChange={e => updateDraft('phone', e.target.value || null)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                  <input
                    type="text"
                    value={locationDraft.address ?? ''}
                    onChange={e => updateDraft('address', e.target.value || null)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                  <input
                    type="text"
                    value={locationDraft.city ?? ''}
                    onChange={e => updateDraft('city', e.target.value || null)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                  <input
                    type="text"
                    value={locationDraft.state ?? ''}
                    onChange={e => updateDraft('state', e.target.value || null)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    maxLength={2}
                    placeholder="IL"
                  />
                </div>
              </div>
            </div>

            {/* Split & Agreement Settings */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Consignment Terms</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Default Store Split %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={locationDraft.default_split_store}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      updateDraft('default_split_store', val)
                      updateDraft('default_split_consignor', 100 - val)
                    }}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Default Consignor Split %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={locationDraft.default_split_consignor}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      updateDraft('default_split_consignor', val)
                      updateDraft('default_split_store', 100 - val)
                    }}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
              {/* Split validation */}
              <div className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${splitValid ? 'text-emerald-600' : 'text-red-500'}`}>
                {splitValid ? (
                  <>Store {locationDraft.default_split_store}% + Consignor {locationDraft.default_split_consignor}% = 100%</>
                ) : (
                  <><AlertCircle className="w-3.5 h-3.5" /> Splits must add to 100% (currently {locationDraft.default_split_store + locationDraft.default_split_consignor}%)</>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Agreement Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={locationDraft.agreement_days}
                    onChange={e => updateDraft('agreement_days', parseInt(e.target.value) || 60)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Number of days items stay on the floor before expiry</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Grace Period (days)</label>
                  <input
                    type="number"
                    min={0}
                    value={locationDraft.grace_days}
                    onChange={e => updateDraft('grace_days', parseInt(e.target.value) || 0)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Days after expiry before items are eligible for donation</p>
                </div>
              </div>
            </div>

            {/* Markdown Schedule */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Markdown Schedule</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">Automatic markdowns</p>
                  <p className="text-xs text-gray-400">Enable scheduled price reductions for aging inventory</p>
                </div>
                <button
                  onClick={() => isOwner && updateDraft('markdown_enabled', !locationDraft.markdown_enabled)}
                  disabled={!isOwner}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    locationDraft.markdown_enabled ? 'bg-indigo-500' : 'bg-gray-300'
                  } ${!isOwner ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    locationDraft.markdown_enabled ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              {locationDraft.markdown_enabled && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Schedule (hardcoded for now)</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Day 31</span>
                      <span className="font-medium text-amber-600">25% off</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Day 46</span>
                      <span className="font-medium text-red-500">50% off</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save button (owner only) */}
            {isOwner && (
              <div className="flex items-center gap-3">
                <button
                  onClick={saveLocation}
                  disabled={locationSaving || !locationDirty || !splitValid}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-40 transition-colors"
                >
                  {locationSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Location Settings
                </button>
                {locationSuccess && <span className="text-sm text-emerald-600">{locationSuccess}</span>}
                {locationError && <span className="text-sm text-red-500">{locationError}</span>}
              </div>
            )}

            {!isOwner && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Only account owners can edit location settings</span>
              </div>
            )}
          </div>
        )
      )}

      {/* ═══ Account Settings Tab (Owner only) ═══ */}
      {activeTab === 'account' && isOwner && (
        accountLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : !account ? (
          <p className="text-sm text-gray-400">Failed to load account settings.</p>
        ) : (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={accountNameDraft}
                    onChange={e => setAccountNameDraft(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                  <div className="flex items-center gap-2 h-[38px]">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TIER_COLORS[account.tier] ?? TIER_COLORS.starter}`}>
                      {account.tier}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={saveAccountName}
                  disabled={accountSaving || accountNameDraft === account.name}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-40 transition-colors"
                >
                  {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                {accountSuccess && <span className="text-sm text-emerald-600">{accountSuccess}</span>}
                {accountError && <span className="text-sm text-red-500">{accountError}</span>}
              </div>
            </div>

            {/* Billing */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Billing</h2>
              <p className="text-sm text-gray-500 mb-3">
                Manage your subscription, payment method, and billing history.
              </p>
              <a
                href="/api/billing/portal"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Manage Billing
              </a>
            </div>

            {/* Users */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Team Members</h2>
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Invite User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Email</th>
                      <th className="text-left px-4 py-2">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accountUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{u.full_name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{u.email}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${
                            u.role === 'owner' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pending invitations */}
              {invitations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-400 mb-2">Pending Invitations</p>
                  <div className="space-y-2">
                    {invitations.filter(i => !i.accepted_at).map(inv => (
                      <div key={inv.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{inv.email}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${
                            inv.role === 'owner' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {inv.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ═══ Invite Modal ═══ */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setInviteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Invite User</h3>
              <button onClick={() => setInviteOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as 'owner' | 'staff')}
                    className="w-full appearance-none px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="staff">Staff</option>
                    <option value="owner">Owner</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {inviteRole === 'owner' ? 'Full access to all locations and account settings' : 'Access to assigned location only'}
                </p>
              </div>

              {inviteError && (
                <div className="flex items-center gap-1.5 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {inviteError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setInviteOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvite}
                  disabled={inviteSending || !inviteEmail.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-40 transition-colors"
                >
                  {inviteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

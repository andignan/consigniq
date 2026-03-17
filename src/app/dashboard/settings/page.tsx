'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Loader2, Save, MapPin, Building2, Mail, Shield,
  ChevronDown, X, Plus, ExternalLink, AlertCircle, Pencil,
  Zap, Check,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useLocation } from '@/contexts/LocationContext'
import Tooltip from '@/components/Tooltip'
import UpgradePrompt from '@/components/UpgradePrompt'
import UpgradeCard from '@/components/UpgradeCard'
import { canUseFeature } from '@/lib/feature-gates'
import { type Tier } from '@/lib/tier-limits'
import { TIER_BADGE_CLASSES } from '@/lib/style-constants'
import Modal from '@/components/ui/Modal'

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

// ─── Main ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const user = useUser()
  const { activeLocationId, locations: allLocations, setActiveLocation } = useLocation()
  const isOwner = user?.role === 'owner'
  const accountTier = (user?.accounts?.tier ?? 'shop') as Tier
  const isSolo = accountTier === 'solo'

  // Tab state — solo sees billing+profile, owner sees location+locations+account, staff sees location
  const [activeTab, setActiveTab] = useState<'location' | 'account' | 'locations' | 'billing' | 'profile'>(isSolo ? 'billing' : 'location')

  // Location settings
  const [location, setLocation] = useState<LocationSettings | null>(null)
  const [locationDraft, setLocationDraft] = useState<LocationSettings | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [locationSaving, setLocationSaving] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationSuccess, setLocationSuccess] = useState('')

  // Billing state
  const [billingLoading, setBillingLoading] = useState(false)

  async function handleCheckout(tier: string) {
    setBillingLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const body = await res.json()
      if (body.url) {
        window.location.href = body.url
      } else {
        alert(body.error || 'Failed to create checkout session')
      }
    } catch {
      alert('Failed to connect to billing')
    } finally {
      setBillingLoading(false)
    }
  }

  async function handlePortal() {
    setBillingLoading(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'include',
      })
      const body = await res.json()
      if (body.url) {
        window.location.href = body.url
      } else {
        alert(body.error || 'Failed to open billing portal')
      }
    } catch {
      alert('Failed to connect to billing')
    } finally {
      setBillingLoading(false)
    }
  }

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
  const effectiveLocationId = activeLocationId ?? user?.location_id
  useEffect(() => {
    if (!effectiveLocationId) {
      setLocationLoading(false)
      return
    }
    setLocationLoading(true)
    setLocationError('')
    fetch(`/api/settings/location?location_id=${effectiveLocationId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(({ location: loc }) => {
        setLocation(loc)
        setLocationDraft({ ...loc })
      })
      .catch(() => setLocationError('Failed to load location settings'))
      .finally(() => setLocationLoading(false))
  }, [effectiveLocationId])

  // ─── Fetch account settings (owner only) ──────────────────
  function loadAccountSettings() {
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
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAccountSettings() }, [isOwner])

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
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="w-full lg:max-w-5xl lg:mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400">{isSolo ? 'Manage your account and billing' : 'Manage your location and account settings'}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 border-b border-gray-200 pb-px">
        {isSolo ? (
          <>
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'billing'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Billing
              </span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                Profile
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('location')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'location'
                  ? 'border-brand-500 text-brand-600'
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
                onClick={() => setActiveTab('locations')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'locations'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Locations
                </span>
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setActiveTab('account')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'account'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  Account Settings
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {/* ═══ Location Settings Tab ═══ */}
      {activeTab === 'location' && (
        locationLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={locationDraft.phone ?? ''}
                    onChange={e => updateDraft('phone', e.target.value || null)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                  <input
                    type="text"
                    value={locationDraft.state ?? ''}
                    onChange={e => updateDraft('state', e.target.value || null)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    Default Store Split %
                    <Tooltip content="The percentage of each sold item's price that the store keeps. The rest goes to the consignor." />
                  </label>
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    Default Consignor Split %
                    <Tooltip content="The percentage of each sold item's price paid to the consignor. Combined with store split, must total 100%." />
                  </label>
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    Agreement Duration (days)
                    <Tooltip content="How many days a consignor's items stay on the floor before the agreement expires. Default is 60 days." />
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={locationDraft.agreement_days}
                    onChange={e => updateDraft('agreement_days', parseInt(e.target.value) || 60)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Number of days items stay on the floor before expiry</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    Grace Period (days)
                    <Tooltip content="Extra days after the agreement expires for the consignor to pick up unsold items before they become donation-eligible." />
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={locationDraft.grace_days}
                    onChange={e => updateDraft('grace_days', parseInt(e.target.value) || 0)}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Days after expiry before items are eligible for donation</p>
                </div>
              </div>
            </div>

            {/* Markdown Schedule */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Markdown Schedule</h2>
              {!canUseFeature(accountTier, 'markdown_schedule') ? (
                <UpgradePrompt feature="markdown_schedule" description="Automatically reduce prices on aging inventory to move it faster." />
              ) : (
              <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-gray-700">Automatic markdowns</p>
                    <Tooltip content="When enabled, items automatically get price reductions: 25% off at day 31 and 50% off at day 46 to help move aging inventory." />
                  </div>
                  <p className="text-xs text-gray-400">Enable scheduled price reductions for aging inventory</p>
                </div>
                <button
                  onClick={() => isOwner && updateDraft('markdown_enabled', !locationDraft.markdown_enabled)}
                  disabled={!isOwner}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    locationDraft.markdown_enabled ? 'bg-brand-500' : 'bg-gray-300'
                  } ${!isOwner ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    locationDraft.markdown_enabled ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              {locationDraft.markdown_enabled && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Schedule</p>
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
              </>
              )}
            </div>

            {/* Save button (owner only) */}
            {isOwner && (
              <div className="flex items-center gap-3">
                <button
                  onClick={saveLocation}
                  disabled={locationSaving || !locationDirty || !splitValid}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-40 transition-colors"
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
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                  <div className="flex items-center gap-2 h-[38px]">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TIER_BADGE_CLASSES[account.tier] ?? TIER_BADGE_CLASSES.starter}`}>
                      {account.tier}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={saveAccountName}
                  disabled={accountSaving || accountNameDraft === account.name}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-40 transition-colors"
                >
                  {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                {accountSuccess && <span className="text-sm text-emerald-600">{accountSuccess}</span>}
                {accountError && <span className="text-sm text-red-500">{accountError}</span>}
              </div>
            </div>

            {/* Billing & Subscription */}
            <div id="billing" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Billing & Subscription</h2>

              {/* Usage info for non-solo tiers */}
              {['shop', 'enterprise'].includes(account.tier) && (
                <div className="mb-5 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">AI Pricing Lookups</span>
                    <span className="text-xs font-semibold text-emerald-600">Unlimited</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Your plan includes unlimited AI pricing lookups.</p>
                </div>
              )}

              {/* Pricing cards */}
              {account.tier === 'shop' && (
                <div className="mb-4">
                  <UpgradeCard targetTier="enterprise" context="settings" onUpgrade={() => handleCheckout('enterprise')} loading={billingLoading} />
                </div>
              )}

              {/* Manage Billing button */}
              <button
                onClick={handlePortal}
                disabled={billingLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage Subscription
              </button>
            </div>

            {/* Users */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Team Members</h2>
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
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
                      <th className="text-right px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accountUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{u.full_name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{u.email}</td>
                        <td className="px-4 py-2.5">
                          <select
                            value={u.role}
                            onChange={async (e) => {
                              const newRole = e.target.value
                              try {
                                const res = await fetch(`/api/settings/team/${u.id}`, {
                                  method: 'PATCH', credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ role: newRole }),
                                })
                                if (res.ok) { setAccountError('Role updated'); loadAccountSettings() }
                                else { const d = await res.json(); setAccountError(d.error || 'Failed') }
                              } catch { setAccountError('Failed to update role') }
                              setTimeout(() => setAccountError(''), 3000)
                            }}
                            className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="owner">Owner</option>
                            <option value="staff">Staff</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {u.id !== user?.id && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Remove ${u.full_name || u.email} from your team?`)) return
                                try {
                                  const res = await fetch(`/api/settings/team/${u.id}`, {
                                    method: 'DELETE', credentials: 'include',
                                  })
                                  if (res.ok) { setAccountError('Member removed'); loadAccountSettings() }
                                  else { const d = await res.json(); setAccountError(d.error || 'Failed') }
                                } catch { setAccountError('Failed to remove') }
                                setTimeout(() => setAccountError(''), 3000)
                              }}
                              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                            >
                              Remove
                            </button>
                          )}
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
                            inv.role === 'owner' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-600'
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

      {/* ═══ Solo Billing Tab ═══ */}
      {activeTab === 'billing' && isSolo && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Current Plan</h2>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Solo Pricer</span>
              <span className="text-sm text-gray-500">$9/month</span>
            </div>

            {/* Usage meter */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 font-medium">AI Pricing Lookups</span>
                <span className="text-xs text-gray-500">
                  {(user?.accounts?.ai_lookups_this_month ?? 0) + (user?.accounts?.bonus_lookups_used ?? 0)} of {200 + (user?.accounts?.bonus_lookups ?? 0)} used
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                {(() => {
                  const used = (user?.accounts?.ai_lookups_this_month ?? 0) + (user?.accounts?.bonus_lookups_used ?? 0)
                  const total = 200 + (user?.accounts?.bonus_lookups ?? 0)
                  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
                  return (
                    <div
                      className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-brand-500'}`}
                      style={{ width: `max(8px, ${pct}%)` }}
                    />
                  )
                })()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {200 + (user?.accounts?.bonus_lookups ?? 0) - (user?.accounts?.ai_lookups_this_month ?? 0) - (user?.accounts?.bonus_lookups_used ?? 0)} lookups remaining
                {user?.accounts?.ai_lookups_reset_at && (
                  <> &middot; Resets {new Date(new Date(user.accounts.ai_lookups_reset_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                )}
              </p>
            </div>

            {/* Buy more lookups */}
            <button
              onClick={async () => {
                setBillingLoading(true)
                try {
                  const res = await fetch('/api/billing/checkout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product: 'topup_50' }),
                  })
                  const body = await res.json()
                  if (body.url) window.location.href = body.url
                  else alert(body.error || 'Failed to create checkout session')
                } catch { alert('Failed to connect to billing') }
                finally { setBillingLoading(false) }
              }}
              disabled={billingLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 disabled:opacity-50 transition-colors mb-4"
            >
              Buy 50 more lookups — $5
            </button>

            {/* Manage Billing */}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handlePortal}
                disabled={billingLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage Billing
              </button>
            </div>
          </div>

          {/* Upgrade CTA — only Starter */}
          <UpgradeCard targetTier="shop" context="settings" onUpgrade={() => handleCheckout('shop')} loading={billingLoading} />
        </div>
      )}

      {/* ═══ Solo Profile Tab ═══ */}
      {activeTab === 'profile' && isSolo && (
        <ProfileTab user={user} />
      )}

      {/* ═══ Locations Tab (Owner only) ═══ */}
      {activeTab === 'locations' && isOwner && (
        <LocationsTab
          locations={allLocations}
          activeLocationId={activeLocationId ?? user?.location_id ?? null}
          onLocationSelect={(id) => {
            setActiveLocation(id)
            setActiveTab('location')
          }}
        />
      )}

      {/* ═══ Invite Modal ═══ */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite User">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <div className="relative">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'owner' | 'staff')}
                className="w-full appearance-none px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-40 transition-colors"
            >
              {inviteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Invite
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Locations Management Tab ─────────────────────────────
function LocationsTab({
  locations,
  activeLocationId,
  onLocationSelect,
}: {
  locations: { id: string; name: string; address?: string; phone?: string }[]
  activeLocationId: string | null
  onLocationSelect: (id: string) => void
}) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newState, setNewState] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newSplitStore, setNewSplitStore] = useState(60)
  const [newSplitConsignor, setNewSplitConsignor] = useState(40)
  const [newAgreementDays, setNewAgreementDays] = useState(60)
  const [newGraceDays, setNewGraceDays] = useState(3)
  const [newMarkdownEnabled, setNewMarkdownEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allLocations, setAllLocations] = useState<{ id: string; name: string; address?: string; phone?: string }[]>(locations)

  // Fetch full location details (address, phone)
  useEffect(() => {
    fetch('/api/locations', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { locations: [] })
      .then(d => {
        if (d.locations?.length) {
          setAllLocations(d.locations.map((l: { id: string; name: string; address?: string; phone?: string }) => ({
            id: l.id, name: l.name, address: l.address, phone: l.phone,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const newSplitValid = newSplitStore + newSplitConsignor === 100

  async function createLocation() {
    if (!newName.trim() || !newSplitValid) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          address: newAddress || null,
          city: newCity || null,
          state: newState || null,
          phone: newPhone || null,
          default_split_store: newSplitStore,
          default_split_consignor: newSplitConsignor,
          agreement_days: newAgreementDays,
          grace_days: newGraceDays,
          markdown_enabled: newMarkdownEnabled,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create')
      }
      const { location } = await res.json()
      setAllLocations(prev => [...prev, { id: location.id, name: location.name }])
      setShowNewForm(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setNewName('')
    setNewAddress('')
    setNewCity('')
    setNewState('')
    setNewPhone('')
    setNewSplitStore(60)
    setNewSplitConsignor(40)
    setNewAgreementDays(60)
    setNewGraceDays(3)
    setNewMarkdownEnabled(false)
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* Locations list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">All Locations</h2>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Location
          </button>
        </div>

        <div className="space-y-2">
          {allLocations.map(loc => (
            <div
              key={loc.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                loc.id === activeLocationId
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin className={`w-4 h-4 ${loc.id === activeLocationId ? 'text-brand-500' : 'text-gray-400'}`} />
                <div>
                  <span className="text-sm font-medium text-gray-900">{loc.name}</span>
                  {loc.id === activeLocationId && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-600 ml-2">Active</span>
                  )}
                  {(loc.address || loc.phone) && (
                    <p className="text-xs text-gray-400">{[loc.address, loc.phone].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onLocationSelect(loc.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* New Location Form */}
      {showNewForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">New Location</h2>
            <button onClick={() => { setShowNewForm(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location Name *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Downtown Store"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input
                type="text"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
              <input
                type="text"
                value={newCity}
                onChange={e => setNewCity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
              <input
                type="text"
                value={newState}
                onChange={e => setNewState(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                maxLength={2}
                placeholder="IL"
              />
            </div>
          </div>

          {/* Consignment Terms */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Consignment Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Store Split %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newSplitStore}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0
                    setNewSplitStore(val)
                    setNewSplitConsignor(100 - val)
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Consignor Split %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newSplitConsignor}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0
                    setNewSplitConsignor(val)
                    setNewSplitStore(100 - val)
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className={`mt-2 text-xs font-medium ${newSplitValid ? 'text-emerald-600' : 'text-red-500'}`}>
              {newSplitValid
                ? `Store ${newSplitStore}% + Consignor ${newSplitConsignor}% = 100%`
                : `Splits must add to 100% (currently ${newSplitStore + newSplitConsignor}%)`}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Agreement Days</label>
                <input
                  type="number"
                  min={1}
                  value={newAgreementDays}
                  onChange={e => setNewAgreementDays(parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Grace Days</label>
                <input
                  type="number"
                  min={0}
                  value={newGraceDays}
                  onChange={e => setNewGraceDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm text-gray-700">Automatic Markdowns</p>
                <p className="text-xs text-gray-400">Enable scheduled price reductions</p>
              </div>
              <button
                onClick={() => setNewMarkdownEnabled(!newMarkdownEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  newMarkdownEnabled ? 'bg-brand-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  newMarkdownEnabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 mt-4 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => { setShowNewForm(false); resetForm() }}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createLocation}
              disabled={saving || !newName.trim() || !newSplitValid}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create Location'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Profile Tab (Solo) ──────────────────────────────────
function ProfileTab({ user }: { user: ReturnType<typeof useUser> }) {
  const [editName, setEditName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)

  async function handleSaveName() {
    if (!editName.trim() || saving) return
    setSaving(true)
    setProfileMsg(null)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: editName.trim() }),
      })
      if (res.ok) {
        setProfileMsg('Profile updated')
        setTimeout(() => setProfileMsg(null), 3000)
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordMsg(null)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      })
      setPasswordMsg(`Password reset link sent to ${user?.email}`)
      setTimeout(() => setPasswordMsg(null), 5000)
    } catch {
      setPasswordMsg('Failed to send reset link')
      setTimeout(() => setPasswordMsg(null), 5000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Your Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <p className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
              {user?.email || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSaveName}
            disabled={saving || editName.trim() === (user?.full_name || '')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          {profileMsg && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
              <Check className="w-4 h-4" />
              {profileMsg}
            </span>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleChangePassword}
            className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Change Password
          </button>
          {passwordMsg ? (
            <p className="text-xs text-emerald-600 mt-1">{passwordMsg}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">We&apos;ll send a password reset link to your email.</p>
          )}
        </div>
      </div>
    </div>
  )
}

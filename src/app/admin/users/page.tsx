'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Search, X, Users } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  account_id: string
  is_superadmin: boolean
  created_at: string
  accounts: {
    id: string
    name: string
    tier: string
    status: string
    account_type: string | null
    trial_ends_at: string | null
    is_complimentary: boolean | null
    complimentary_tier: string | null
  } | null
}

const TIER_BADGE: Record<string, string> = {
  solo: 'bg-slate-100 text-slate-600',
  starter: 'bg-gray-100 text-gray-600',
  standard: 'bg-indigo-50 text-indigo-600',
  pro: 'bg-amber-50 text-amber-700',
}

function AccountTypeBadge({ user }: { user: UserRow }) {
  const account = user.accounts
  if (!account) return <span className="text-xs text-gray-400">--</span>

  const type = account.account_type || 'paid'

  if (type === 'trial') {
    const daysRemaining = account.trial_ends_at
      ? Math.ceil((new Date(account.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
        Trial {daysRemaining > 0 ? `(${daysRemaining}d)` : '(Expired)'}
      </span>
    )
  }

  if (type === 'complimentary') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
        Complimentary{account.complimentary_tier ? ` (${account.complimentary_tier})` : ''}
      </span>
    )
  }

  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
      Paid
    </span>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formAccountName, setFormAccountName] = useState('')
  const [formTier, setFormTier] = useState('starter')
  const [formAccountType, setFormAccountType] = useState('paid')
  const [formComplimentaryTier, setFormComplimentaryTier] = useState('starter')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  async function loadUsers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (accountTypeFilter) params.set('account_type', accountTypeFilter)
    if (tierFilter) params.set('tier', tierFilter)
    try {
      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' })
      if (res.ok) {
        const { users: data } = await res.json()
        setUsers(data ?? [])
      }
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountTypeFilter, tierFilter])

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      loadUsers()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail,
          full_name: formName,
          account_name: formAccountName,
          tier: formTier,
          account_type: formAccountType,
          complimentary_tier: formAccountType === 'complimentary' ? formComplimentaryTier : undefined,
        }),
      })

      if (res.ok) {
        setFormSuccess('User created successfully')
        setFormEmail('')
        setFormName('')
        setFormAccountName('')
        setFormTier('starter')
        setFormAccountType('paid')
        setFormComplimentaryTier('starter')
        loadUsers()
        setTimeout(() => {
          setShowModal(false)
          setFormSuccess('')
        }, 1500)
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to create user')
      }
    } catch {
      setFormError('Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormEmail('')
    setFormName('')
    setFormAccountName('')
    setFormTier('starter')
    setFormAccountType('paid')
    setFormComplimentaryTier('starter')
    setFormError('')
    setFormSuccess('')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search email or name..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={accountTypeFilter}
          onChange={e => setAccountTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All Types</option>
          <option value="paid">Paid</option>
          <option value="trial">Trial</option>
          <option value="complimentary">Complimentary</option>
        </select>
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All Tiers</option>
          <option value="solo">Solo</option>
          <option value="starter">Starter</option>
          <option value="standard">Standard</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Users className="w-8 h-8 mb-2" />
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Full Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Account</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900">{u.email}</td>
                    <td className="px-4 py-3 text-gray-700">{u.full_name || '--'}</td>
                    <td className="px-4 py-3 text-gray-700">{u.accounts?.name || '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_BADGE[u.accounts?.tier ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.accounts?.tier ?? '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AccountTypeBadge user={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add User</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={formAccountName}
                  onChange={e => setFormAccountName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Treasure Trove Consignment"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tier</label>
                  <select
                    value={formTier}
                    onChange={e => setFormTier(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="solo">Solo</option>
                    <option value="starter">Starter</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Account Type</label>
                  <select
                    value={formAccountType}
                    onChange={e => setFormAccountType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="trial">Trial</option>
                    <option value="complimentary">Complimentary</option>
                  </select>
                </div>
              </div>

              {formAccountType === 'complimentary' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Complimentary Tier</label>
                  <select
                    value={formComplimentaryTier}
                    onChange={e => setFormComplimentaryTier(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="solo">Solo</option>
                    <option value="starter">Starter</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              )}

              {formError && <p className="text-xs text-red-600">{formError}</p>}
              {formSuccess && <p className="text-xs text-emerald-600">{formSuccess}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

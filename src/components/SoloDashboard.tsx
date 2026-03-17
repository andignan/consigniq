'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import { TIER_CONFIGS } from '@/lib/tier-limits'
import UpgradeCard from '@/components/UpgradeCard'

export default function SoloDashboard() {
  const user = useUser()
  const account = user?.accounts
  const [itemCount, setItemCount] = useState(0)

  const usedThisMonth = account?.ai_lookups_this_month ?? 0
  const bonusLookups = account?.bonus_lookups ?? 0
  const bonusUsed = account?.bonus_lookups_used ?? 0
  const monthlyLimit = TIER_CONFIGS.solo.aiPricingLimit ?? 200
  const totalAvailable = monthlyLimit + bonusLookups
  const totalUsed = usedThisMonth + bonusUsed
  const remaining = Math.max(0, totalAvailable - totalUsed)
  const pct = totalAvailable > 0 ? Math.min(100, (totalUsed / totalAvailable) * 100) : 0

  const resetDate = account?.ai_lookups_reset_at
    ? new Date(new Date(account.ai_lookups_reset_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-emerald-500'

  useEffect(() => {
    if (!user?.account_id) return
    fetch('/api/items?status=priced&solo=true', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setItemCount(d.items?.length ?? 0))
      .catch(() => {})
  }, [user?.account_id])

  async function handleBuyLookups() {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'topup_50' }),
      })
      const body = await res.json()
      if (body.url) window.location.href = body.url
      else alert(body.error || 'Billing setup in progress')
    } catch {
      alert('Billing setup in progress')
    }
  }

  return (
    <div className="w-full lg:max-w-5xl lg:mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Usage Meter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">AI Lookups</h2>
          <span className="text-xs text-gray-500">
            {totalUsed} of {totalAvailable} used
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `max(8px, ${pct}%)` }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {remaining} lookup{remaining !== 1 ? 's' : ''} remaining
            {resetDate && (
              <> &middot; Resets {resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
            )}
          </p>
          {remaining <= 20 && (
            <button
              onClick={handleBuyLookups}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Buy 50 more — $5
            </button>
          )}
        </div>
      </div>

      {/* At limit message */}
      {remaining === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-orange-800 font-medium">
            You&apos;ve used all {totalAvailable} lookups this month.
          </p>
          <p className="text-xs text-orange-600 mt-1">
            Buy 50 more for $5 or your lookups reset
            {resetDate && <> on {resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link
          href="/dashboard/pricing"
          className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl p-4 text-center transition-colors shadow-sm"
        >
          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-sm font-semibold">Price an Item</span>
        </Link>
        <Link
          href="/dashboard/inventory"
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-4 text-center transition-colors shadow-sm"
        >
          <svg className="w-6 h-6 mx-auto mb-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-sm font-semibold">My Items ({itemCount})</span>
        </Link>
      </div>

      {/* Upgrade CTA */}
      <UpgradeCard targetTier="shop" context="dashboard" />
    </div>
  )
}

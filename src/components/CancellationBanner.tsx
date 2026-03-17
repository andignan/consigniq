'use client'

import { useUser } from '@/contexts/UserContext'
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

export default function CancellationBanner() {
  const user = useUser()
  const account = user?.accounts
  if (!account) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acc = account as any
  const accountType = acc.account_type
  const isOwner = user?.role === 'owner'

  if (accountType === 'cancelled_grace') {
    const periodEnd = acc.subscription_period_end
    const endDate = periodEnd
      ? new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'soon'
    const cancelledTier = (acc.cancelled_tier || acc.tier || 'shop') as Tier
    const tierLabel = TIER_CONFIGS[cancelledTier]?.label || 'your plan'

    return (
      <div className="border-b px-4 py-2 text-sm font-medium flex items-center justify-between bg-amber-50 border-amber-200 text-amber-800">
        <span>
          {isOwner
            ? `Your ${tierLabel} subscription has been cancelled. You have access until ${endDate}.`
            : 'Your account subscription has been cancelled. Contact your account owner.'}
        </span>
        {isOwner && (
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/billing/checkout', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tier: cancelledTier }),
                })
                const data = await res.json()
                if (data.url) window.location.href = data.url
              } catch {
                // Fall back to settings
                window.location.href = '/dashboard/settings?tab=billing'
              }
            }}
            className="text-xs font-semibold bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition-colors shrink-0 ml-3"
          >
            Resubscribe
          </button>
        )}
      </div>
    )
  }

  if (accountType === 'cancelled_limited') {
    const cancelledTier = (acc.cancelled_tier || 'shop') as Tier
    const tierLabel = TIER_CONFIGS[cancelledTier]?.label || 'your plan'
    const endDate = acc.subscription_period_end
      ? new Date(acc.subscription_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      : ''

    return (
      <div className="border-b px-4 py-2 text-sm font-medium flex items-center justify-between bg-orange-50 border-orange-200 text-orange-800">
        <span>
          {isOwner
            ? `Your ${tierLabel} subscription ended${endDate ? ` on ${endDate}` : ''}. Your data is safe — resubscribe to restore full access.`
            : "Your account's subscription has ended. Contact your account owner."}
        </span>
        {isOwner && (
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/billing/checkout', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tier: cancelledTier }),
                })
                const data = await res.json()
                if (data.url) window.location.href = data.url
              } catch {
                window.location.href = '/dashboard/settings?tab=billing'
              }
            }}
            className="text-xs font-semibold bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors shrink-0 ml-3"
          >
            Resubscribe
          </button>
        )}
      </div>
    )
  }

  return null
}

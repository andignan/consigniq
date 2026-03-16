'use client'

import { Zap, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { TIER_CONFIGS } from '@/lib/tier-limits'

export const UPGRADE_CARD_CONFIG = {
  starter: {
    headline: 'Upgrade to Starter',
    dashboardHeadline: 'Running a consignment shop?',
    description: 'Everything you need for consignment management.',
    features: [
      'Unlimited AI pricing lookups',
      'Consignor management & lifecycle',
      'Payouts, agreements, reports',
      'Staff management',
    ],
  },
  standard: {
    headline: 'Upgrade to Standard',
    dashboardHeadline: 'Ready for more locations?',
    description: 'Multi-location support and advanced features.',
    features: [
      'Everything in Starter',
      'Multi-location support',
      'Email notifications for expiring agreements',
      'Repeat item pricing history',
    ],
  },
  pro: {
    headline: 'Upgrade to Pro',
    dashboardHeadline: 'Unlock the full platform',
    description: 'Cross-network intelligence and full platform access.',
    features: [
      'Everything in Standard',
      'Cross-customer pricing intel',
      'Community pricing feed',
      'All Locations dashboard',
      'API access',
    ],
  },
} as const

export type UpgradeTargetTier = keyof typeof UPGRADE_CARD_CONFIG

interface UpgradeCardProps {
  targetTier: UpgradeTargetTier
  context?: 'dashboard' | 'settings' | 'inline'
  onUpgrade?: () => void
  loading?: boolean
}

export default function UpgradeCard({ targetTier, context = 'inline', onUpgrade, loading }: UpgradeCardProps) {
  const config = UPGRADE_CARD_CONFIG[targetTier]
  const tierConfig = TIER_CONFIGS[targetTier]
  const headline = context === 'dashboard' ? config.dashboardHeadline : config.headline

  const buttonContent = loading
    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
    : `Upgrade to ${tierConfig.label} — $${tierConfig.price}/mo`

  const buttonClass = 'w-full inline-flex items-center justify-center gap-1.5 border-2 border-brand-600 text-brand-600 hover:bg-brand-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-bold text-gray-900">{headline}</h3>
      </div>
      {context === 'dashboard' && (
        <p className="text-xs text-gray-600 mb-3">{config.description}</p>
      )}
      <p className="text-2xl font-bold text-gray-900 mb-2">
        ${tierConfig.price}<span className="text-sm font-normal text-gray-500">/mo</span>
      </p>
      <ul className="text-xs text-gray-600 space-y-1 mb-3">
        {config.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {onUpgrade ? (
        <button onClick={onUpgrade} disabled={loading} className={buttonClass}>
          {buttonContent}
        </button>
      ) : (
        <Link href="/dashboard/settings?tab=account" className={buttonClass}>
          {buttonContent}
        </Link>
      )}
    </div>
  )
}

'use client'

import { Lock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { type Feature, FEATURE_LABELS, FEATURE_REQUIRED_TIER, TIER_CONFIGS } from '@/lib/tier-limits'

interface UpgradePromptProps {
  feature: Feature
  description?: string
}

export default function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  const requiredTier = FEATURE_REQUIRED_TIER[feature]
  const tierConfig = TIER_CONFIGS[requiredTier]
  const featureLabel = FEATURE_LABELS[feature]

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
      <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{featureLabel}</h3>
      <p className="text-xs text-gray-500 mb-3">
        {description || `This feature requires the ${tierConfig.label} plan.`}
      </p>
      <Link
        href="/dashboard/settings?tab=account#billing"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
        Upgrade to {tierConfig.label} — ${tierConfig.price}/mo
      </Link>
    </div>
  )
}

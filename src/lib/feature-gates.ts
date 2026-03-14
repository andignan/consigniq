import { type Tier, type Feature, TIER_CONFIGS, FEATURE_REQUIRED_TIER, FEATURE_LABELS } from './tier-limits'

const TIER_ORDER: Record<Tier, number> = { starter: 0, standard: 1, pro: 2 }

export function canUseFeature(tier: Tier, feature: Feature): boolean {
  const requiredTier = FEATURE_REQUIRED_TIER[feature]
  return TIER_ORDER[tier] >= TIER_ORDER[requiredTier]
}

export function getUpgradeMessage(feature: Feature): string {
  const requiredTier = FEATURE_REQUIRED_TIER[feature]
  const label = FEATURE_LABELS[feature]
  const tierConfig = TIER_CONFIGS[requiredTier]
  return `${label} requires the ${tierConfig.label} plan ($${tierConfig.price}/mo). Upgrade to unlock this feature.`
}

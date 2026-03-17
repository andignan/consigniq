import { type Tier, type Feature, type AccountType, TIER_CONFIGS, FEATURE_REQUIRED_TIER, FEATURE_LABELS } from './tier-limits'

const TIER_ORDER: Record<Tier, number> = { solo: 0, shop: 1, enterprise: 2 }

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

export interface AccountInfo {
  tier: Tier
  account_type: AccountType
  trial_ends_at?: string | null
  is_complimentary?: boolean
  complimentary_tier?: Tier | null
  cancelled_tier?: string | null
  status?: string
}

/**
 * Returns true if the account is active (can access the app).
 * Paid and complimentary accounts are always active (unless suspended).
 * Trial accounts are active only before trial_ends_at.
 */
export function isAccountActive(account: AccountInfo): boolean {
  if (account.status === 'suspended' || account.status === 'cancelled' || account.status === 'deleted') return false

  if (account.account_type === 'paid' || account.account_type === 'complimentary') {
    return true
  }

  if (account.account_type === 'trial') {
    if (!account.trial_ends_at) return false
    return new Date(account.trial_ends_at) > new Date()
  }

  // cancelled_grace: active with full tier access until period_end
  if (account.account_type === 'cancelled_grace') return true

  // cancelled_limited: active but with solo-only access
  if (account.account_type === 'cancelled_limited') return true

  return false
}

/**
 * Gets the effective tier for an account, considering complimentary overrides.
 */
export function getEffectiveTier(account: AccountInfo): Tier {
  if (account.account_type === 'complimentary' && account.complimentary_tier) {
    return account.complimentary_tier
  }
  // cancelled_grace: full access at previous tier
  if (account.account_type === 'cancelled_grace' && account.cancelled_tier) {
    return account.cancelled_tier as Tier
  }
  // cancelled_limited: solo-only access
  if (account.account_type === 'cancelled_limited') {
    return 'solo'
  }
  return account.tier
}

/**
 * Checks if an account can use a feature, considering account type.
 * Complimentary accounts use their complimentary_tier for access checks.
 * Trial accounts get full access to their tier until expiry.
 */
export function canAccountUseFeature(account: AccountInfo, feature: Feature): boolean {
  if (!isAccountActive(account)) return false
  const effectiveTier = getEffectiveTier(account)
  return canUseFeature(effectiveTier, feature)
}

/**
 * Calculates total available AI lookups including bonus.
 */
export function getTotalAvailableLookups(
  tier: Tier,
  bonusLookups: number = 0,
): number | null {
  const config = TIER_CONFIGS[tier]
  if (config.aiPricingLimit === null) return null // unlimited
  return config.aiPricingLimit + bonusLookups
}

/**
 * Checks if AI lookup limit has been reached.
 */
export function isLookupLimitReached(
  tier: Tier,
  usedThisMonth: number,
  bonusLookups: number = 0,
  bonusLookupUsed: number = 0,
): boolean {
  const config = TIER_CONFIGS[tier]
  if (config.aiPricingLimit === null) return false // unlimited
  const totalAvailable = config.aiPricingLimit + bonusLookups
  const totalUsed = usedThisMonth + bonusLookupUsed
  return totalUsed >= totalAvailable
}

/**
 * Tests for feature gating logic and tier limits
 * Covers: canUseFeature(), getUpgradeMessage(), tier configs, account type helpers
 */

import { canUseFeature, getUpgradeMessage, isAccountActive, getEffectiveTier, canAccountUseFeature, isLookupLimitReached } from '@/lib/feature-gates'
import { TIER_CONFIGS, FEATURE_REQUIRED_TIER } from '@/lib/tier-limits'

describe('canUseFeature', () => {
  it('solo can use ai_pricing', () => {
    expect(canUseFeature('solo', 'ai_pricing')).toBe(true)
  })

  it('solo can use price_lookup', () => {
    expect(canUseFeature('solo', 'price_lookup')).toBe(true)
  })

  it('solo can use csv_export', () => {
    expect(canUseFeature('solo', 'csv_export')).toBe(true)
  })

  it('solo cannot use consignor_mgmt', () => {
    expect(canUseFeature('solo', 'consignor_mgmt')).toBe(false)
  })

  it('solo cannot use payouts', () => {
    expect(canUseFeature('solo', 'payouts')).toBe(false)
  })

  it('solo cannot use reports', () => {
    expect(canUseFeature('solo', 'reports')).toBe(false)
  })

  it('solo cannot use agreements', () => {
    expect(canUseFeature('solo', 'agreements')).toBe(false)
  })

  it('solo cannot use lifecycle', () => {
    expect(canUseFeature('solo', 'lifecycle')).toBe(false)
  })

  it('shop can use ai_pricing', () => {
    expect(canUseFeature('shop', 'ai_pricing')).toBe(true)
  })

  it('shop can use consignor_mgmt', () => {
    expect(canUseFeature('shop', 'consignor_mgmt')).toBe(true)
  })

  it('shop can use repeat_item_history', () => {
    expect(canUseFeature('shop', 'repeat_item_history')).toBe(true)
  })

  it('shop can use markdown_schedule', () => {
    expect(canUseFeature('shop', 'markdown_schedule')).toBe(true)
  })

  it('shop cannot use cross_customer_pricing', () => {
    expect(canUseFeature('shop', 'cross_customer_pricing')).toBe(false)
  })

  it('enterprise can use all features', () => {
    expect(canUseFeature('enterprise', 'ai_pricing')).toBe(true)
    expect(canUseFeature('enterprise', 'repeat_item_history')).toBe(true)
    expect(canUseFeature('enterprise', 'cross_customer_pricing')).toBe(true)
    expect(canUseFeature('enterprise', 'community_pricing_feed')).toBe(true)
    expect(canUseFeature('enterprise', 'multi_location_all')).toBe(true)
    expect(canUseFeature('enterprise', 'api_access')).toBe(true)
  })
})

describe('getUpgradeMessage', () => {
  it('returns message with correct tier for repeat_item_history', () => {
    const msg = getUpgradeMessage('repeat_item_history')
    expect(msg).toContain('Shop')
    expect(msg).toContain('$79')
  })

  it('returns message with correct tier for cross_customer_pricing', () => {
    const msg = getUpgradeMessage('cross_customer_pricing')
    expect(msg).toContain('Enterprise')
    expect(msg).toContain('$129')
  })

  it('returns message with correct tier for consignor_mgmt', () => {
    const msg = getUpgradeMessage('consignor_mgmt')
    expect(msg).toContain('Shop')
    expect(msg).toContain('$79')
  })
})

describe('TIER_CONFIGS', () => {
  it('solo has 200 AI pricing limit', () => {
    expect(TIER_CONFIGS.solo.aiPricingLimit).toBe(200)
  })

  it('solo costs $9/mo', () => {
    expect(TIER_CONFIGS.solo.price).toBe(9)
  })

  it('shop has unlimited AI pricing', () => {
    expect(TIER_CONFIGS.shop.aiPricingLimit).toBeNull()
  })

  it('shop costs $79/mo', () => {
    expect(TIER_CONFIGS.shop.price).toBe(79)
  })

  it('enterprise has unlimited AI pricing', () => {
    expect(TIER_CONFIGS.enterprise.aiPricingLimit).toBeNull()
  })
})

describe('FEATURE_REQUIRED_TIER', () => {
  it('maps features to correct minimum tier', () => {
    expect(FEATURE_REQUIRED_TIER.ai_pricing).toBe('solo')
    expect(FEATURE_REQUIRED_TIER.price_lookup).toBe('solo')
    expect(FEATURE_REQUIRED_TIER.csv_export).toBe('solo')
    expect(FEATURE_REQUIRED_TIER.consignor_mgmt).toBe('shop')
    expect(FEATURE_REQUIRED_TIER.lifecycle).toBe('shop')
    expect(FEATURE_REQUIRED_TIER.payouts).toBe('shop')
    expect(FEATURE_REQUIRED_TIER.repeat_item_history).toBe('shop')
    expect(FEATURE_REQUIRED_TIER.markdown_schedule).toBe('shop')
    expect(FEATURE_REQUIRED_TIER.email_notifications).toBe('shop')
    expect(FEATURE_REQUIRED_TIER.cross_customer_pricing).toBe('enterprise')
    expect(FEATURE_REQUIRED_TIER.community_pricing_feed).toBe('enterprise')
    expect(FEATURE_REQUIRED_TIER.multi_location_all).toBe('enterprise')
    expect(FEATURE_REQUIRED_TIER.api_access).toBe('enterprise')
  })
})

describe('isAccountActive', () => {
  it('returns true for paid accounts', () => {
    expect(isAccountActive({ tier: 'shop', account_type: 'paid' })).toBe(true)
  })

  it('returns true for complimentary accounts', () => {
    expect(isAccountActive({ tier: 'solo', account_type: 'complimentary', is_complimentary: true })).toBe(true)
  })

  it('returns true for trial accounts before expiry', () => {
    const future = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    expect(isAccountActive({ tier: 'shop', account_type: 'trial', trial_ends_at: future })).toBe(true)
  })

  it('returns false for trial accounts after expiry', () => {
    const past = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    expect(isAccountActive({ tier: 'shop', account_type: 'trial', trial_ends_at: past })).toBe(false)
  })

  it('returns false for trial accounts with no trial_ends_at', () => {
    expect(isAccountActive({ tier: 'shop', account_type: 'trial', trial_ends_at: null })).toBe(false)
  })

  it('returns false for suspended accounts', () => {
    expect(isAccountActive({ tier: 'enterprise', account_type: 'paid', status: 'suspended' })).toBe(false)
  })

  it('returns false for cancelled accounts', () => {
    expect(isAccountActive({ tier: 'enterprise', account_type: 'paid', status: 'cancelled' })).toBe(false)
  })
})

describe('getEffectiveTier', () => {
  it('returns account tier for paid accounts', () => {
    expect(getEffectiveTier({ tier: 'shop', account_type: 'paid' })).toBe('shop')
  })

  it('returns complimentary_tier for complimentary accounts', () => {
    expect(getEffectiveTier({
      tier: 'solo',
      account_type: 'complimentary',
      is_complimentary: true,
      complimentary_tier: 'enterprise',
    })).toBe('enterprise')
  })

  it('returns account tier for complimentary without complimentary_tier', () => {
    expect(getEffectiveTier({
      tier: 'shop',
      account_type: 'complimentary',
      is_complimentary: true,
      complimentary_tier: null,
    })).toBe('shop')
  })
})

describe('canAccountUseFeature', () => {
  it('complimentary with pro tier can use all features', () => {
    const account = {
      tier: 'solo' as const,
      account_type: 'complimentary' as const,
      is_complimentary: true,
      complimentary_tier: 'enterprise' as const,
    }
    expect(canAccountUseFeature(account, 'cross_customer_pricing')).toBe(true)
    expect(canAccountUseFeature(account, 'consignor_mgmt')).toBe(true)
  })

  it('expired trial cannot use any features', () => {
    const account = {
      tier: 'shop' as const,
      account_type: 'trial' as const,
      trial_ends_at: new Date(Date.now() - 86400000).toISOString(),
    }
    expect(canAccountUseFeature(account, 'ai_pricing')).toBe(false)
  })
})

describe('isLookupLimitReached', () => {
  it('returns false when monthly lookups not exhausted', () => {
    expect(isLookupLimitReached('solo', 100, 0, 0)).toBe(false)
  })

  it('returns true when all lookups exhausted (monthly + bonus)', () => {
    expect(isLookupLimitReached('solo', 200, 50, 50)).toBe(true)
  })

  it('returns false when monthly exhausted but bonus available', () => {
    expect(isLookupLimitReached('solo', 200, 50, 10)).toBe(false)
  })

  it('returns false for unlimited tiers', () => {
    expect(isLookupLimitReached('shop', 10000, 0, 0)).toBe(false)
  })

  it('bonus lookups persist through monthly reset', () => {
    // After monthly reset (usedThisMonth = 0), user has 200 fresh + remaining bonus
    // All bonus used (50/50) but monthly reset, so 200 monthly still available
    expect(isLookupLimitReached('solo', 0, 50, 50)).toBe(false)
    // Monthly used + bonus used = total used vs total available
    // 200 used + 50 used = 250, total available = 200 + 50 = 250
    expect(isLookupLimitReached('solo', 200, 50, 50)).toBe(true)
    // Bonus lookups don't reset: 200 monthly used + 40 bonus used = 240 < 250
    expect(isLookupLimitReached('solo', 200, 50, 40)).toBe(false)
  })
})

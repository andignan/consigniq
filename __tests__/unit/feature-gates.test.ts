/**
 * Tests for feature gating logic and tier limits
 * Covers: canUseFeature(), getUpgradeMessage(), tier configs
 */

import { canUseFeature, getUpgradeMessage } from '@/lib/feature-gates'
import { TIER_CONFIGS, FEATURE_REQUIRED_TIER } from '@/lib/tier-limits'

describe('canUseFeature', () => {
  it('starter can use ai_pricing', () => {
    expect(canUseFeature('starter', 'ai_pricing')).toBe(true)
  })

  it('starter cannot use repeat_item_history', () => {
    expect(canUseFeature('starter', 'repeat_item_history')).toBe(false)
  })

  it('starter cannot use markdown_schedule', () => {
    expect(canUseFeature('starter', 'markdown_schedule')).toBe(false)
  })

  it('starter cannot use cross_customer_pricing', () => {
    expect(canUseFeature('starter', 'cross_customer_pricing')).toBe(false)
  })

  it('standard can use repeat_item_history', () => {
    expect(canUseFeature('standard', 'repeat_item_history')).toBe(true)
  })

  it('standard can use markdown_schedule', () => {
    expect(canUseFeature('standard', 'markdown_schedule')).toBe(true)
  })

  it('standard cannot use cross_customer_pricing', () => {
    expect(canUseFeature('standard', 'cross_customer_pricing')).toBe(false)
  })

  it('pro can use all features', () => {
    expect(canUseFeature('pro', 'ai_pricing')).toBe(true)
    expect(canUseFeature('pro', 'repeat_item_history')).toBe(true)
    expect(canUseFeature('pro', 'cross_customer_pricing')).toBe(true)
    expect(canUseFeature('pro', 'community_pricing_feed')).toBe(true)
    expect(canUseFeature('pro', 'multi_location_all')).toBe(true)
    expect(canUseFeature('pro', 'api_access')).toBe(true)
  })
})

describe('getUpgradeMessage', () => {
  it('returns message with correct tier for repeat_item_history', () => {
    const msg = getUpgradeMessage('repeat_item_history')
    expect(msg).toContain('Standard')
    expect(msg).toContain('$79')
  })

  it('returns message with correct tier for cross_customer_pricing', () => {
    const msg = getUpgradeMessage('cross_customer_pricing')
    expect(msg).toContain('Pro')
    expect(msg).toContain('$129')
  })
})

describe('TIER_CONFIGS', () => {
  it('starter has 50 AI pricing limit', () => {
    expect(TIER_CONFIGS.starter.aiPricingLimit).toBe(50)
  })

  it('standard has unlimited AI pricing', () => {
    expect(TIER_CONFIGS.standard.aiPricingLimit).toBeNull()
  })

  it('pro has unlimited AI pricing', () => {
    expect(TIER_CONFIGS.pro.aiPricingLimit).toBeNull()
  })
})

describe('FEATURE_REQUIRED_TIER', () => {
  it('maps features to correct minimum tier', () => {
    expect(FEATURE_REQUIRED_TIER.ai_pricing).toBe('starter')
    expect(FEATURE_REQUIRED_TIER.repeat_item_history).toBe('standard')
    expect(FEATURE_REQUIRED_TIER.markdown_schedule).toBe('standard')
    expect(FEATURE_REQUIRED_TIER.email_notifications).toBe('standard')
    expect(FEATURE_REQUIRED_TIER.cross_customer_pricing).toBe('pro')
    expect(FEATURE_REQUIRED_TIER.community_pricing_feed).toBe('pro')
    expect(FEATURE_REQUIRED_TIER.multi_location_all).toBe('pro')
    expect(FEATURE_REQUIRED_TIER.api_access).toBe('pro')
  })
})

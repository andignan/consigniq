/**
 * Tests for AI lookup limit enforcement
 * HIGH PRIORITY: Solo user hitting 200 limit, bonus exhaustion
 */
import { isLookupLimitReached, canUseFeature } from '@/lib/feature-gates'
import { TIER_CONFIGS } from '@/lib/tier-limits'

describe('AI Lookup Limits', () => {
  describe('Solo tier (200/month limit)', () => {
    it('solo has 200 lookup limit', () => {
      expect(TIER_CONFIGS.solo.aiPricingLimit).toBe(200)
    })

    it('starter has unlimited lookups', () => {
      expect(TIER_CONFIGS.starter.aiPricingLimit).toBeNull()
    })

    it('standard has unlimited lookups', () => {
      expect(TIER_CONFIGS.standard.aiPricingLimit).toBeNull()
    })

    it('pro has unlimited lookups', () => {
      expect(TIER_CONFIGS.pro.aiPricingLimit).toBeNull()
    })

    it('solo at 199/200 is NOT limit reached', () => {
      expect(isLookupLimitReached('solo', 199, 0, 0)).toBe(false)
    })

    it('solo at 200/200 with no bonus IS limit reached', () => {
      expect(isLookupLimitReached('solo', 200, 0, 0)).toBe(true)
    })

    it('solo at 201/200 with no bonus IS limit reached', () => {
      expect(isLookupLimitReached('solo', 201, 0, 0)).toBe(true)
    })

    it('solo at 200/200 with unused bonus is NOT limit reached', () => {
      expect(isLookupLimitReached('solo', 200, 50, 0)).toBe(false)
    })

    it('solo at 200/200 with fully used bonus IS limit reached', () => {
      expect(isLookupLimitReached('solo', 200, 50, 50)).toBe(true)
    })

    it('solo at 200/200 with partially used bonus is NOT limit reached', () => {
      expect(isLookupLimitReached('solo', 200, 50, 25)).toBe(false)
    })
  })

  describe('Unlimited tiers', () => {
    it('starter is never limit reached', () => {
      expect(isLookupLimitReached('starter', 999999, 0, 0)).toBe(false)
    })

    it('standard is never limit reached', () => {
      expect(isLookupLimitReached('standard', 999999, 0, 0)).toBe(false)
    })

    it('pro is never limit reached', () => {
      expect(isLookupLimitReached('pro', 999999, 0, 0)).toBe(false)
    })
  })

  describe('Solo feature access', () => {
    it('solo can use ai_pricing', () => {
      expect(canUseFeature('solo', 'ai_pricing')).toBe(true)
    })

    it('solo can use photo_identification', () => {
      expect(canUseFeature('solo', 'photo_identification')).toBe(true)
    })

    it('solo cannot use consignor_mgmt', () => {
      expect(canUseFeature('solo', 'consignor_mgmt')).toBe(false)
    })
  })
})

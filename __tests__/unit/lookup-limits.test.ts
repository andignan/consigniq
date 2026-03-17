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

    it('shop has unlimited lookups', () => {
      expect(TIER_CONFIGS.shop.aiPricingLimit).toBeNull()
    })

    it('enterprise has unlimited lookups', () => {
      expect(TIER_CONFIGS.enterprise.aiPricingLimit).toBeNull()
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
    it('shop is never limit reached', () => {
      expect(isLookupLimitReached('shop', 999999, 0, 0)).toBe(false)
    })

    it('enterprise is never limit reached', () => {
      expect(isLookupLimitReached('enterprise', 999999, 0, 0)).toBe(false)
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

/**
 * Tests for TrialExpiredPage component logic
 * Covers: tier display, config lookups, pricing display
 */
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

describe('TrialExpiredPage tier display', () => {
  const tiers: Tier[] = ['solo', 'shop', 'enterprise']

  it('renders all 3 tiers', () => {
    expect(tiers).toHaveLength(3)
    for (const tier of tiers) {
      expect(TIER_CONFIGS[tier]).toBeDefined()
    }
  })

  it('each tier has label and price', () => {
    for (const tier of tiers) {
      const config = TIER_CONFIGS[tier]
      expect(config.label).toBeTruthy()
      expect(typeof config.price).toBe('number')
      expect(config.price).toBeGreaterThan(0)
    }
  })

  it('solo shows lookup limit, others show unlimited', () => {
    expect(TIER_CONFIGS.solo.aiPricingLimit).toBe(200)
    expect(TIER_CONFIGS.shop.aiPricingLimit).toBeNull()
    expect(TIER_CONFIGS.enterprise.aiPricingLimit).toBeNull()
  })

  it('tiers are in ascending price order', () => {
    const prices = tiers.map(t => TIER_CONFIGS[t].price)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })

  it('solo is $9, shop $79, enterprise $129', () => {
    expect(TIER_CONFIGS.solo.price).toBe(9)
    expect(TIER_CONFIGS.shop.price).toBe(79)
    expect(TIER_CONFIGS.enterprise.price).toBe(129)
  })
})

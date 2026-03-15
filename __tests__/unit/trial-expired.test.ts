/**
 * Tests for TrialExpiredPage component logic
 * Covers: tier display, config lookups, pricing display
 */
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

describe('TrialExpiredPage tier display', () => {
  const tiers: Tier[] = ['solo', 'starter', 'standard', 'pro']

  it('renders all 4 tiers', () => {
    expect(tiers).toHaveLength(4)
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
    expect(TIER_CONFIGS.starter.aiPricingLimit).toBeNull()
    expect(TIER_CONFIGS.standard.aiPricingLimit).toBeNull()
    expect(TIER_CONFIGS.pro.aiPricingLimit).toBeNull()
  })

  it('tiers are in ascending price order', () => {
    const prices = tiers.map(t => TIER_CONFIGS[t].price)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })

  it('solo is $9, starter $49, standard $79, pro $129', () => {
    expect(TIER_CONFIGS.solo.price).toBe(9)
    expect(TIER_CONFIGS.starter.price).toBe(49)
    expect(TIER_CONFIGS.standard.price).toBe(79)
    expect(TIER_CONFIGS.pro.price).toBe(129)
  })
})

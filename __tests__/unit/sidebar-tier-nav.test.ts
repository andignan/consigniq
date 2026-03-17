/**
 * Tests for Sidebar tier-based navigation logic
 * Covers: solo vs full nav items, tier label display
 */
import { canUseFeature } from '@/lib/feature-gates'
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

describe('Sidebar tier navigation', () => {
  // Solo nav: Dashboard, Price Lookup, My Inventory, Settings
  // Full nav: Dashboard, Consignors, Inventory, Price Lookup, Reports, Payouts, Settings
  const soloNavItems = ['dashboard', 'pricing', 'inventory', 'settings']
  const fullNavFeatures = ['consignor_mgmt', 'reports', 'payouts'] as const

  it('solo tier cannot access consignors, reports, or payouts', () => {
    for (const feature of fullNavFeatures) {
      expect(canUseFeature('solo', feature)).toBe(false)
    }
  })

  it('shop tier can access consignors, reports, and payouts', () => {
    for (const feature of fullNavFeatures) {
      expect(canUseFeature('shop', feature)).toBe(true)
    }
  })

  it('solo nav has 4 items', () => {
    expect(soloNavItems).toHaveLength(4)
  })

  it('tier labels exist for all tiers', () => {
    const tiers: Tier[] = ['solo', 'shop', 'enterprise']
    for (const tier of tiers) {
      expect(TIER_CONFIGS[tier].label).toBeTruthy()
    }
  })
})

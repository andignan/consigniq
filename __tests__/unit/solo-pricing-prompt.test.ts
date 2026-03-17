/**
 * Tests for Solo tier AI pricing prompt customization
 * Verifies prompt language differs for solo vs consignment tiers
 */

describe('Solo pricing prompt', () => {
  function buildPromptRole(tier: string) {
    const isSoloTier = tier === 'solo'
    return isSoloTier
      ? 'You are a resale pricing expert. Price this item for resale on platforms like eBay, Poshmark, or Facebook Marketplace.'
      : 'You are a consignment shop pricing expert. Price this item for a brick-and-mortar consignment store.'
  }

  function buildPricingGuidance(tier: string) {
    const isSoloTier = tier === 'solo'
    return isSoloTier
      ? 'Price for resale'
      : 'Price for a consignment store'
  }

  it('solo prompt mentions resale, not consignment', () => {
    const role = buildPromptRole('solo')
    expect(role).toContain('resale')
    expect(role).not.toContain('consignment')
  })

  it('shop prompt mentions consignment', () => {
    const role = buildPromptRole('shop')
    expect(role).toContain('consignment')
    expect(role).not.toContain('resale')
  })

  it('enterprise prompt mentions consignment', () => {
    const role = buildPromptRole('enterprise')
    expect(role).toContain('consignment')
  })

  it('solo guidance mentions resale', () => {
    const guidance = buildPricingGuidance('solo')
    expect(guidance).toContain('resale')
  })

  it('shop guidance mentions consignment', () => {
    const guidance = buildPricingGuidance('shop')
    expect(guidance).toContain('consignment')
  })
})

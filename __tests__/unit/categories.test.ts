import { getCategoryConfig } from '@/lib/pricing/categories'

describe('getCategoryConfig', () => {
  it('returns config for each known category', () => {
    const categories = [
      'Clothing & Shoes', 'Furniture', 'Jewelry & Silver', 'China & Crystal',
      'Collectibles & Art', 'Electronics', 'Books & Games', 'Toys',
      'Tools', 'Luxury & Designer', 'Kitchen & Home', 'Other',
    ]

    for (const cat of categories) {
      const config = getCategoryConfig(cat)
      expect(config.label).toBe(cat)
      expect(typeof config.priceGuidance).toBe('string')
      expect(config.priceGuidance.length).toBeGreaterThan(0)
      expect(typeof config.typicalMargin.low).toBe('number')
      expect(typeof config.typicalMargin.high).toBe('number')
      expect(config.typicalMargin.high).toBeGreaterThan(config.typicalMargin.low)
    }
  })

  it('falls back to Other for unknown categories', () => {
    const config = getCategoryConfig('Nonexistent Category')
    expect(config.label).toBe('Other')
  })

  it('generates search terms from name and description', () => {
    const config = getCategoryConfig('Furniture')
    const terms = config.searchTerms('Oak dining table', 'Solid wood, seats 6')
    expect(terms).toContain('Oak dining table')
    expect(terms).toContain('Solid wood')
    expect(terms).toContain('furniture')
  })

  it('handles missing description in search terms', () => {
    const config = getCategoryConfig('Electronics')
    const terms = config.searchTerms('iPhone 15 Pro')
    expect(terms).toContain('iPhone 15 Pro')
    expect(terms).toContain('used')
  })

  it('has typical margins between 0 and 1', () => {
    const config = getCategoryConfig('Luxury & Designer')
    expect(config.typicalMargin.low).toBeGreaterThanOrEqual(0)
    expect(config.typicalMargin.low).toBeLessThanOrEqual(1)
    expect(config.typicalMargin.high).toBeGreaterThanOrEqual(0)
    expect(config.typicalMargin.high).toBeLessThanOrEqual(1)
  })
})

/**
 * Tests for category-specific description hints
 * Covers: hint display logic, threshold behavior, category mapping
 */

import { getDescriptionHint, DESCRIPTION_HINTS, DESCRIPTION_HINT_THRESHOLD } from '@/lib/description-hints'

describe('getDescriptionHint', () => {
  it('returns hint for China & Crystal with empty description', () => {
    const hint = getDescriptionHint('China & Crystal', '')
    expect(hint).toBe(DESCRIPTION_HINTS['China & Crystal'])
    expect(hint).toContain('pattern name')
  })

  it('returns hint for Jewelry & Silver with short description', () => {
    const hint = getDescriptionHint('Jewelry & Silver', 'gold ring')
    expect(hint).toContain('metal type')
  })

  it('returns hint for Collectibles & Art', () => {
    const hint = getDescriptionHint('Collectibles & Art', '')
    expect(hint).toContain('artist name')
  })

  it('returns hint for Furniture', () => {
    const hint = getDescriptionHint('Furniture', '')
    expect(hint).toContain('dimensions')
  })

  it('returns hint for Electronics', () => {
    const hint = getDescriptionHint('Electronics', '')
    expect(hint).toContain('model number')
  })

  it('returns hint for Clothing & Shoes', () => {
    const hint = getDescriptionHint('Clothing & Shoes', '')
    expect(hint).toContain('brand')
  })

  it('returns null when description reaches threshold (20+ chars)', () => {
    const longDesc = 'This is a detailed description of the item'
    expect(longDesc.length).toBeGreaterThanOrEqual(DESCRIPTION_HINT_THRESHOLD)
    const hint = getDescriptionHint('China & Crystal', longDesc)
    expect(hint).toBeNull()
  })

  it('returns hint when description is just under threshold', () => {
    const shortDesc = 'Small blue vase'
    expect(shortDesc.length).toBeLessThan(DESCRIPTION_HINT_THRESHOLD)
    const hint = getDescriptionHint('China & Crystal', shortDesc)
    expect(hint).not.toBeNull()
  })

  it('returns null for categories without defined hints', () => {
    expect(getDescriptionHint('Other', '')).toBeNull()
    expect(getDescriptionHint('Books & Games', '')).toBeNull()
    expect(getDescriptionHint('Toys', '')).toBeNull()
    expect(getDescriptionHint('Tools', '')).toBeNull()
    expect(getDescriptionHint('Kitchen & Home', '')).toBeNull()
    expect(getDescriptionHint('Luxury & Designer', '')).toBeNull()
  })

  it('returns null for unknown category', () => {
    expect(getDescriptionHint('Nonexistent Category', '')).toBeNull()
  })

  it('has exactly 6 categories with hints', () => {
    expect(Object.keys(DESCRIPTION_HINTS)).toHaveLength(6)
  })

  it('all hints start with "For best results"', () => {
    for (const hint of Object.values(DESCRIPTION_HINTS)) {
      expect(hint).toMatch(/^For best results/)
    }
  })
})

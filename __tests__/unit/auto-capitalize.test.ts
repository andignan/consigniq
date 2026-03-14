/**
 * Tests for item name auto-capitalize behavior
 * The same logic is used in Price Lookup, IntakeQueue, and inventory pricing:
 * value.replace(/\b\w/g, c => c.toUpperCase())
 */

function autoCapitalize(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return trimmed.replace(/\b\w/g, c => c.toUpperCase())
}

describe('autoCapitalize', () => {
  it('capitalizes first letter of each word', () => {
    expect(autoCapitalize('waterford crystal lismore vase')).toBe('Waterford Crystal Lismore Vase')
  })

  it('handles already capitalized text', () => {
    expect(autoCapitalize('Oak Dining Table')).toBe('Oak Dining Table')
  })

  it('handles mixed case', () => {
    expect(autoCapitalize('vintage LEVI denim jacket')).toBe('Vintage LEVI Denim Jacket')
  })

  it('handles single word', () => {
    expect(autoCapitalize('chair')).toBe('Chair')
  })

  it('returns empty string for empty input', () => {
    expect(autoCapitalize('')).toBe('')
  })

  it('trims whitespace', () => {
    expect(autoCapitalize('  oak table  ')).toBe('Oak Table')
  })

  it('handles words with apostrophes', () => {
    expect(autoCapitalize("levi's denim jacket")).toBe("Levi'S Denim Jacket")
  })

  it('handles numbers in text', () => {
    expect(autoCapitalize('12 piece tea set')).toBe('12 Piece Tea Set')
  })
})

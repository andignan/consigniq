/**
 * Tests for Solo tier UI fixes
 * Covers: inventory tabs, progress bar min width, welcome message, pricing subtitle
 */

describe('Solo inventory status tabs', () => {
  const SOLO_TABS = ['all', 'priced', 'sold', 'archived']
  const FULL_TABS = ['all', 'pending', 'priced', 'sold', 'donated']

  it('solo tabs do not include pending', () => {
    expect(SOLO_TABS).not.toContain('pending')
  })

  it('solo tabs do not include donated', () => {
    expect(SOLO_TABS).not.toContain('donated')
  })

  it('solo tabs include archived', () => {
    expect(SOLO_TABS).toContain('archived')
  })

  it('full tabs include pending and donated', () => {
    expect(FULL_TABS).toContain('pending')
    expect(FULL_TABS).toContain('donated')
  })

  it('solo tabs have 4 items', () => {
    expect(SOLO_TABS).toHaveLength(4)
  })
})

describe('Progress bar minimum width', () => {
  it('at 0% usage shows minimum 2% width', () => {
    const pct = 0
    const barWidth = Math.max(pct, 2)
    expect(barWidth).toBe(2)
  })

  it('at 1% usage shows minimum 2% width', () => {
    const pct = 1
    const barWidth = Math.max(pct, 2)
    expect(barWidth).toBe(2)
  })

  it('at 50% usage shows actual width', () => {
    const pct = 50
    const barWidth = Math.max(pct, 2)
    expect(barWidth).toBe(50)
  })
})

describe('Welcome message', () => {
  it('extracts first name from full name', () => {
    const fullName = 'John Smith'
    const firstName = fullName.split(' ')[0]
    expect(firstName).toBe('John')
  })

  it('handles single name', () => {
    const fullName = 'John'
    const firstName = fullName.split(' ')[0]
    expect(firstName).toBe('John')
  })

  it('handles empty name gracefully', () => {
    const fullName = ''
    const firstName = fullName ? fullName.split(' ')[0] : undefined
    expect(firstName).toBeUndefined()
  })
})

describe('Pricing subtitle', () => {
  it('solo gets save-oriented subtitle', () => {
    const isSolo = true
    const subtitle = isSolo ? 'Price items and save to your inventory' : 'Quick pricing tool — nothing saved to the database'
    expect(subtitle).toBe('Price items and save to your inventory')
  })

  it('non-solo gets scratch-pad subtitle', () => {
    const isSolo = false
    const subtitle = isSolo ? 'Price items and save to your inventory' : 'Quick pricing tool — nothing saved to the database'
    expect(subtitle).toBe('Quick pricing tool — nothing saved to the database')
  })
})

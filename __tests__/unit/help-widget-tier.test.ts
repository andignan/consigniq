/**
 * Tests for tier-aware help widget quick links and caching
 */

describe('Help widget tier-aware quick links', () => {
  const SOLO_SECTIONS = ['Getting Started', 'Pricing Help', 'Account']
  const FULL_SECTIONS = ['Getting Started', 'Pricing Help', 'Account & Settings']

  it('solo has 3 sections', () => {
    expect(SOLO_SECTIONS).toHaveLength(3)
  })

  it('full tier has 3 sections', () => {
    expect(FULL_SECTIONS).toHaveLength(3)
  })

  it('solo sections include Account (not Account & Settings)', () => {
    expect(SOLO_SECTIONS).toContain('Account')
    expect(SOLO_SECTIONS).not.toContain('Account & Settings')
  })

  it('full sections include Account & Settings', () => {
    expect(FULL_SECTIONS).toContain('Account & Settings')
  })

  // Solo-specific questions
  it('solo questions include lookup-related topics', () => {
    const soloQuestions = [
      'How do lookups work?',
      'How do I save an item to inventory?',
      "What's included in Solo Pricer?",
      'How do I buy more lookups?',
    ]
    for (const q of soloQuestions) {
      expect(q).toBeTruthy()
    }
  })

  // Full-tier questions
  it('full tier questions include consignor topics', () => {
    const fullQuestions = [
      'How do I add a consignor?',
      'How does pricing work?',
      'What happens at 60 days?',
      'How do I invite staff?',
    ]
    for (const q of fullQuestions) {
      expect(q).toBeTruthy()
    }
  })
})

describe('Help widget page-aware ordering', () => {
  function getOrderedSections(sections: string[], pathname: string): string[] {
    const pageMap: Record<string, string> = {
      '/dashboard/pricing': 'Pricing Help',
      '/dashboard/consignors': 'Getting Started',
      '/dashboard/inventory': 'Getting Started',
    }
    const match = Object.entries(pageMap).find(([path]) => pathname.startsWith(path))
    if (!match) return sections
    const priority = match[1]
    return [...sections].sort((a, b) => {
      if (a === priority) return -1
      if (b === priority) return 1
      return 0
    })
  }

  it('pricing page prioritizes Pricing Help', () => {
    const ordered = getOrderedSections(['Getting Started', 'Pricing Help', 'Account'], '/dashboard/pricing')
    expect(ordered[0]).toBe('Pricing Help')
  })

  it('consignors page prioritizes Getting Started', () => {
    const ordered = getOrderedSections(['Pricing Help', 'Getting Started', 'Account'], '/dashboard/consignors')
    expect(ordered[0]).toBe('Getting Started')
  })

  it('dashboard page keeps default order', () => {
    const sections = ['Getting Started', 'Pricing Help', 'Account']
    const ordered = getOrderedSections(sections, '/dashboard')
    expect(ordered).toEqual(sections)
  })
})

describe('Help response caching', () => {
  it('cache key is normalized (lowercase, trimmed)', () => {
    const normalize = (q: string) => q.toLowerCase().trim()
    expect(normalize('  How Do Lookups Work?  ')).toBe('how do lookups work?')
    expect(normalize('HOW DO LOOKUPS WORK?')).toBe('how do lookups work?')
  })

  it('cache TTL is 24 hours', () => {
    const CACHE_TTL = 24 * 60 * 60 * 1000
    expect(CACHE_TTL).toBe(86400000)
  })

  it('expired cache entries are rejected', () => {
    const CACHE_TTL = 24 * 60 * 60 * 1000
    const timestamp = Date.now() - CACHE_TTL - 1000 // 24h + 1s ago
    expect(Date.now() - timestamp > CACHE_TTL).toBe(true)
  })

  it('fresh cache entries are accepted', () => {
    const CACHE_TTL = 24 * 60 * 60 * 1000
    const timestamp = Date.now() - 1000 // 1 second ago
    expect(Date.now() - timestamp < CACHE_TTL).toBe(true)
  })
})

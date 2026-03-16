import { getLifecycleStatus, COLOR_CLASSES, CONDITION_LABELS, ITEM_CATEGORIES } from '@/types'

// Helper to create dates relative to today
function daysFromNow(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

describe('getLifecycleStatus', () => {
  it('returns green for consignor with many days remaining', () => {
    const intake = daysFromNow(-10)
    const expiry = daysFromNow(50)
    const graceEnd = daysFromNow(53)
    const status = getLifecycleStatus(intake, expiry, graceEnd)

    expect(status.color).toBe('green')
    expect(status.daysRemaining).toBe(50)
    expect(status.isExpired).toBe(false)
    expect(status.isGrace).toBe(false)
    expect(status.isDonationEligible).toBe(false)
    expect(status.label).toContain('50d left')
  })

  it('returns yellow for 14 days or fewer remaining', () => {
    const intake = daysFromNow(-46)
    const expiry = daysFromNow(14)
    const graceEnd = daysFromNow(17)
    const status = getLifecycleStatus(intake, expiry, graceEnd)

    expect(status.color).toBe('yellow')
    expect(status.daysRemaining).toBe(14)
    expect(status.isExpired).toBe(false)
  })

  it('returns orange for 7 days or fewer remaining', () => {
    const intake = daysFromNow(-53)
    const expiry = daysFromNow(7)
    const graceEnd = daysFromNow(10)
    const status = getLifecycleStatus(intake, expiry, graceEnd)

    expect(status.color).toBe('orange')
    expect(status.daysRemaining).toBe(7)
    expect(status.isExpired).toBe(false)
  })

  it('returns red for grace period', () => {
    const intake = daysFromNow(-62)
    const expiry = daysFromNow(-2)
    const graceEnd = daysFromNow(1)
    const status = getLifecycleStatus(intake, expiry, graceEnd)

    expect(status.color).toBe('red')
    expect(status.isExpired).toBe(true)
    expect(status.isGrace).toBe(true)
    expect(status.isDonationEligible).toBe(false)
    expect(status.label).toContain('Grace Day')
  })

  it('returns gray for donation eligible (past grace end)', () => {
    const intake = daysFromNow(-70)
    const expiry = daysFromNow(-10)
    const graceEnd = daysFromNow(-7)
    const status = getLifecycleStatus(intake, expiry, graceEnd)

    expect(status.color).toBe('gray')
    expect(status.isExpired).toBe(true)
    expect(status.isGrace).toBe(false)
    expect(status.isDonationEligible).toBe(true)
    expect(status.label).toBe('Donation Eligible')
  })

  it('calculates progressPct correctly', () => {
    const intake = daysFromNow(-30)
    const expiry = daysFromNow(30)
    const graceEnd = daysFromNow(33)
    const status = getLifecycleStatus(intake, expiry, graceEnd)

    // With integer day math, 30/60 should give roughly 50%
    expect(status.progressPct).toBeGreaterThan(45)
    expect(status.progressPct).toBeLessThan(55)
  })

  it('clamps progressPct to 0-100', () => {
    // Past expiry — progress should be 100
    const intake = daysFromNow(-70)
    const expiry = daysFromNow(-10)
    const graceEnd = daysFromNow(-7)
    const status = getLifecycleStatus(intake, expiry, graceEnd)

    expect(status.progressPct).toBe(100)
  })

  it('handles same-day intake and expiry edge case', () => {
    const today = daysFromNow(0)
    const graceEnd = daysFromNow(3)
    const status = getLifecycleStatus(today, today, graceEnd)

    // Expiry is today, so daysRemaining = 0
    expect(status.daysRemaining).toBe(0)
  })
})

describe('CONDITION_LABELS', () => {
  it('has labels for all 10 conditions', () => {
    expect(Object.keys(CONDITION_LABELS)).toHaveLength(10)
    expect(CONDITION_LABELS.new_in_box).toBe('New in Box')
    expect(CONDITION_LABELS.new_with_tags).toBe('New with Tags')
    expect(CONDITION_LABELS.new_without_tags).toBe('New without Tags')
    expect(CONDITION_LABELS.new).toBe('New')
    expect(CONDITION_LABELS.like_new).toBe('Like New')
    expect(CONDITION_LABELS.excellent).toBe('Excellent')
    expect(CONDITION_LABELS.very_good).toBe('Very Good')
    expect(CONDITION_LABELS.good).toBe('Good')
    expect(CONDITION_LABELS.fair).toBe('Fair')
    expect(CONDITION_LABELS.poor).toBe('Poor')
  })
})

describe('ITEM_CATEGORIES', () => {
  it('has 12 categories', () => {
    expect(ITEM_CATEGORIES).toHaveLength(12)
  })

  it('includes key categories', () => {
    expect(ITEM_CATEGORIES).toContain('Furniture')
    expect(ITEM_CATEGORIES).toContain('Jewelry & Silver')
    expect(ITEM_CATEGORIES).toContain('Luxury & Designer')
    expect(ITEM_CATEGORIES).toContain('Other')
  })
})

describe('COLOR_CLASSES', () => {
  it('has all 5 color keys', () => {
    const keys = Object.keys(COLOR_CLASSES)
    expect(keys).toContain('green')
    expect(keys).toContain('yellow')
    expect(keys).toContain('orange')
    expect(keys).toContain('red')
    expect(keys).toContain('gray')
  })

  it('each color has badge, bar, dot, ring classes', () => {
    for (const color of Object.values(COLOR_CLASSES)) {
      expect(color).toHaveProperty('badge')
      expect(color).toHaveProperty('bar')
      expect(color).toHaveProperty('dot')
      expect(color).toHaveProperty('ring')
    }
  })
})

/**
 * Tests for TrialBanner component logic
 * Covers: days remaining calculation, color coding thresholds
 */

describe('TrialBanner calculations', () => {
  function calculateBanner(trialEndsAt: string) {
    const now = new Date()
    const trialEnd = new Date(trialEndsAt)
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    const color = daysRemaining > 14
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : daysRemaining > 7
        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
        : 'bg-orange-50 border-orange-200 text-orange-800'

    return { daysRemaining, color, shouldShow: daysRemaining > 0 }
  }

  it('shows green for >14 days remaining', () => {
    const future = new Date()
    future.setDate(future.getDate() + 20)
    const result = calculateBanner(future.toISOString())
    expect(result.daysRemaining).toBeGreaterThan(14)
    expect(result.color).toContain('emerald')
    expect(result.shouldShow).toBe(true)
  })

  it('shows yellow for 8-14 days remaining', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const result = calculateBanner(future.toISOString())
    expect(result.daysRemaining).toBeGreaterThan(7)
    expect(result.daysRemaining).toBeLessThanOrEqual(14)
    expect(result.color).toContain('yellow')
  })

  it('shows orange for ≤7 days remaining', () => {
    const future = new Date()
    future.setDate(future.getDate() + 5)
    const result = calculateBanner(future.toISOString())
    expect(result.daysRemaining).toBeLessThanOrEqual(7)
    expect(result.color).toContain('orange')
  })

  it('returns 0 days for expired trial', () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const result = calculateBanner(past.toISOString())
    expect(result.daysRemaining).toBe(0)
    expect(result.shouldShow).toBe(false)
  })
})

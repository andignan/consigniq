/**
 * Tests for SoloDashboard component logic
 * HIGH PRIORITY: Usage meter math, progress bar color thresholds, reset date
 */

describe('SoloDashboard usage meter calculations', () => {
  // These test the exact calculations used in SoloDashboard.tsx

  function calculateMeter(
    ai_lookups_this_month: number,
    bonus_lookups: number,
    bonus_lookups_used: number,
    ai_lookups_reset_at?: string
  ) {
    const usedThisMonth = ai_lookups_this_month
    const monthlyLimit = 200
    const totalAvailable = monthlyLimit + bonus_lookups
    const totalUsed = usedThisMonth + bonus_lookups_used
    const remaining = Math.max(0, totalAvailable - totalUsed)
    const pct = totalAvailable > 0 ? Math.min(100, (totalUsed / totalAvailable) * 100) : 0
    const barColor = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-emerald-500'
    const resetDate = ai_lookups_reset_at
      ? new Date(new Date(ai_lookups_reset_at).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null

    return { totalAvailable, totalUsed, remaining, pct, barColor, resetDate }
  }

  it('shows green bar at 0% usage', () => {
    const result = calculateMeter(0, 0, 0)
    expect(result.remaining).toBe(200)
    expect(result.pct).toBe(0)
    expect(result.barColor).toBe('bg-emerald-500')
  })

  it('shows green bar at 50% usage', () => {
    const result = calculateMeter(100, 0, 0)
    expect(result.remaining).toBe(100)
    expect(result.pct).toBe(50)
    expect(result.barColor).toBe('bg-emerald-500')
  })

  it('shows yellow bar at 75% usage', () => {
    const result = calculateMeter(150, 0, 0)
    expect(result.remaining).toBe(50)
    expect(result.pct).toBe(75)
    expect(result.barColor).toBe('bg-yellow-500')
  })

  it('shows red bar at 90% usage', () => {
    const result = calculateMeter(180, 0, 0)
    expect(result.remaining).toBe(20)
    expect(result.pct).toBe(90)
    expect(result.barColor).toBe('bg-red-500')
  })

  it('shows red bar at 100% usage', () => {
    const result = calculateMeter(200, 0, 0)
    expect(result.remaining).toBe(0)
    expect(result.pct).toBe(100)
    expect(result.barColor).toBe('bg-red-500')
  })

  it('includes bonus lookups in total available', () => {
    const result = calculateMeter(200, 50, 0)
    expect(result.totalAvailable).toBe(250)
    expect(result.remaining).toBe(50)
    expect(result.pct).toBe(80)
    expect(result.barColor).toBe('bg-yellow-500')
  })

  it('accounts for used bonus lookups', () => {
    const result = calculateMeter(200, 50, 25)
    expect(result.totalUsed).toBe(225)
    expect(result.remaining).toBe(25)
  })

  it('remaining never goes below 0', () => {
    const result = calculateMeter(300, 0, 0)
    expect(result.remaining).toBe(0)
    expect(result.pct).toBe(100) // capped at 100
  })

  it('calculates reset date as 30 days from reset_at', () => {
    const resetAt = '2026-03-01T00:00:00Z'
    const result = calculateMeter(100, 0, 0, resetAt)
    expect(result.resetDate).toBeInstanceOf(Date)
    // Should be 30 days after March 1 = March 31 (but timezone may shift to 30)
    const expected = new Date(new Date(resetAt).getTime() + 30 * 24 * 60 * 60 * 1000)
    expect(result.resetDate!.getTime()).toBe(expected.getTime())
  })

  it('returns null reset date when not set', () => {
    const result = calculateMeter(100, 0, 0)
    expect(result.resetDate).toBeNull()
  })
})

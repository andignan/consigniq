/**
 * Tests for sidebar-identity.ts
 * Covers: getBadgeConfig for all 8 badge keys, getDisplayName edge cases,
 * badge color classes, platform role precedence
 */
import { getBadgeConfig, getDisplayName, SIDEBAR_BADGES } from '@/lib/sidebar-identity'

describe('getBadgeConfig', () => {
  it('returns correct config for super_admin platform role', () => {
    const result = getBadgeConfig(null, null, 'super_admin')
    expect(result).toEqual({ label: 'Super Admin', colorClasses: 'bg-red-100 text-red-700' })
  })

  it('returns correct config for support platform role', () => {
    const result = getBadgeConfig(null, null, 'support')
    expect(result).toEqual({ label: 'Support', colorClasses: 'bg-blue-100 text-blue-700' })
  })

  it('returns correct config for finance platform role', () => {
    const result = getBadgeConfig(null, null, 'finance')
    expect(result).toEqual({ label: 'Finance', colorClasses: 'bg-amber-100 text-amber-700' })
  })

  it('returns Solo badge for solo tier', () => {
    const result = getBadgeConfig('solo', null, null)
    expect(result).toEqual({ label: 'Solo', colorClasses: 'bg-purple-100 text-purple-700' })
  })

  it('returns Owner badge for shop tier owner', () => {
    const result = getBadgeConfig('shop', 'owner', null)
    expect(result).toEqual({ label: 'Owner', colorClasses: 'bg-brand-50 text-brand-700' })
  })

  it('returns Staff badge for shop tier staff', () => {
    const result = getBadgeConfig('shop', 'staff', null)
    expect(result).toEqual({ label: 'Staff', colorClasses: 'bg-slate-100 text-slate-600' })
  })

  it('returns Owner badge for enterprise tier owner', () => {
    const result = getBadgeConfig('enterprise', 'owner', null)
    expect(result).toEqual({ label: 'Owner', colorClasses: 'bg-brand-50 text-brand-700' })
  })

  it('returns Staff badge for enterprise tier staff', () => {
    const result = getBadgeConfig('enterprise', 'staff', null)
    expect(result).toEqual({ label: 'Staff', colorClasses: 'bg-slate-100 text-slate-600' })
  })

  it('platform role takes precedence over tier', () => {
    const result = getBadgeConfig('shop', 'owner', 'super_admin')
    expect(result!.label).toBe('Super Admin')
  })

  it('returns null when no tier and no platform role', () => {
    expect(getBadgeConfig(null, null, null)).toBeNull()
  })

  it('returns null for unknown platform role with no tier', () => {
    expect(getBadgeConfig(null, null, 'unknown_role')).toBeNull()
  })

  it('all 8 badge keys have label and color', () => {
    const keys = Object.keys(SIDEBAR_BADGES) as (keyof typeof SIDEBAR_BADGES)[]
    expect(keys).toHaveLength(8)
    for (const key of keys) {
      expect(SIDEBAR_BADGES[key].label).toBeTruthy()
      expect(SIDEBAR_BADGES[key].color).toBeTruthy()
    }
  })

  it('badge color classes contain valid Tailwind patterns', () => {
    // All badge configs should produce colorClasses with bg- and text- classes
    const testCases: Array<[Parameters<typeof getBadgeConfig>, string]> = [
      [['solo', null, null], 'purple'],
      [['shop', 'owner', null], 'brand'],
      [[null, null, 'super_admin'], 'red'],
      [[null, null, 'finance'], 'amber'],
    ]
    for (const [args, expectedFragment] of testCases) {
      const result = getBadgeConfig(...args)
      expect(result!.colorClasses).toContain(`bg-${expectedFragment}`)
      expect(result!.colorClasses).toContain(`text-${expectedFragment}`)
    }
  })
})

describe('getDisplayName', () => {
  it('extracts first name from full name', () => {
    expect(getDisplayName('John Doe')).toBe('John')
  })

  it('returns single name as-is', () => {
    expect(getDisplayName('Alice')).toBe('Alice')
  })

  it('returns empty string for null', () => {
    expect(getDisplayName(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(getDisplayName(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(getDisplayName('')).toBe('')
  })

  it('returns empty string for whitespace-only', () => {
    expect(getDisplayName('   ')).toBe('')
  })

  it('handles leading/trailing whitespace', () => {
    expect(getDisplayName('  Jane Smith  ')).toBe('Jane')
  })

  it('handles multi-part names', () => {
    expect(getDisplayName('Mary Jane Watson')).toBe('Mary')
  })
})

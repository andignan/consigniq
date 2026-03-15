/**
 * Tests for subscription lifecycle state transitions
 * Per PRD: /docs/prd/subscription-lifecycle.md
 */
import { isAccountActive, getEffectiveTier, canAccountUseFeature } from '@/lib/feature-gates'
import type { AccountInfo } from '@/lib/feature-gates'

describe('Subscription lifecycle — isAccountActive()', () => {
  it('paid active account is active', () => {
    expect(isAccountActive({ tier: 'starter', account_type: 'paid', status: 'active' })).toBe(true)
  })

  it('complimentary account is active', () => {
    expect(isAccountActive({ tier: 'starter', account_type: 'complimentary', status: 'active' })).toBe(true)
  })

  it('trial before expiry is active', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isAccountActive({ tier: 'starter', account_type: 'trial', trial_ends_at: future, status: 'active' })).toBe(true)
  })

  it('trial after expiry is NOT active', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(isAccountActive({ tier: 'starter', account_type: 'trial', trial_ends_at: past, status: 'active' })).toBe(false)
  })

  it('cancelled_grace is active', () => {
    expect(isAccountActive({ tier: 'starter', account_type: 'cancelled_grace', status: 'active' })).toBe(true)
  })

  it('cancelled_limited is active', () => {
    expect(isAccountActive({ tier: 'starter', account_type: 'cancelled_limited', status: 'active' })).toBe(true)
  })

  it('suspended account is NOT active', () => {
    expect(isAccountActive({ tier: 'starter', account_type: 'paid', status: 'suspended' })).toBe(false)
  })

  it('deleted account is NOT active', () => {
    expect(isAccountActive({ tier: 'starter', account_type: 'paid', status: 'deleted' })).toBe(false)
  })
})

describe('Subscription lifecycle — getEffectiveTier()', () => {
  it('paid account uses its tier', () => {
    expect(getEffectiveTier({ tier: 'standard', account_type: 'paid' })).toBe('standard')
  })

  it('complimentary uses complimentary_tier', () => {
    expect(getEffectiveTier({ tier: 'starter', account_type: 'complimentary', complimentary_tier: 'pro' })).toBe('pro')
  })

  it('cancelled_grace uses cancelled_tier (full access during grace)', () => {
    expect(getEffectiveTier({ tier: 'standard', account_type: 'cancelled_grace', cancelled_tier: 'standard' })).toBe('standard')
  })

  it('cancelled_limited returns solo (restricted access)', () => {
    expect(getEffectiveTier({ tier: 'standard', account_type: 'cancelled_limited', cancelled_tier: 'standard' })).toBe('solo')
  })

  it('cancelled_limited blocks consignor_mgmt', () => {
    const account: AccountInfo = { tier: 'standard', account_type: 'cancelled_limited', cancelled_tier: 'standard', status: 'active' }
    expect(canAccountUseFeature(account, 'consignor_mgmt')).toBe(false)
  })

  it('cancelled_limited allows ai_pricing', () => {
    const account: AccountInfo = { tier: 'standard', account_type: 'cancelled_limited', cancelled_tier: 'standard', status: 'active' }
    expect(canAccountUseFeature(account, 'ai_pricing')).toBe(true)
  })

  it('cancelled_grace allows consignor_mgmt (full access)', () => {
    const account: AccountInfo = { tier: 'standard', account_type: 'cancelled_grace', cancelled_tier: 'standard', status: 'active' }
    expect(canAccountUseFeature(account, 'consignor_mgmt')).toBe(true)
  })
})

describe('Subscription lifecycle — state transitions', () => {
  it('active→cancelled_grace preserves tier access', () => {
    const before: AccountInfo = { tier: 'pro', account_type: 'paid', status: 'active' }
    expect(canAccountUseFeature(before, 'cross_customer_pricing')).toBe(true)

    // After cancellation (cancelled_grace) — still has access via cancelled_tier
    const after: AccountInfo = { tier: 'pro', account_type: 'cancelled_grace', cancelled_tier: 'pro', status: 'active' }
    expect(canAccountUseFeature(after, 'cross_customer_pricing')).toBe(true)
  })

  it('cancelled_grace→cancelled_limited drops to solo', () => {
    const grace: AccountInfo = { tier: 'standard', account_type: 'cancelled_grace', cancelled_tier: 'standard', status: 'active' }
    expect(canAccountUseFeature(grace, 'reports')).toBe(true)

    const limited: AccountInfo = { tier: 'standard', account_type: 'cancelled_limited', cancelled_tier: 'standard', status: 'active' }
    expect(canAccountUseFeature(limited, 'reports')).toBe(false)
  })

  it('cancelled_limited→active (resubscribe) restores full access', () => {
    const limited: AccountInfo = { tier: 'standard', account_type: 'cancelled_limited', cancelled_tier: 'standard', status: 'active' }
    expect(canAccountUseFeature(limited, 'reports')).toBe(false)

    // After resubscribe — cleared cancellation fields
    const resubbed: AccountInfo = { tier: 'standard', account_type: 'paid', status: 'active' }
    expect(canAccountUseFeature(resubbed, 'reports')).toBe(true)
  })
})

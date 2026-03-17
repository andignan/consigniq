/**
 * Tests for email templates — tagline, platform invite, template consistency
 */

import { APP } from '@/lib/constants'
import {
  buildInviteEmail,
  buildUpgradeEmail,
  buildCancellationEmail,
  buildPaymentFailedEmail,
  buildPasswordResetEmail,
  buildAccountDeletedEmail,
} from '@/lib/email-templates'

describe('APP.emailTagline', () => {
  it('equals AI-Powered Pricing & Inventory', () => {
    expect(APP.emailTagline).toBe('AI-Powered Pricing & Inventory')
  })

  it('matches APP.tagline', () => {
    expect(APP.emailTagline).toBe(APP.tagline)
  })
})

describe('buildInviteEmail — customer (isPlatformUser false)', () => {
  const result = buildInviteEmail({
    fullName: 'Jane Doe',
    accountName: 'Vintage Finds',
    tier: 'shop',
    setupLink: 'https://example.com/setup',
    isPlatformUser: false,
  })

  it('includes Plan in plain text', () => {
    expect(result.text).toContain('Plan: Shop')
  })

  it('includes Plan row in HTML', () => {
    expect(result.html).toContain('>Plan<')
    expect(result.html).toContain('>Shop<')
  })

  it('shows account name', () => {
    expect(result.text).toContain('Account: Vintage Finds')
    expect(result.html).toContain('Vintage Finds')
  })

  it('uses updated tagline in HTML header', () => {
    expect(result.html).toContain('AI-Powered Pricing & Inventory')
    expect(result.html).not.toContain('AI-Powered Consignment Management')
  })
})

describe('buildInviteEmail — customer (isPlatformUser omitted)', () => {
  const result = buildInviteEmail({
    fullName: 'Jane Doe',
    accountName: 'Vintage Finds',
    tier: 'shop',
    setupLink: 'https://example.com/setup',
  })

  it('includes Plan when isPlatformUser is not set', () => {
    expect(result.text).toContain('Plan: Shop')
    expect(result.html).toContain('>Plan<')
  })
})

describe('buildInviteEmail — platform user (isPlatformUser true)', () => {
  const result = buildInviteEmail({
    fullName: 'Admin User',
    accountName: 'ConsignIQ',
    tier: 'solo',
    setupLink: 'https://example.com/setup',
    isPlatformUser: true,
  })

  it('omits Plan from plain text', () => {
    expect(result.text).not.toContain('Plan:')
  })

  it('omits Plan row from HTML', () => {
    expect(result.html).not.toContain('>Plan<')
    expect(result.html).not.toContain('>Solo Pricer<')
  })

  it('shows ConsignIQ System as account name in text', () => {
    expect(result.text).toContain('Account: ConsignIQ System')
  })

  it('shows ConsignIQ System as account name in HTML', () => {
    expect(result.html).toContain('ConsignIQ System')
  })
})

describe('all email templates use APP.emailTagline (no hardcoded old value)', () => {
  const OLD_TAGLINE = 'AI-Powered Consignment Management'

  it('buildInviteEmail does not contain old tagline', () => {
    const { html } = buildInviteEmail({
      fullName: 'Test',
      accountName: 'Test',
      tier: 'shop',
      setupLink: 'https://example.com',
    })
    expect(html).not.toContain(OLD_TAGLINE)
    expect(html).toContain(APP.emailTagline)
  })

  it('buildPasswordResetEmail does not contain old tagline', () => {
    const { html } = buildPasswordResetEmail({
      fullName: 'Test',
      resetLink: 'https://example.com',
    })
    expect(html).not.toContain(OLD_TAGLINE)
    expect(html).toContain(APP.emailTagline)
  })

  it('buildUpgradeEmail does not contain old tagline', () => {
    const { html } = buildUpgradeEmail({
      fullName: 'Test',
      tierLabel: 'Shop',
      tierPrice: 79,
      dashboardUrl: 'https://example.com',
    })
    expect(html).not.toContain(OLD_TAGLINE)
    expect(html).toContain(APP.emailTagline)
  })

  it('buildCancellationEmail does not contain old tagline', () => {
    const { html } = buildCancellationEmail({
      fullName: 'Test',
      tierLabel: 'Shop',
      resubscribeUrl: 'https://example.com',
    })
    expect(html).not.toContain(OLD_TAGLINE)
    expect(html).toContain(APP.emailTagline)
  })

  it('buildPaymentFailedEmail does not contain old tagline', () => {
    const { html } = buildPaymentFailedEmail({
      fullName: 'Test',
      portalUrl: 'https://example.com',
    })
    expect(html).not.toContain(OLD_TAGLINE)
    expect(html).toContain(APP.emailTagline)
  })

  it('buildAccountDeletedEmail does not contain old tagline', () => {
    const { html } = buildAccountDeletedEmail({
      accountName: 'Test',
      ownerName: 'Test',
      isPaid: false,
    })
    expect(html).not.toContain(OLD_TAGLINE)
    expect(html).toContain(APP.emailTagline)
  })
})

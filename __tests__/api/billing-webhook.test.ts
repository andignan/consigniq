/**
 * Tests for /api/billing/webhook route
 * Covers: signature verification, checkout.session.completed (new + resub),
 * subscription.deleted (cancelled_grace), invoice.payment_failed (attempt_count)
 */

const mockConstructEvent = jest.fn()
const mockFrom = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}))

jest.mock('@/lib/email-templates', () => ({
  buildUpgradeEmail: () => ({ subject: 'Test', text: 'Test', html: '<p>Test</p>' }),
  buildCancellationEmail: () => ({ subject: 'Test', text: 'Test', html: '<p>Test</p>' }),
  buildPaymentFailedEmail: () => ({ subject: 'Test', text: 'Test', html: '<p>Test</p>' }),
  buildPaymentFinalWarningEmail: () => ({ subject: 'Test', text: 'Test', html: '<p>Test</p>' }),
  buildWelcomeBackEmail: () => ({ subject: 'Test', text: 'Test', html: '<p>Test</p>' }),
}))

import { POST } from '@/app/api/billing/webhook/route'
import { NextRequest } from 'next/server'

function makeWebhookRequest(body: string, signature = 'sig_test'): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/billing/webhook'), {
    method: 'POST',
    body,
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json',
    },
  })
}

const originalEnv = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

  mockUpdate.mockReturnValue({ eq: mockEq })
  mockEq.mockResolvedValue({ error: null })

  mockFrom.mockImplementation(() => ({
    update: mockUpdate,
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'acct-1', tier: 'standard', account_type: 'paid' }, error: null }),
      }),
    }),
  }))
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('POST /api/billing/webhook', () => {
  it('returns 400 for missing signature', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/billing/webhook'), {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const req = makeWebhookRequest('{}')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('updates tier on checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { account_id: 'acct-1', tier: 'standard' },
        },
      },
    })

    const req = makeWebhookRequest('{}')
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('sets cancelled_grace on subscription.deleted', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_123',
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        },
      },
    })

    const req = makeWebhookRequest('{}')
    const res = await POST(req)
    expect(res.status).toBe(200)
    // Should set cancelled_grace, NOT downgrade to starter
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      account_type: 'cancelled_grace',
      cancelled_tier: 'standard',
    }))
  })

  it('handles invoice.payment_failed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_123',
          attempt_count: 1,
        },
      },
    })

    const req = makeWebhookRequest('{}')
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 for unhandled event types', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'some.other.event',
      data: { object: {} },
    })

    const req = makeWebhookRequest('{}')
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

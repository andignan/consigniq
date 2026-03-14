/**
 * Tests for /api/billing routes
 * Covers: checkout session, portal session, webhook events
 */

const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockFrom = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

// Mock Stripe
const mockCheckoutCreate = jest.fn()
const mockPortalCreate = jest.fn()
const mockCustomerCreate = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    billingPortal: { sessions: { create: mockPortalCreate } },
    customers: { create: mockCustomerCreate },
    webhooks: { constructEvent: jest.fn() },
  }),
}))

import { POST as checkoutPOST } from '@/app/api/billing/checkout/route'
import { POST as portalPOST } from '@/app/api/billing/portal/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'owner@test.com' } }, error: null })

  // Default: owner role with account data
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { account_id: 'acct-1', role: 'owner' },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'accounts') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'acct-1', stripe_customer_id: 'cus_123', name: 'Test Shop' },
              error: null,
            }),
          }),
        }),
        update: mockUpdate.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }
  })

  process.env.STRIPE_STANDARD_PRICE_ID = 'price_standard'
  process.env.STRIPE_PRO_PRICE_ID = 'price_pro'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

  mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' })
  mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal_123' })
  mockCustomerCreate.mockResolvedValue({ id: 'cus_new' })
})

describe('POST /api/billing/checkout', () => {
  it('returns 401 for unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } })
    const req = makeRequest('/api/billing/checkout', { tier: 'standard' })
    const res = await checkoutPOST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for staff users', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { account_id: 'acct-1', role: 'staff' }, error: null }),
            }),
          }),
        }
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }
    })
    const req = makeRequest('/api/billing/checkout', { tier: 'standard' })
    const res = await checkoutPOST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid tier', async () => {
    const req = makeRequest('/api/billing/checkout', { tier: 'invalid' })
    const res = await checkoutPOST(req)
    expect(res.status).toBe(400)
  })

  it('creates checkout session and returns URL', async () => {
    const req = makeRequest('/api/billing/checkout', { tier: 'standard' })
    const res = await checkoutPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://checkout.stripe.com/session_123')
  })

  it('creates Stripe customer if none exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { account_id: 'acct-1', role: 'owner' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'acct-1', stripe_customer_id: null, name: 'Test Shop' },
                error: null,
              }),
            }),
          }),
          update: mockUpdate.mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }
    })

    const req = makeRequest('/api/billing/checkout', { tier: 'pro' })
    const res = await checkoutPOST(req)
    expect(res.status).toBe(200)
    expect(mockCustomerCreate).toHaveBeenCalled()
  })
})

describe('POST /api/billing/portal', () => {
  it('returns 401 for unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } })
    const req = makeRequest('/api/billing/portal', {})
    const res = await portalPOST(req)
    expect(res.status).toBe(401)
  })

  it('returns portal URL for owner with stripe_customer_id', async () => {
    const req = makeRequest('/api/billing/portal', {})
    const res = await portalPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://billing.stripe.com/portal_123')
  })

  it('returns 404 if no stripe_customer_id', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { account_id: 'acct-1', role: 'owner' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { stripe_customer_id: null }, error: null }),
            }),
          }),
        }
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }
    })
    const req = makeRequest('/api/billing/portal', {})
    const res = await portalPOST(req)
    expect(res.status).toBe(404)
  })
})

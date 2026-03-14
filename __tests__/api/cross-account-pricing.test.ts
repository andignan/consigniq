/**
 * Tests for /api/pricing/cross-account route
 * Covers: GET (cross-account market intelligence), auth, tier enforcement, three-level matching
 */

const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockIlike = jest.fn()
const mockNot = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

import { GET } from '@/app/api/pricing/cross-account/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

// Generate mock sold records for testing
function makeSoldRecords(count: number, basePrice = 100) {
  return Array.from({ length: count }, (_, i) => ({
    sold_price: basePrice + i * 10,
    days_to_sell: 5 + i,
    sold: true,
  }))
}

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.ANTHROPIC_API_KEY

  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      ilike: mockIlike,
      not: mockNot,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockIlike.mockReturnValue(defaultChain)
  mockNot.mockReturnValue(defaultChain)

  // Profile lookup — default pro tier
  mockSingle.mockResolvedValue({
    data: { account_id: 'acc-1', accounts: { tier: 'pro' } },
    error: null,
  })

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('GET /api/pricing/cross-account', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 if profile not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns 403 for non-Pro tier (starter)', async () => {
    mockSingle.mockResolvedValue({
      data: { account_id: 'acc-1', accounts: { tier: 'starter' } },
      error: null,
    })
    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 for standard tier', async () => {
    mockSingle.mockResolvedValue({
      data: { account_id: 'acc-1', accounts: { tier: 'standard' } },
      error: null,
    })
    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 if category is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/pricing/cross-account')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns stats with category-level fallback when enough data', async () => {
    // Mock the chain to return data for category-level query
    const records = makeSoldRecords(5)
    const chainWithData = {
      eq: mockEq,
      ilike: mockIlike,
      not: mockNot,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: records, error: null }).then(resolve)),
    }
    // After all eq/not chains, resolve with data
    mockNot.mockReturnValue(chainWithData)

    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats).toBeTruthy()
    expect(body.stats.sample_count).toBe(5)
    expect(body.stats.match_level).toBe('category')
    expect(body.stats.avg_sold_price).toBeGreaterThan(0)
  })

  it('returns null stats when insufficient data (<3 samples)', async () => {
    // Return only 2 records — below threshold
    const records = makeSoldRecords(2)
    const chainWithData = {
      eq: mockEq,
      ilike: mockIlike,
      not: mockNot,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: records, error: null }).then(resolve)),
    }
    mockNot.mockReturnValue(chainWithData)

    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats).toBeNull()
  })

  it('queries price_history for cross-account data (no account_id filter)', async () => {
    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture&name=Oak+Table&condition=good')
    await GET(req)
    expect(mockFrom).toHaveBeenCalledWith('price_history')
    // Should NOT filter by account_id — this is cross-account
    const accountIdCalls = mockEq.mock.calls.filter(
      (call: unknown[]) => call[0] === 'account_id'
    )
    // The only account_id call should be for the users table profile lookup
    expect(accountIdCalls.length).toBe(0)
  })

  it('uses ilike for name matching', async () => {
    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture&name=Oak+Table&condition=good')
    await GET(req)
    // Should have ilike calls for name matching
    expect(mockIlike).toHaveBeenCalled()
  })

  it('returns stats with correct shape matching cross_account_pricing_stats view columns', async () => {
    // After migration 20260314050000, priced_at and sold_at are timestamptz.
    // The API computes the same aggregations as the cross_account_pricing_stats view:
    // sample_count, avg_sold_price, min_sold_price, max_sold_price, median_sold_price,
    // avg_days_to_sell, sold_count, unsold_count, match_level
    const records = makeSoldRecords(5, 80)
    const chainWithData = {
      eq: mockEq,
      ilike: mockIlike,
      not: mockNot,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: records, error: null }).then(resolve)),
    }
    mockNot.mockReturnValue(chainWithData)

    const req = makeRequest('http://localhost:3000/api/pricing/cross-account?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const stats = body.stats

    // Verify all fields that mirror the view exist and have correct types
    expect(typeof stats.sample_count).toBe('number')
    expect(typeof stats.avg_sold_price).toBe('number')
    expect(typeof stats.min_sold_price).toBe('number')
    expect(typeof stats.max_sold_price).toBe('number')
    expect(typeof stats.median_sold_price).toBe('number')
    expect(typeof stats.sold_count).toBe('number')
    expect(typeof stats.unsold_count).toBe('number')
    expect(['exact', 'fuzzy', 'category']).toContain(stats.match_level)

    // Verify computed values are correct
    expect(stats.sample_count).toBe(5)
    expect(stats.min_sold_price).toBe(80)   // base price
    expect(stats.max_sold_price).toBe(120)  // 80 + 4*10
    expect(stats.avg_sold_price).toBe(100)  // (80+90+100+110+120)/5
    expect(stats.median_sold_price).toBe(100) // middle of 5 sorted values
    expect(stats.sold_count).toBe(5)
    expect(stats.unsold_count).toBe(0)
    // avg_days_to_sell: (5+6+7+8+9)/5 = 7
    expect(stats.avg_days_to_sell).toBe(7)
  })
})

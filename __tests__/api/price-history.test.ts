/**
 * Tests for /api/price-history route
 * Covers: GET (similar items lookup), auth, validation, name+category search
 */

const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockNeq = jest.fn()
const mockIlike = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
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

import { GET } from '@/app/api/price-history/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

beforeEach(() => {
  jest.clearAllMocks()

  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      neq: mockNeq,
      ilike: mockIlike,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockNeq.mockReturnValue(defaultChain)
  mockIlike.mockReturnValue(defaultChain)
  mockOrder.mockReturnValue(defaultChain)
  mockLimit.mockReturnValue(defaultChain)

  // Profile lookup
  mockSingle.mockResolvedValue({
    data: { account_id: 'acc-1' },
    error: null,
  })

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('GET /api/price-history', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 if profile not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns 400 if category is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns history for category search', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('history')
    expect(mockFrom).toHaveBeenCalledWith('price_history')
    expect(mockEq).toHaveBeenCalledWith('category', 'Furniture')
    expect(mockEq).toHaveBeenCalledWith('sold', true)
  })

  it('uses ilike search when name is provided', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture&name=Oak+Table')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockIlike).toHaveBeenCalledWith('name', '%Oak Table%')
  })

  it('excludes item by exclude_item_id', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture&exclude_item_id=item-99')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockNeq).toHaveBeenCalledWith('item_id', 'item-99')
  })

  it('respects limit parameter capped at 50', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture&limit=100')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockLimit).toHaveBeenCalledWith(50)
  })

  it('defaults limit to 10', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockLimit).toHaveBeenCalledWith(10)
  })

  it('scopes results to the authenticated user account_id only', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    // Verify query is scoped to user's account
    expect(mockEq).toHaveBeenCalledWith('account_id', 'acc-1')
  })

  it('returns empty history array when no matches found', async () => {
    const req = makeRequest('http://localhost:3000/api/price-history?category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.history).toEqual([])
  })
})

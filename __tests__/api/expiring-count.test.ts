/**
 * Tests for /api/consignors/expiring-count
 * I1: Single-query replacement for N+1 sidebar fetches
 */

const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockNeq = jest.fn()
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

import { GET } from '@/app/api/consignors/expiring-count/route'
import { NextRequest } from 'next/server'

function makeRequest(params?: string): NextRequest {
  const url = params
    ? `http://localhost:3000/api/consignors/expiring-count?${params}`
    : 'http://localhost:3000/api/consignors/expiring-count'
  return new NextRequest(new URL(url))
}

beforeEach(() => {
  jest.clearAllMocks()

  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      neq: mockNeq,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockNeq.mockReturnValue(defaultChain)

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockSingle.mockResolvedValue({ data: { account_id: 'acc-1' }, error: null })
})

describe('GET /api/consignors/expiring-count', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 404 if no profile', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const res = await GET(makeRequest())
    expect(res.status).toBe(404)
  })

  it('returns count: 0 when no consignors', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(0)
  })

  it('queries by account_id without location filter', async () => {
    await GET(makeRequest())
    expect(mockFrom).toHaveBeenCalledWith('consignors')
    expect(mockEq).toHaveBeenCalledWith('account_id', 'acc-1')
    expect(mockNeq).toHaveBeenCalledWith('status', 'closed')
  })

  it('adds location_id filter when provided', async () => {
    await GET(makeRequest('location_id=loc-1'))
    expect(mockEq).toHaveBeenCalledWith('location_id', 'loc-1')
  })

  it('counts consignors expiring within 7 days', async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threeDays = new Date(today)
    threeDays.setDate(today.getDate() + 3)
    const thirtyDays = new Date(today)
    thirtyDays.setDate(today.getDate() + 30)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const graceFuture = new Date(today)
    graceFuture.setDate(today.getDate() + 14)

    const consignors = [
      // Expiring in 3 days — should count
      { expiry_date: threeDays.toISOString().slice(0, 10), grace_end_date: graceFuture.toISOString().slice(0, 10), status: 'active' },
      // Expiring in 30 days — should NOT count
      { expiry_date: thirtyDays.toISOString().slice(0, 10), grace_end_date: graceFuture.toISOString().slice(0, 10), status: 'active' },
      // Expired yesterday, in grace — should count
      { expiry_date: yesterday.toISOString().slice(0, 10), grace_end_date: graceFuture.toISOString().slice(0, 10), status: 'active' },
    ]

    const chainWithData = {
      eq: mockEq,
      neq: mockNeq,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: consignors, error: null }).then(resolve)),
    }
    mockNeq.mockReturnValue(chainWithData)
    mockEq.mockReturnValue(chainWithData)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(2)
  })
})

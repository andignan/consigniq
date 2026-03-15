/**
 * Tests for /api/payouts route
 * Covers: GET (payout list with split calculations), PATCH (mark as paid), auth, filters
 */

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockIn = jest.fn()
const mockIs = jest.fn()
const mockNot = jest.fn()
const mockOrder = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

import { GET, PATCH } from '@/app/api/payouts/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

beforeEach(() => {
  jest.clearAllMocks()

  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      not: mockNot,
      order: mockOrder,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockIn.mockReturnValue(defaultChain)
  mockIs.mockReturnValue(defaultChain)
  mockNot.mockReturnValue(defaultChain)
  mockOrder.mockReturnValue(defaultChain)

  // Profile lookup (includes tier for tier gate checks)
  mockSingle.mockResolvedValue({
    data: { account_id: 'acc-1', role: 'owner', accounts: { tier: 'starter' } },
    error: null,
  })

  // Update chain for PATCH
  mockUpdate.mockReturnValue({
    in: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn((resolve) => Promise.resolve({ data: [{ id: 'item-1' }], error: null }).then(resolve)),
        }),
      }),
    }),
  })

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('GET /api/payouts', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/payouts')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 if profile not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const req = makeRequest('http://localhost:3000/api/payouts')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns empty payouts when no consignors', async () => {
    const req = makeRequest('http://localhost:3000/api/payouts?location_id=loc-1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payouts).toEqual([])
  })

  it('returns payouts with split calculations', async () => {
    // First call: profile lookup (single)
    mockSingle.mockResolvedValue({
      data: { account_id: 'acc-1', role: 'owner' },
      error: null,
    })

    // Consignors query
    const consignors = [
      { id: 'con-1', name: 'Jane Doe', split_store: 40, split_consignor: 60, status: 'active', phone: null, email: null },
    ]
    // Items query
    const items = [
      { id: 'item-1', consignor_id: 'con-1', name: 'Oak Table', sold_price: 100, sold_date: '2026-03-10', price: 100, paid_at: null, payout_note: null, category: 'Furniture' },
      { id: 'item-2', consignor_id: 'con-1', name: 'Chair', sold_price: 50, sold_date: '2026-03-11', price: 50, paid_at: null, payout_note: null, category: 'Furniture' },
    ]

    // Chain returns: first call returns consignors, second returns items
    let callCount = 0
    const makeChainableWithData = (data: unknown) => {
      const obj: Record<string, jest.Mock | Promise<unknown>> = {
        eq: mockEq,
        in: mockIn,
        is: mockIs,
        not: mockNot,
        order: mockOrder,
        single: mockSingle,
        then: jest.fn((resolve) => Promise.resolve({ data, error: null }).then(resolve)),
      }
      return obj
    }

    // Override select to return different data on sequential calls
    mockSelect.mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        // Consignors query (select + eq chains)
        return makeChainableWithData(consignors)
      }
      // Items query
      return makeChainableWithData(items)
    })
    mockEq.mockImplementation(() => {
      if (callCount <= 2) {
        return makeChainableWithData(consignors)
      }
      return makeChainableWithData(items)
    })
    mockIn.mockReturnValue(makeChainableWithData(items))
    mockIs.mockReturnValue(makeChainableWithData(items))

    const req = makeRequest('http://localhost:3000/api/payouts?location_id=loc-1&status=unpaid')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payouts).toBeDefined()
  })

  it('filters by location_id', async () => {
    const req = makeRequest('http://localhost:3000/api/payouts?location_id=loc-1')
    await GET(req)
    expect(mockEq).toHaveBeenCalledWith('location_id', 'loc-1')
  })

  it('filters by unpaid status', async () => {
    // Need consignors to exist so items query is reached
    const consignors = [{ id: 'con-1', name: 'Test', split_store: 50, split_consignor: 50, status: 'active', phone: null, email: null }]
    const chainWithConsignors: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      not: mockNot,
      order: mockOrder,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: consignors, error: null }).then(resolve)),
    }
    mockSelect.mockReturnValue(chainWithConsignors)
    mockEq.mockReturnValue(chainWithConsignors)
    // Items query returns via in -> is/not chain
    const itemsChain: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      not: mockNot,
      then: jest.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
    }
    mockIn.mockReturnValue(itemsChain)
    mockIs.mockReturnValue(itemsChain)

    const req = makeRequest('http://localhost:3000/api/payouts?location_id=loc-1&status=unpaid')
    await GET(req)
    expect(mockIs).toHaveBeenCalledWith('paid_at', null)
  })

  it('filters by paid status', async () => {
    const consignors = [{ id: 'con-1', name: 'Test', split_store: 50, split_consignor: 50, status: 'active', phone: null, email: null }]
    const chainWithConsignors: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      not: mockNot,
      order: mockOrder,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: consignors, error: null }).then(resolve)),
    }
    mockSelect.mockReturnValue(chainWithConsignors)
    mockEq.mockReturnValue(chainWithConsignors)
    const itemsChain: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      not: mockNot,
      then: jest.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
    }
    mockIn.mockReturnValue(itemsChain)
    mockNot.mockReturnValue(itemsChain)

    const req = makeRequest('http://localhost:3000/api/payouts?location_id=loc-1&status=paid')
    await GET(req)
    expect(mockNot).toHaveBeenCalledWith('paid_at', 'is', null)
  })
})

describe('PATCH /api/payouts', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/payouts', {
      method: 'PATCH',
      body: JSON.stringify({ item_ids: ['item-1'] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 if item_ids missing', async () => {
    const req = makeRequest('http://localhost:3000/api/payouts', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 if item_ids is empty array', async () => {
    const req = makeRequest('http://localhost:3000/api/payouts', {
      method: 'PATCH',
      body: JSON.stringify({ item_ids: [] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('marks items as paid with timestamp', async () => {
    const req = makeRequest('http://localhost:3000/api/payouts', {
      method: 'PATCH',
      body: JSON.stringify({ item_ids: ['item-1', 'item-2'], payout_note: 'Check #123' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        paid_at: expect.any(String),
        payout_note: 'Check #123',
      })
    )
  })

  it('marks items as paid without note', async () => {
    const req = makeRequest('http://localhost:3000/api/payouts', {
      method: 'PATCH',
      body: JSON.stringify({ item_ids: ['item-1'] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.paid_at).toBeDefined()
    expect(updateArg.payout_note).toBeUndefined()
  })
})

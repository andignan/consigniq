/**
 * Tests for /api/items route
 * Covers: GET (list, single, filters), POST (create), PATCH (update with auto-timestamps)
 */

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockIlike = jest.fn()
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

import { GET, POST, PATCH } from '@/app/api/items/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

beforeEach(() => {
  jest.clearAllMocks()

  // GET chain: from().select().order() returns a query that can chain .eq/.ilike and is awaitable
  // The Supabase query builder is both chainable and thenable
  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      ilike: mockIlike,
      order: mockOrder,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockOrder.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockIlike.mockReturnValue(defaultChain)
  mockSingle.mockResolvedValue({ data: { id: 'item-1', name: 'Test Item' }, error: null })

  // POST chain: from().insert().select().single()
  mockInsert.mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: { id: 'new-item' }, error: null }),
    }),
  })

  // PATCH chain: from().update().eq().select().single()
  mockUpdate.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'item-1', status: 'sold' }, error: null }),
      }),
    }),
  })

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('GET /api/items', () => {
  it('fetches single item by id', async () => {
    const req = makeRequest('http://localhost:3000/api/items?id=item-1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].id).toBe('item-1')
  })

  it('lists items with optional filters', async () => {
    const req = makeRequest('http://localhost:3000/api/items?location_id=loc-1&status=priced&category=Furniture')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('location_id', 'loc-1')
  })

  it('supports search filter', async () => {
    const req = makeRequest('http://localhost:3000/api/items?search=dining+table')
    await GET(req)
    expect(mockIlike).toHaveBeenCalledWith('name', '%dining table%')
  })

  it('returns 404 if single item not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const req = makeRequest('http://localhost:3000/api/items?id=nonexistent')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/items', () => {
  const validBody = {
    account_id: 'acc-1',
    location_id: 'loc-1',
    consignor_id: 'con-1',
    name: 'Oak Table',
    category: 'Furniture',
    condition: 'good',
  }

  it('creates an item with valid data', async () => {
    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 if required fields missing', async () => {
    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Only name' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })

    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('sets default status to pending', async () => {
    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    await POST(req)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    )
  })
})

describe('PATCH /api/items', () => {
  it('returns 400 if id is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'sold' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('auto-sets sold_date when status is sold', async () => {
    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'item-1', status: 'sold', sold_price: 50 }),
    })
    await PATCH(req)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ sold_date: expect.any(String) })
    )
  })

  it('auto-sets donated_at when status is donated', async () => {
    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'item-1', status: 'donated' }),
    })
    await PATCH(req)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ donated_at: expect.any(String) })
    )
  })

  it('auto-sets priced_at and status when price is set', async () => {
    const req = makeRequest('http://localhost:3000/api/items', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'item-1', price: 25 }),
    })
    await PATCH(req)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ priced_at: expect.any(String), status: 'priced' })
    )
  })
})

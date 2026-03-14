/**
 * Tests for /api/locations route
 * Covers: GET (list locations), POST (create location), role enforcement
 */

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

import { GET, POST } from '@/app/api/locations/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

beforeEach(() => {
  jest.clearAllMocks()

  // GET chain: from().select().eq().order()
  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockOrder.mockReturnValue(defaultChain)

  // Profile lookup: from('users').select().eq().single()
  mockSingle.mockResolvedValue({
    data: { account_id: 'acc-1', role: 'owner' },
    error: null,
  })

  // POST chain: from().insert().select().single()
  mockInsert.mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'loc-new', name: 'New Location', account_id: 'acc-1' },
        error: null,
      }),
    }),
  })

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('GET /api/locations', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/locations')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 404 if profile not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const req = makeRequest('http://localhost:3000/api/locations')
    const res = await GET()
    expect(res.status).toBe(404)
  })

  it('returns locations for authenticated user', async () => {
    const req = makeRequest('http://localhost:3000/api/locations')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockFrom).toHaveBeenCalledWith('locations')
  })
})

describe('POST /api/locations', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/locations', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Location' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 if not owner', async () => {
    mockSingle.mockResolvedValue({
      data: { account_id: 'acc-1', role: 'staff' },
      error: null,
    })
    const req = makeRequest('http://localhost:3000/api/locations', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Location' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 if name is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/locations', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates location with valid data', async () => {
    const req = makeRequest('http://localhost:3000/api/locations', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Downtown Store',
        city: 'Chicago',
        state: 'IL',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Downtown Store',
        account_id: 'acc-1',
        city: 'Chicago',
        state: 'IL',
        default_split_store: 60,
        default_split_consignor: 40,
        agreement_days: 60,
        grace_days: 3,
      })
    )
  })

  it('uses custom split values when provided', async () => {
    const req = makeRequest('http://localhost:3000/api/locations', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Custom Store',
        default_split_store: 70,
        default_split_consignor: 30,
        agreement_days: 90,
        grace_days: 7,
        markdown_enabled: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        default_split_store: 70,
        default_split_consignor: 30,
        agreement_days: 90,
        grace_days: 7,
        markdown_enabled: true,
      })
    )
  })
})

/**
 * Tests for /api/consignors route
 * Covers: GET (list by location), POST (create), validation, auth scoping
 */

// Mock Supabase server client
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

import { GET, POST } from '@/app/api/consignors/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default chain: from().select().eq().order()
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ order: mockOrder })
  mockOrder.mockResolvedValue({ data: [], error: null })
  // Insert chain: from().insert().select().single()
  mockInsert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) })
  mockSingle.mockResolvedValue({ data: { id: 'new-id' }, error: null })
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('GET /api/consignors', () => {
  it('returns 400 if location_id is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/consignors')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('location_id')
  })

  it('returns consignors for a valid location_id', async () => {
    const mockData = [{ id: 'c1', name: 'Jane Doe' }]
    mockOrder.mockResolvedValue({ data: mockData, error: null })

    const req = makeRequest('http://localhost:3000/api/consignors?location_id=loc-1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.consignors).toEqual(mockData)
    expect(mockEq).toHaveBeenCalledWith('location_id', 'loc-1')
  })

  it('returns 500 on database error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const req = makeRequest('http://localhost:3000/api/consignors?location_id=loc-1')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/consignors', () => {
  const validBody = {
    account_id: 'acc-1',
    location_id: 'loc-1',
    name: 'Test Consignor',
    intake_date: '2026-03-01',
    expiry_date: '2026-04-30',
    grace_end_date: '2026-05-03',
    split_store: 60,
    split_consignor: 40,
  }

  it('creates a consignor with valid data', async () => {
    const req = makeRequest('http://localhost:3000/api/consignors', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.consignor).toHaveProperty('id')
  })

  it('returns 400 if required fields are missing', async () => {
    const req = makeRequest('http://localhost:3000/api/consignors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Only name' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('required')
  })

  it('returns 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })

    const req = makeRequest('http://localhost:3000/api/consignors', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('attaches created_by from authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-42' } }, error: null })

    const req = makeRequest('http://localhost:3000/api/consignors', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    await POST(req)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'user-42' })
    )
  })
})

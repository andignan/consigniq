/**
 * Tests for /api/settings/* routes
 * Covers: role-based access (owner vs staff), account scoping, input validation
 */

const mockSelect = jest.fn()
const mockUpdate = jest.fn()
const mockInsert = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockGetUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

import { GET as getLocation, PATCH as patchLocation } from '@/app/api/settings/location/route'
import { GET as getAccount, PATCH as patchAccount } from '@/app/api/settings/account/route'
import { POST as postInvite } from '@/app/api/settings/invite/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

function setupAuth(userId: string, role: 'owner' | 'staff') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })

  // When from('users').select().eq().single() is called for profile
  const profileChain = {
    single: jest.fn().mockResolvedValue({
      data: { role, account_id: 'acc-1' },
      error: null,
    }),
  }
  const eqChain = { ...profileChain, eq: jest.fn().mockReturnValue(profileChain) }

  // Track calls to differentiate tables
  mockSelect.mockImplementation(() => ({
    eq: jest.fn().mockReturnValue(eqChain),
    single: mockSingle,
    order: mockOrder,
  }))
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSingle.mockResolvedValue({ data: {}, error: null })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockLimit.mockResolvedValue({ data: [], error: null })
})

describe('GET /api/settings/location', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/settings/location?location_id=loc-1')
    const res = await getLocation(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 if location_id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const req = makeRequest('http://localhost:3000/api/settings/location')
    const res = await getLocation(req)
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/settings/location', () => {
  it('returns 403 if user is staff', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    // First call to from('users') for profile check
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { role: 'staff', account_id: 'acc-1' },
          error: null,
        }),
      }),
    })

    const req = makeRequest('http://localhost:3000/api/settings/location', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'loc-1', name: 'New Name' }),
    })
    const res = await patchLocation(req)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/settings/account', () => {
  it('returns 403 if user is staff', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { role: 'staff', account_id: 'acc-1' },
          error: null,
        }),
      }),
    })

    const res = await getAccount()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/settings/invite', () => {
  it('returns 400 if email or role missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { role: 'owner', account_id: 'acc-1' },
          error: null,
        }),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    const req = new Request('http://localhost:3000/api/settings/invite', {
      method: 'POST',
      body: JSON.stringify({ email: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postInvite(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { role: 'owner', account_id: 'acc-1' },
          error: null,
        }),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    const req = new Request('http://localhost:3000/api/settings/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', role: 'admin' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postInvite(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 if user is staff', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { role: 'staff', account_id: 'acc-1' },
          error: null,
        }),
      }),
    })

    const req = new Request('http://localhost:3000/api/settings/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', role: 'staff' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postInvite(req)
    expect(res.status).toBe(403)
  })
})

/**
 * Tests for /api/admin/users — admin user management
 */

// Mock supabase admin
const mockSupabaseFrom = jest.fn()
const mockSupabaseAuth = {
  admin: {
    createUser: jest.fn(),
  },
}
const mockCheckSuperadmin = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  checkSuperadmin: (...args: unknown[]) => mockCheckSuperadmin(...args),
  createAdminClient: () => ({
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth,
  }),
}))

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/admin/users/route'

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

describe('GET /api/admin/users', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 for unauthenticated request', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 401 })
    const res = await GET(makeRequest('/api/admin/users'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-superadmin', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 403 })
    const res = await GET(makeRequest('/api/admin/users'))
    expect(res.status).toBe(403)
  })

  it('returns users list for superadmin', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })
    const mockUsers = [
      { id: 'u1', email: 'test@test.com', full_name: 'Test', role: 'owner', accounts: { name: 'Acme', tier: 'starter', account_type: 'paid' } },
    ]

    function makeThenableQuery(data: unknown[]) {
      const result = { data, error: null }
      const obj: Record<string, unknown> = {
        or: jest.fn().mockImplementation(() => makeThenableQuery(data)),
        then: (resolve: (v: unknown) => void, reject?: (v: unknown) => void) => Promise.resolve(result).then(resolve, reject),
      }
      return obj
    }

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(makeThenableQuery(mockUsers)),
      }),
    })

    const res = await GET(makeRequest('/api/admin/users'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toHaveLength(1)
    expect(body.users[0].email).toBe('test@test.com')
  })

  it('supports search filter', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })

    function makeThenableQuery(data: unknown[]) {
      const result = { data, error: null }
      const obj: Record<string, unknown> = {
        or: jest.fn().mockImplementation(() => makeThenableQuery(data)),
        then: (resolve: (v: unknown) => void, reject?: (v: unknown) => void) => Promise.resolve(result).then(resolve, reject),
      }
      return obj
    }

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(makeThenableQuery([])),
      }),
    })

    const res = await GET(makeRequest('/api/admin/users?search=test'))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/admin/users', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 for unauthenticated', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 401 })
    const res = await POST(makeRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', full_name: 'A', account_name: 'X', tier: 'solo', account_type: 'trial' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing required fields', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })
    const res = await POST(makeRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com' }), // missing full_name, account_name, tier, account_type
    }))
    expect(res.status).toBe(400)
  })

  it('creates account, location, auth user, and users row', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })

    // Mock account insert
    const accountInsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'acc1' }, error: null }),
      }),
    })

    // Mock location insert
    const locationInsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'loc1' }, error: null }),
      }),
    })

    // Mock users insert
    const usersInsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'usr1' }, error: null }),
      }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') return { insert: accountInsertMock }
      if (table === 'locations') return { insert: locationInsertMock }
      if (table === 'users') return { upsert: usersInsertMock }
      return {}
    })

    mockSupabaseAuth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'auth-u1' } },
      error: null,
    })

    const res = await POST(makeRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'new@test.com',
        full_name: 'New User',
        account_name: 'New Shop',
        tier: 'starter',
        account_type: 'trial',
      }),
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.account.id).toBe('acc1')
    expect(body.location.id).toBe('loc1')
    expect(body.user.id).toBe('usr1')

    // Verify account created with trial fields
    expect(accountInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Shop',
        tier: 'starter',
        account_type: 'trial',
      })
    )
  })

  it('sets is_complimentary for complimentary accounts', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })

    const accountInsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'acc1' }, error: null }),
      }),
    })
    const locationInsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'loc1' }, error: null }),
      }),
    })
    const usersInsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'usr1' }, error: null }),
      }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') return { insert: accountInsertMock }
      if (table === 'locations') return { insert: locationInsertMock }
      if (table === 'users') return { upsert: usersInsertMock }
      return {}
    })

    mockSupabaseAuth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'auth-u2' } },
      error: null,
    })

    const res = await POST(makeRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'comp@test.com',
        full_name: 'Comp User',
        account_name: 'Comp Shop',
        tier: 'solo',
        account_type: 'complimentary',
        complimentary_tier: 'pro',
      }),
    }))

    expect(res.status).toBe(201)
    expect(accountInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account_type: 'complimentary',
        is_complimentary: true,
        complimentary_tier: 'pro',
      })
    )
  })
})

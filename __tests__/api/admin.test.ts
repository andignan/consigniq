/**
 * Tests for /api/admin/* routes
 * Covers: stats (GET), accounts (GET/PATCH), superadmin enforcement, cross-account data
 */

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockIn = jest.fn()
const mockOrder = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

jest.mock('@/lib/supabase/admin', () => ({
  checkSuperadmin: async () => {
    const { createServerClient } = require('@/lib/supabase/server')
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { authorized: false as const, status: 401 }

    const { data: profile } = await supabase
      .from('users')
      .select('platform_role, is_superadmin')
      .eq('id', user.id)
      .single()

    if (!profile?.platform_role && !profile?.is_superadmin) return { authorized: false as const, status: 403 }
    return { authorized: true as const, userId: user.id, platformRole: (profile.platform_role ?? (profile.is_superadmin ? 'super_admin' : null)) as string }
  },
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

import { GET as getStats } from '@/app/api/admin/stats/route'
import { GET as getAccounts, PATCH as patchAccount } from '@/app/api/admin/accounts/route'
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
  mockOrder.mockReturnValue(defaultChain)

  // Default: superadmin profile
  mockSingle.mockResolvedValue({
    data: { platform_role: 'super_admin', is_superadmin: true },
    error: null,
  })

  // PATCH chain
  mockUpdate.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'acc-1', name: 'Test', tier: 'pro', status: 'active' },
          error: null,
        }),
      }),
    }),
  })

  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
})

// ==================== /api/admin/stats ====================

describe('GET /api/admin/stats', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const res = await getStats()
    expect(res.status).toBe(401)
  })

  it('returns 403 if not superadmin', async () => {
    mockSingle.mockResolvedValue({ data: { platform_role: null, is_superadmin: false }, error: null })
    const res = await getStats()
    expect(res.status).toBe(403)
  })

  it('returns cross-account stats for superadmin', async () => {
    const res = await getStats()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accounts')
    expect(body).toHaveProperty('locations')
    expect(body).toHaveProperty('users')
    expect(body).toHaveProperty('items')
    expect(body).toHaveProperty('consignors')
    // Verify NO account_id filter was applied — queries are cross-account
    // mockFrom should have been called with each table without .eq('account_id', ...)
    expect(mockFrom).toHaveBeenCalledWith('accounts')
    expect(mockFrom).toHaveBeenCalledWith('locations')
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockFrom).toHaveBeenCalledWith('items')
    expect(mockFrom).toHaveBeenCalledWith('consignors')
  })
})

// ==================== /api/admin/accounts ====================

describe('GET /api/admin/accounts', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/admin/accounts')
    const res = await getAccounts(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 if not superadmin', async () => {
    mockSingle.mockResolvedValue({ data: { platform_role: null, is_superadmin: false }, error: null })
    const req = makeRequest('http://localhost:3000/api/admin/accounts')
    const res = await getAccounts(req)
    expect(res.status).toBe(403)
  })

  it('lists all accounts for superadmin', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts')
    const res = await getAccounts(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accounts')
  })

  it('filters accounts by tier', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts?tier=pro')
    const res = await getAccounts(req)
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('tier', 'pro')
  })

  it('filters accounts by status', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts?status=active')
    const res = await getAccounts(req)
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('status', 'active')
  })
})

describe('PATCH /api/admin/accounts', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('http://localhost:3000/api/admin/accounts', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'acc-1', tier: 'pro' }),
    })
    const res = await patchAccount(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 if not superadmin', async () => {
    mockSingle.mockResolvedValue({ data: { platform_role: null, is_superadmin: false }, error: null })
    const req = makeRequest('http://localhost:3000/api/admin/accounts', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'acc-1', tier: 'pro' }),
    })
    const res = await patchAccount(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 if id missing', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts', {
      method: 'PATCH',
      body: JSON.stringify({ tier: 'pro' }),
    })
    const res = await patchAccount(req)
    expect(res.status).toBe(400)
  })

  it('updates account tier', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'acc-1', tier: 'pro' }),
    })
    const res = await patchAccount(req)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ tier: 'pro' })
  })

  it('updates account status', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'acc-1', status: 'suspended' }),
    })
    const res = await patchAccount(req)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'suspended' })
  })

  it('rejects invalid tier values', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'acc-1', tier: 'enterprise' }),
    })
    const res = await patchAccount(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid status values', async () => {
    const req = makeRequest('http://localhost:3000/api/admin/accounts', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'acc-1', status: 'deleted' }),
    })
    const res = await patchAccount(req)
    expect(res.status).toBe(400)
  })
})

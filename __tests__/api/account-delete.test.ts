/**
 * Tests for POST /api/admin/accounts/delete
 * Covers: auth, validation, complimentary/trial hard delete, paid soft delete
 */

const mockSelect = jest.fn()
const mockDelete = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()
const mockDeleteUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  delete: mockDelete,
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
    const { data: profile } = await supabase.from('users').select('platform_role').eq('id', user.id).single()
    if (!profile?.platform_role) return { authorized: false as const, status: 403 }
    return { authorized: true as const, userId: user.id, platformRole: profile.platform_role as string }
  },
  createAdminClient: () => ({
    from: mockFrom,
    auth: { admin: { deleteUser: mockDeleteUser } },
  }),
}))

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}))

jest.mock('@/lib/email-templates', () => ({
  buildAccountDeletedEmail: () => ({ subject: 'Test', text: 'Test', html: '<p>Test</p>' }),
}))

import { POST } from '@/app/api/admin/accounts/delete/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/admin/accounts/delete'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()

  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      single: mockSingle,
      in: jest.fn().mockReturnValue({ then: jest.fn((r) => Promise.resolve(resolveWith).then(r)) }),
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockDelete.mockReturnValue(defaultChain)
  mockUpdate.mockReturnValue(defaultChain)
  mockSingle.mockResolvedValue({ data: { platform_role: 'super_admin' }, error: null })
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
})

describe('POST /api/admin/accounts/delete', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const res = await POST(makeRequest({ account_id: 'acc-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 if not superadmin', async () => {
    mockSingle.mockResolvedValue({ data: { platform_role: null }, error: null })
    const res = await POST(makeRequest({ account_id: 'acc-1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 if account_id missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 if account not found', async () => {
    // Second single() call (account lookup) returns null
    mockSingle
      .mockResolvedValueOnce({ data: { platform_role: 'super_admin' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })
    const res = await POST(makeRequest({ account_id: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('hard deletes complimentary accounts', async () => {
    const account = { id: 'acc-1', name: 'Test', tier: 'shop', status: 'active', account_type: 'complimentary', stripe_customer_id: null, is_complimentary: true }
    const users = [{ id: 'user-1', email: 'test@test.com', full_name: 'Test', role: 'owner' }]

    mockSingle
      .mockResolvedValueOnce({ data: { platform_role: 'super_admin' }, error: null })
      .mockResolvedValueOnce({ data: account, error: null })

    // Users query
    const usersChain = {
      eq: jest.fn().mockReturnValue({
        then: jest.fn((r) => Promise.resolve({ data: users, error: null }).then(r)),
      }),
      then: jest.fn((r) => Promise.resolve({ data: users, error: null }).then(r)),
    }
    mockSelect.mockReturnValueOnce({ eq: mockEq, single: mockSingle })  // superadmin check
      .mockReturnValueOnce({ eq: mockEq, single: mockSingle })  // account lookup
      .mockReturnValueOnce(usersChain) // users query

    const res = await POST(makeRequest({ account_id: 'acc-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
    expect(body.soft_deleted).toBe(false)
  })
})

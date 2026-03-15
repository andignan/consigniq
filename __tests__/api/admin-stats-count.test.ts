/**
 * Tests for I3: Admin stats uses COUNT queries instead of full fetches
 * Verifies the admin/stats route uses { count: 'exact', head: true }
 */

const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
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
      .select('is_superadmin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_superadmin) return { authorized: false as const, status: 403 }
    return { authorized: true as const, userId: user.id }
  },
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

import { GET as getStats } from '@/app/api/admin/stats/route'

beforeEach(() => {
  jest.clearAllMocks()

  // Each .select('*', { count: 'exact', head: true }).eq(...) chain returns { count: N }
  const makeCountChain = (count: number) => {
    const countResult = { count, data: null, error: null }
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: jest.fn().mockReturnValue({
        then: jest.fn((resolve) => Promise.resolve(countResult).then(resolve)),
        single: mockSingle,
      }),
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(countResult).then(resolve)),
    }
    return obj
  }

  // Default: all count queries return 0
  mockSelect.mockReturnValue(makeCountChain(0))
  mockEq.mockReturnValue(makeCountChain(0))
  mockSingle.mockResolvedValue({ data: { is_superadmin: true }, error: null })
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
})

describe('GET /api/admin/stats (I3: COUNT queries)', () => {
  it('calls select with count: exact, head: true', async () => {
    await getStats()
    // Should use count-only selects, not data-fetching selects
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true })
  })

  it('returns numeric counts in response', async () => {
    const res = await getStats()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.accounts.total).toBe('number')
    expect(typeof body.locations.total).toBe('number')
    expect(typeof body.users.total).toBe('number')
    expect(typeof body.items.total).toBe('number')
    expect(typeof body.consignors.total).toBe('number')
  })

  it('includes solo in byTier breakdown', async () => {
    const res = await getStats()
    const body = await res.json()
    expect(body.accounts.byTier).toHaveProperty('solo')
    expect(body.accounts.byTier).toHaveProperty('starter')
    expect(body.accounts.byTier).toHaveProperty('standard')
    expect(body.accounts.byTier).toHaveProperty('pro')
  })
})

/**
 * Tests for /api/admin/network-stats route
 * Covers: GET (cross-account pricing network stats), superadmin enforcement
 */

const mockSelect = jest.fn()
const mockEq = jest.fn()
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

jest.mock('@/lib/supabase/admin', () => ({
  checkSuperadmin: async () => {
    const { createServerClient } = require('@/lib/supabase/server')
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { authorized: false as const, status: 401 }

    const { data: profile } = await supabase
      .from('users')
      .select('platform_role')
      .eq('id', user.id)
      .single()

    if (!profile?.platform_role) return { authorized: false as const, status: 403 }
    return { authorized: true as const, userId: user.id, platformRole: profile.platform_role as string }
  },
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

import { GET } from '@/app/api/admin/network-stats/route'

beforeEach(() => {
  jest.clearAllMocks()

  const makeChainable = (resolveWith = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | Promise<unknown>> = {
      eq: mockEq,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve(resolveWith).then(resolve)),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)

  // Default: superadmin profile
  mockSingle.mockResolvedValue({
    data: { platform_role: 'super_admin' },
    error: null,
  })

  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
})

describe('GET /api/admin/network-stats', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 if not superadmin', async () => {
    mockSingle.mockResolvedValue({ data: { platform_role: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns network stats for superadmin', async () => {
    // M7: Now uses two queries — count-only for total, sold-only for stats
    const soldRecords = [
      { category: 'Furniture', sold_price: 100, days_to_sell: 10 },
      { category: 'Furniture', sold_price: 200, days_to_sell: 5 },
      { category: 'Jewelry & Silver', sold_price: 50, days_to_sell: 3 },
    ]

    const countResult = { count: 4, data: null, error: null }
    const soldResult = { data: soldRecords, error: null }

    // Mock: users.select (superadmin check) → price_history.select (count) → price_history.select (sold)
    mockSelect
      .mockReturnValueOnce({ // superadmin check chain
        eq: mockEq,
        single: mockSingle,
        then: jest.fn((resolve) => Promise.resolve({ data: { platform_role: 'super_admin' }, error: null }).then(resolve)),
      })
      .mockReturnValueOnce({ // total count query (head:true)
        then: jest.fn((resolve) => Promise.resolve(countResult).then(resolve)),
      })
      .mockReturnValueOnce({ // sold-only query
        eq: jest.fn().mockReturnValue({
          then: jest.fn((resolve) => Promise.resolve(soldResult).then(resolve)),
        }),
        then: jest.fn((resolve) => Promise.resolve(soldResult).then(resolve)),
      })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('total_records', 4)
    expect(body).toHaveProperty('sold_items', 3)
    expect(body).toHaveProperty('top_categories')
    expect(body.top_categories).toHaveLength(2)
    expect(body.top_categories[0].category).toBe('Furniture')
    expect(body.top_categories[0].count).toBe(2)
    expect(body).toHaveProperty('avg_days_to_sell')
    expect(body.avg_days_to_sell).toBe(6)
  })

  it('fetches from price_history table', async () => {
    await GET()
    expect(mockFrom).toHaveBeenCalledWith('price_history')
  })
})

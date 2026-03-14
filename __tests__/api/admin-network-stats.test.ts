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
    data: { is_superadmin: true },
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
    mockSingle.mockResolvedValue({ data: { is_superadmin: false }, error: null })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns network stats for superadmin', async () => {
    // Mock price_history records
    const records = [
      { category: 'Furniture', sold: true, sold_price: 100, days_to_sell: 10 },
      { category: 'Furniture', sold: true, sold_price: 200, days_to_sell: 5 },
      { category: 'Jewelry & Silver', sold: true, sold_price: 50, days_to_sell: 3 },
      { category: 'Jewelry & Silver', sold: false, sold_price: null, days_to_sell: null },
    ]

    const chainWithData = {
      eq: mockEq,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: records, error: null }).then(resolve)),
    }
    // The second mockSelect call (for price_history) should return data
    mockSelect.mockReturnValueOnce({
      eq: mockEq,
      single: mockSingle,
      then: jest.fn((resolve) => Promise.resolve({ data: { is_superadmin: true }, error: null }).then(resolve)),
    }).mockReturnValueOnce(chainWithData)

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

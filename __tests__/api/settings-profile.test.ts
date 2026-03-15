/**
 * Tests for PATCH /api/settings/profile
 * Covers: auth, validation, name update
 */

const mockSelect = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
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

import { PATCH } from '@/app/api/settings/profile/route'

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/settings/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

  mockUpdate.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-1', full_name: 'Updated Name' },
          error: null,
        }),
      }),
    }),
  })
})

describe('PATCH /api/settings/profile', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const res = await PATCH(makeRequest({ full_name: 'Test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 if full_name missing', async () => {
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 if full_name empty', async () => {
    const res = await PATCH(makeRequest({ full_name: '  ' }))
    expect(res.status).toBe(400)
  })

  it('updates full_name successfully', async () => {
    const res = await PATCH(makeRequest({ full_name: 'John Doe' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.full_name).toBe('Updated Name')
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'John Doe' })
  })

  it('trims whitespace from name', async () => {
    await PATCH(makeRequest({ full_name: '  Jane Doe  ' }))
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Jane Doe' })
  })
})

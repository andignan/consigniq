/**
 * Tests for PATCH /api/settings/pricing-venue
 * Covers: auth, profile lookup, enum validation, account scoping, success path
 */

const mockGetUser = jest.fn()

// Two single() functions: one for users.select (profile lookup) and one for accounts.update.select
const mockProfileSingle = jest.fn()
const mockUpdateSingle = jest.fn()

// users.select('account_id').eq().single()
const mockUsersEq = jest.fn().mockReturnValue({ single: mockProfileSingle })
const mockUsersSelect = jest.fn().mockReturnValue({ eq: mockUsersEq })

// accounts.update({...}).eq().select().single()
const mockUpdateSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle })
const mockUpdateEq = jest.fn().mockReturnValue({ select: mockUpdateSelect })
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq })

const mockFrom = jest.fn((table: string) => {
  if (table === 'users') return { select: mockUsersSelect }
  if (table === 'accounts') return { update: mockUpdate, select: mockUsersSelect }
  return {}
})

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

import { PATCH } from '@/app/api/settings/pricing-venue/route'

function makeRequest(body: Record<string, unknown> | null): Request {
  return new Request('http://localhost:3000/api/settings/pricing-venue', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body === null ? '' : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockProfileSingle.mockResolvedValue({ data: { account_id: 'acc-1' }, error: null })
  mockUpdateSingle.mockResolvedValue({
    data: { id: 'acc-1', pricing_venue: 'brick_and_mortar' },
    error: null,
  })
})

describe('PATCH /api/settings/pricing-venue', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const res = await PATCH(makeRequest({ pricing_venue: 'brick_and_mortar' }))
    expect(res.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 if user profile not found', async () => {
    mockProfileSingle.mockResolvedValue({ data: null, error: null })
    const res = await PATCH(makeRequest({ pricing_venue: 'brick_and_mortar' }))
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 if pricing_venue is missing', async () => {
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('pricing_venue')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 if pricing_venue is invalid', async () => {
    const res = await PATCH(makeRequest({ pricing_venue: 'auction_house' }))
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 if body is not JSON', async () => {
    const res = await PATCH(makeRequest(null))
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('updates pricing_venue to brick_and_mortar successfully', async () => {
    const res = await PATCH(makeRequest({ pricing_venue: 'brick_and_mortar' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.account.pricing_venue).toBe('brick_and_mortar')
    expect(mockFrom).toHaveBeenCalledWith('accounts')
    expect(mockUpdate).toHaveBeenCalledWith({ pricing_venue: 'brick_and_mortar' })
  })

  it('updates pricing_venue to online_resale successfully', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'acc-1', pricing_venue: 'online_resale' },
      error: null,
    })
    const res = await PATCH(makeRequest({ pricing_venue: 'online_resale' }))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ pricing_venue: 'online_resale' })
  })

  it('scopes update to user\'s account_id', async () => {
    await PATCH(makeRequest({ pricing_venue: 'brick_and_mortar' }))
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'acc-1')
  })

  it('returns 500 if database update fails', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    })
    const res = await PATCH(makeRequest({ pricing_venue: 'brick_and_mortar' }))
    expect(res.status).toBe(500)
  })
})

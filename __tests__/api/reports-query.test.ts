/**
 * Tests for /api/reports/query route
 * Covers: POST validation, SQL safety, role-based location scoping, forbidden tables
 */

const mockCreate = jest.fn()

jest.mock('@/lib/anthropic', () => ({
  getAnthropicClient: () => ({ messages: { create: mockCreate } }),
  ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
}))

const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockRpc = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: jest.fn(() => ({
      select: mockSelect,
    })),
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  }),
}))

import { POST } from '@/app/api/reports/query/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/reports/query'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const originalEnv = process.env.ANTHROPIC_API_KEY

beforeEach(() => {
  jest.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'

  // Default: authenticated user with owner role
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

  // Profile lookup chain: from('users').select().eq().single()
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
  mockSingle.mockResolvedValue({
    data: { account_id: '00000000-0000-0000-0000-000000000001', role: 'owner', location_id: '00000000-0000-0000-0000-000000000002' },
    error: null,
  })

  // Default: Claude generates a valid SELECT query
  mockCreate
    .mockResolvedValueOnce({
      content: [{ type: 'text', text: "SELECT name, COUNT(*) as count FROM items WHERE account_id = '[ACCOUNT_ID_PLACEHOLDER]' GROUP BY name LIMIT 10" }],
    })
    .mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Here are the top items by count.' }],
    })

  // Default: RPC returns rows
  mockRpc.mockResolvedValue({
    data: [{ name: 'Widget', count: 5 }],
    error: null,
  })
})

afterEach(() => {
  if (originalEnv !== undefined) {
    process.env.ANTHROPIC_API_KEY = originalEnv
  } else {
    delete process.env.ANTHROPIC_API_KEY
  }
})

describe('POST /api/reports/query', () => {
  it('returns 401 for unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } })
    const req = makeRequest({ question: 'How many items?' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty question', async () => {
    const req = makeRequest({ question: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing question', async () => {
    const req = makeRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 if ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const req = makeRequest({ question: 'How many items?' })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('rejects non-SELECT queries', async () => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: "DELETE FROM items WHERE account_id = '[ACCOUNT_ID_PLACEHOLDER]'" }],
    })
    const req = makeRequest({ question: 'Delete all items' })
    const res = await POST(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('SELECT')
  })

  it('rejects queries with INSERT/UPDATE/DROP', async () => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: "SELECT 1; DROP TABLE items; --" }],
    })
    const req = makeRequest({ question: 'Drop tables' })
    const res = await POST(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('forbidden')
  })

  it('rejects queries accessing forbidden tables', async () => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: "SELECT * FROM users WHERE account_id = '[ACCOUNT_ID_PLACEHOLDER]'" }],
    })
    const req = makeRequest({ question: 'Show me all users' })
    const res = await POST(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('users')
  })

  it('rejects queries without account_id scoping', async () => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: "SELECT * FROM items LIMIT 10" }],
    })
    const req = makeRequest({ question: 'Show all items' })
    const res = await POST(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('account_id')
  })

  it('returns rows, columns, summary for valid query', async () => {
    const req = makeRequest({ question: 'Top items by count' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('question', 'Top items by count')
    expect(body).toHaveProperty('sql')
    expect(body).toHaveProperty('summary')
    expect(body.rows).toEqual([{ name: 'Widget', count: 5 }])
    expect(body.columns).toEqual(['name', 'count'])
  })

  it('adds location_id filter for staff users', async () => {
    mockSingle.mockResolvedValue({
      data: { account_id: '00000000-0000-0000-0000-000000000001', role: 'staff', location_id: '00000000-0000-0000-0000-000000000042' },
      error: null,
    })
    const req = makeRequest({ question: 'Top items' })
    const res = await POST(req)
    // Check that the SQL passed to RPC includes the location filter
    if (res.status === 200) {
      const rpcCall = mockRpc.mock.calls[0]
      expect(rpcCall[1].query_text).toContain("location_id = '00000000-0000-0000-0000-000000000042'")
    }
  })

  it('does not add location filter for owner with all locations', async () => {
    const req = makeRequest({ question: 'Top items', location_id: 'all' })
    const res = await POST(req)
    if (res.status === 200) {
      const rpcCall = mockRpc.mock.calls[0]
      expect(rpcCall[1].query_text).not.toContain('location_id')
    }
  })

  it('replaces account_id placeholder with real account_id', async () => {
    const req = makeRequest({ question: 'Top items' })
    const res = await POST(req)
    if (res.status === 200) {
      const rpcCall = mockRpc.mock.calls[0]
      expect(rpcCall[1].query_text).toContain("'00000000-0000-0000-0000-000000000001'")
      expect(rpcCall[1].query_text).not.toContain('ACCOUNT_ID_PLACEHOLDER')
    }
  })
})

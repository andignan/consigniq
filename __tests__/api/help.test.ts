/**
 * Tests for /api/help/search route
 * Covers: POST validation, question handling, missing API key
 */

const mockCreate = jest.fn()

jest.mock('@/lib/anthropic', () => ({
  getAnthropicClient: () => ({ messages: { create: mockCreate } }),
  ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
}))

import { POST } from '@/app/api/help/search/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/help/search'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const originalEnv = process.env.ANTHROPIC_API_KEY

beforeEach(() => {
  jest.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'

  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: 'You can add a consignor from the Consignors page.' }],
  })
})

afterEach(() => {
  if (originalEnv !== undefined) {
    process.env.ANTHROPIC_API_KEY = originalEnv
  } else {
    delete process.env.ANTHROPIC_API_KEY
  }
})

describe('POST /api/help/search', () => {
  it('returns 400 if question is empty', async () => {
    const req = makeRequest({ question: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 if question is missing', async () => {
    const req = makeRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 if ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const req = makeRequest({ question: 'How do I add a consignor?' })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns an answer for a valid question', async () => {
    const req = makeRequest({ question: 'How do I add a consignor?' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('answer')
    expect(typeof body.answer).toBe('string')
    expect(body.answer.length).toBeGreaterThan(0)
  })

  it('passes the knowledge base in the system prompt', async () => {
    const req = makeRequest({ question: 'What is pricing?' })
    await POST(req)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('ConsignIQ Help Knowledge Base'),
      })
    )
  })

  it('scopes Claude to ConsignIQ questions only', async () => {
    const req = makeRequest({ question: 'What is the weather?' })
    await POST(req)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Only answer questions about ConsignIQ'),
      })
    )
  })
})

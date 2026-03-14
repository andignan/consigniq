/**
 * Tests for /api/trial/check-expiry — trial expiry cron endpoint
 */

const mockSupabaseFrom = jest.fn()
const mockSendEmail = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/trial/check-expiry/route'

function makeRequest(headers?: Record<string, string>) {
  return new NextRequest(new URL('/api/trial/check-expiry', 'http://localhost:3000'), {
    method: 'POST',
    headers: headers || {},
  })
}

describe('POST /api/trial/check-expiry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.CRON_SECRET
  })

  it('returns 401 when CRON_SECRET is set but not provided', async () => {
    process.env.CRON_SECRET = 'mysecret'
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('allows access when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'mysecret'

    // Mock: no expiring accounts, no expired
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
                lt: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest({ Authorization: 'Bearer mysecret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reminders_sent).toBe(0)
  })

  it('sends reminder email for account expiring tomorrow', async () => {
    // No CRON_SECRET configured = open access
    const expiringAccount = { id: 'acc1', name: 'Test Shop', trial_ends_at: new Date().toISOString() }
    const ownerUser = { email: 'owner@test.com', full_name: 'Owner' }

    const fromMock = jest.fn()
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({ data: [expiringAccount], error: null }),
                }),
                lt: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: ownerUser, error: null }),
              }),
            }),
          }),
        }
      }
      return { select: fromMock }
    })

    mockSendEmail.mockResolvedValue({ id: 'msg1' })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reminders_sent).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@test.com',
        subject: 'Your ConsignIQ trial ends tomorrow',
      })
    )
  })

  it('counts expired trial accounts', async () => {
    const expiredAccounts = [{ id: 'acc1' }, { id: 'acc2' }]

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
                lt: jest.fn().mockResolvedValue({ data: expiredAccounts, error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accounts_expired).toBe(2)
  })
})

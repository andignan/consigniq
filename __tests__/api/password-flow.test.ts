/**
 * Tests for password flow: admin reset-password, public forgot-password
 */

const mockSupabaseFrom = jest.fn()
const mockSupabaseAuth = {
  admin: {
    generateLink: jest.fn(),
  },
}
const mockCheckSuperadmin = jest.fn()
const mockSendEmail = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  checkSuperadmin: (...args: unknown[]) => mockCheckSuperadmin(...args),
  createAdminClient: () => ({
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth,
  }),
}))

jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

jest.mock('@/lib/email-templates', () => ({
  buildPasswordResetEmail: (data: Record<string, unknown>) => ({
    subject: 'Reset your ConsignIQ password',
    text: `Reset: ${data.resetLink}`,
    html: `<p>Reset</p>`,
  }),
}))

import { NextRequest } from 'next/server'
import { POST as resetPassword } from '@/app/api/admin/users/reset-password/route'
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route'

function makeRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/admin/users/reset-password', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 for unauthenticated', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 401 })
    const res = await resetPassword(makeRequest('/api/admin/users/reset-password', { user_id: 'u1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-superadmin', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 403 })
    const res = await resetPassword(makeRequest('/api/admin/users/reset-password', { user_id: 'u1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 if user_id missing', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'admin1' })
    const res = await resetPassword(makeRequest('/api/admin/users/reset-password', {}))
    expect(res.status).toBe(400)
  })

  it('returns 404 if user not found', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'admin1' })
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    })

    const res = await resetPassword(makeRequest('/api/admin/users/reset-password', { user_id: 'u1' }))
    expect(res.status).toBe(404)
  })

  it('sends reset email for valid user', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'admin1' })
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { email: 'user@test.com', full_name: 'Test User' }, error: null }),
        }),
      }),
    })
    mockSupabaseAuth.admin.generateLink.mockResolvedValue({
      data: { properties: { action_link: 'https://example.com/reset?token=abc' } },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ id: 'msg1' })

    const res = await resetPassword(makeRequest('/api/admin/users/reset-password', { user_id: 'u1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Reset your ConsignIQ password',
      })
    )
  })
})

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 if email missing', async () => {
    const res = await forgotPassword(makeRequest('/api/auth/forgot-password', {}))
    expect(res.status).toBe(400)
  })

  it('returns 200 for valid email and sends reset', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'u1', email: 'user@test.com', full_name: 'User' }, error: null }),
        }),
      }),
    })
    mockSupabaseAuth.admin.generateLink.mockResolvedValue({
      data: { properties: { action_link: 'https://example.com/reset?token=abc' } },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ id: 'msg1' })

    const res = await forgotPassword(makeRequest('/api/auth/forgot-password', { email: 'user@test.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(true)
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it('returns 200 even for unknown email (no user enumeration)', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    })

    const res = await forgotPassword(makeRequest('/api/auth/forgot-password', { email: 'nonexistent@test.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(true)
    // Should NOT have called sendEmail since user doesn't exist
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

/**
 * Tests for PATCH /api/admin/users — platform role management
 * Covers: role assignment, validation, last super_admin protection, auth
 */

const mockSupabaseFrom = jest.fn()
const mockCheckSuperadmin = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  checkSuperadmin: (...args: unknown[]) => mockCheckSuperadmin(...args),
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}))

jest.mock('@/lib/email-templates', () => ({
  buildInviteEmail: () => ({ subject: 'Invite', text: 'Hi', html: '<p>Hi</p>' }),
}))

import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/admin/users/route'

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

beforeEach(() => jest.clearAllMocks())

describe('PATCH /api/admin/users (platform roles)', () => {
  it('returns 401 for unauthenticated request', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 401 })
    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u1', platform_role: 'support' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-platform user', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 403 })
    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u1', platform_role: 'support' }),
    }))
    expect(res.status).toBe(403)
  })

  it('returns 403 for support role trying to modify roles', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'support' })
    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u2', platform_role: 'finance' }),
    }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('Only super admins')
  })

  it('returns 403 for finance role trying to modify roles', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'finance' })
    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u2', platform_role: 'support' }),
    }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing user_id', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'super_admin' })
    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ platform_role: 'support' }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('user_id')
  })

  it('returns 400 for invalid platform_role value', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'super_admin' })
    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u2', platform_role: 'admin' }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('platform_role must be null or one of')
  })

  it('returns 400 when removing last super_admin', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'super_admin' })

    // Mock: user being modified is currently a super_admin
    const mockSingle = jest.fn().mockResolvedValue({
      data: { platform_role: 'super_admin' },
      error: null,
    })
    const mockSelectCount = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ count: 1, data: null, error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockImplementation((fields: string, opts?: Record<string, unknown>) => {
            if (opts?.head) return mockSelectCount()
            return { eq: jest.fn().mockReturnValue({ single: mockSingle }) }
          }),
        }
      }
      return {}
    })

    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u1', platform_role: null }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('last super admin')
  })

  it('successfully sets platform_role', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'super_admin' })

    const mockUpdateSingle = jest.fn().mockResolvedValue({
      data: { id: 'u2', platform_role: 'support' },
      error: null,
    })

    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { platform_role: null }, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockUpdateSingle,
          }),
        }),
      }),
    }))

    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u2', platform_role: 'support' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.platform_role).toBe('support')
  })

  it('successfully removes platform_role (sets null)', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'super_admin' })

    // Mock: user is support (not super_admin, so no last-admin check needed for count)
    const mockUpdateSingle = jest.fn().mockResolvedValue({
      data: { id: 'u2', platform_role: null },
      error: null,
    })

    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { platform_role: 'support' }, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockUpdateSingle,
          }),
        }),
      }),
    }))

    const res = await PATCH(makeRequest('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'u2', platform_role: null }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.platform_role).toBeNull()
  })

  it('accepts all valid platform_role values', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1', platformRole: 'super_admin' })

    for (const role of ['super_admin', 'support', 'finance']) {
      const mockUpdateSingle = jest.fn().mockResolvedValue({
        data: { id: 'u2', platform_role: role },
        error: null,
      })

      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { platform_role: null }, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: mockUpdateSingle,
            }),
          }),
        }),
      }))

      const res = await PATCH(makeRequest('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ user_id: 'u2', platform_role: role }),
      }))
      expect(res.status).toBe(200)
    }
  })
})

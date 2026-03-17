/**
 * Tests for DELETE /api/admin/users/[userId] — admin user deletion
 */

const mockCheckSuperadmin = jest.fn()
const mockSupabaseFrom = jest.fn()
const mockSupabaseAuth = {
  admin: {
    deleteUser: jest.fn(),
  },
}

jest.mock('@/lib/supabase/admin', () => ({
  checkSuperadmin: (...args: unknown[]) => mockCheckSuperadmin(...args),
  createAdminClient: () => ({
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth,
  }),
}))

import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/admin/users/[userId]/route'

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method: 'DELETE' })
}

describe('DELETE /api/admin/users/[userId]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 for unauthenticated request', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 401 })
    const res = await DELETE(makeRequest('/api/admin/users/abc'), { params: { userId: 'abc' } })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-superadmin', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: false, status: 403 })
    const res = await DELETE(makeRequest('/api/admin/users/abc'), { params: { userId: 'abc' } })
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid UUID', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })
    const res = await DELETE(makeRequest('/api/admin/users/not-a-uuid'), { params: { userId: 'not-a-uuid' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid user ID')
  })

  it('returns 404 when user not found', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    })

    const res = await DELETE(makeRequest('/api/admin/users/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), {
      params: { userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    })
    expect(res.status).toBe(404)
  })

  it('deletes a regular user successfully', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })

    const deleteMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'target-user', email: 'test@test.com', platform_role: null },
                error: null,
              }),
            }),
          }),
          delete: deleteMock,
        }
      }
      return {}
    })

    mockSupabaseAuth.admin.deleteUser.mockResolvedValue({})

    const res = await DELETE(makeRequest('/api/admin/users/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), {
      params: { userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
    expect(deleteMock).toHaveBeenCalled()
    expect(mockSupabaseAuth.admin.deleteUser).toHaveBeenCalledWith('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
  })

  it('prevents deleting the last super_admin', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockImplementation((cols: string) => {
            if (cols === '*') {
              // Count query for super_admins
              return {
                eq: jest.fn().mockResolvedValue({ count: 1 }),
              }
            }
            // User lookup
            return {
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'last-sa', email: 'admin@test.com', platform_role: 'super_admin' },
                  error: null,
                }),
              }),
            }
          }),
        }
      }
      return {}
    })

    const res = await DELETE(makeRequest('/api/admin/users/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), {
      params: { userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('last super admin')
  })

  it('allows deleting a super_admin when others exist', async () => {
    mockCheckSuperadmin.mockResolvedValue({ authorized: true, userId: 'u1' })

    const deleteMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockImplementation((cols: string) => {
            if (cols === '*') {
              // Count query — 2 super_admins exist
              return {
                eq: jest.fn().mockResolvedValue({ count: 2 }),
              }
            }
            return {
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'sa2', email: 'sa2@test.com', platform_role: 'super_admin' },
                  error: null,
                }),
              }),
            }
          }),
          delete: deleteMock,
        }
      }
      return {}
    })

    mockSupabaseAuth.admin.deleteUser.mockResolvedValue({})

    const res = await DELETE(makeRequest('/api/admin/users/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), {
      params: { userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })
})

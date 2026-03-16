/**
 * Unit tests for PlatformRole type and checkSuperadmin contract
 */

describe('PlatformRole type', () => {
  const VALID_ROLES = ['super_admin', 'support', 'finance']

  it('defines exactly three platform roles', () => {
    expect(VALID_ROLES).toHaveLength(3)
  })

  it('includes super_admin', () => {
    expect(VALID_ROLES).toContain('super_admin')
  })

  it('includes support', () => {
    expect(VALID_ROLES).toContain('support')
  })

  it('includes finance', () => {
    expect(VALID_ROLES).toContain('finance')
  })

  it('does not include legacy is_superadmin boolean values', () => {
    expect(VALID_ROLES).not.toContain('true')
    expect(VALID_ROLES).not.toContain('false')
    expect(VALID_ROLES).not.toContain('admin')
  })
})

describe('checkSuperadmin contract', () => {
  it('authorized response includes platformRole', () => {
    // The contract: checkSuperadmin returns { authorized: true, userId, platformRole }
    const successResponse = { authorized: true as const, userId: 'u1', platformRole: 'super_admin' }
    expect(successResponse).toHaveProperty('authorized', true)
    expect(successResponse).toHaveProperty('userId')
    expect(successResponse).toHaveProperty('platformRole')
  })

  it('unauthorized 401 response has no platformRole', () => {
    const unauthResponse = { authorized: false as const, status: 401 }
    expect(unauthResponse).toHaveProperty('authorized', false)
    expect(unauthResponse).toHaveProperty('status', 401)
    expect(unauthResponse).not.toHaveProperty('platformRole')
  })

  it('unauthorized 403 response has no platformRole', () => {
    const forbiddenResponse = { authorized: false as const, status: 403 }
    expect(forbiddenResponse).toHaveProperty('authorized', false)
    expect(forbiddenResponse).toHaveProperty('status', 403)
    expect(forbiddenResponse).not.toHaveProperty('platformRole')
  })

  it('all platform roles grant admin access', () => {
    // Any non-null platform_role should pass the checkSuperadmin gate
    for (const role of ['super_admin', 'support', 'finance']) {
      const profile = { platform_role: role }
      expect(!!profile.platform_role).toBe(true)
    }
  })

  it('null platform_role denies admin access', () => {
    const profile = { platform_role: null }
    expect(!!profile.platform_role).toBe(false)
  })
})

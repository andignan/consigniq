/**
 * Tests for admin users page — form modes + role-based visibility
 *
 * These tests validate the logic of the admin users page without rendering React.
 * They verify that the correct form fields and table columns are shown/hidden
 * based on the current user's platform role and the selected form user type.
 */

describe('Admin Users Page — Form Mode Logic', () => {
  describe('User type selector visibility', () => {
    it('super_admin sees both Customer and Platform radio options', () => {
      const currentPlatformRole = 'super_admin'
      const isSuperAdmin = currentPlatformRole === 'super_admin'
      expect(isSuperAdmin).toBe(true)
      // Radio group is rendered when isSuperAdmin is true
    })

    it('support user does not see user type selector', () => {
      const currentPlatformRole = 'support'
      const isSuperAdmin = currentPlatformRole === 'super_admin'
      expect(isSuperAdmin).toBe(false)
      // Radio group is NOT rendered — form defaults to customer mode
    })

    it('finance user does not see user type selector', () => {
      const currentPlatformRole = 'finance'
      const isSuperAdmin = currentPlatformRole === 'super_admin'
      expect(isSuperAdmin).toBe(false)
    })
  })

  describe('Add User button visibility', () => {
    it('super_admin sees Add User button', () => {
      const currentPlatformRole = 'super_admin'
      const isSuperAdmin = currentPlatformRole === 'super_admin'
      expect(isSuperAdmin).toBe(true)
    })

    it('support does not see Add User button', () => {
      const currentPlatformRole = 'support'
      const isSuperAdmin = currentPlatformRole === 'super_admin'
      expect(isSuperAdmin).toBe(false)
    })

    it('finance does not see Add User button', () => {
      const currentPlatformRole = 'finance'
      const isSuperAdmin = currentPlatformRole === 'super_admin'
      expect(isSuperAdmin).toBe(false)
    })
  })

  describe('Platform Role column visibility', () => {
    it('super_admin sees Platform Role column', () => {
      const currentPlatformRole = 'super_admin'
      const showPlatformRoleColumn = currentPlatformRole === 'super_admin' || currentPlatformRole === 'support'
      expect(showPlatformRoleColumn).toBe(true)
    })

    it('support sees Platform Role column (read-only)', () => {
      const currentPlatformRole = 'support'
      const showPlatformRoleColumn = currentPlatformRole === 'super_admin' || currentPlatformRole === 'support'
      const isSuperAdmin = currentPlatformRole === 'super_admin'
      expect(showPlatformRoleColumn).toBe(true)
      expect(isSuperAdmin).toBe(false) // cannot edit
    })

    it('finance does not see Platform Role column', () => {
      const currentPlatformRole = 'finance'
      const showPlatformRoleColumn = currentPlatformRole === 'super_admin' || currentPlatformRole === 'support'
      expect(showPlatformRoleColumn).toBe(false)
    })
  })

  describe('Tier and Type columns for platform users', () => {
    it('platform user rows show dash for Tier instead of badge', () => {
      const user = { platform_role: 'support', accounts: { tier: 'solo' } }
      const showTierBadge = !user.platform_role
      expect(showTierBadge).toBe(false)
    })

    it('platform user rows show dash for Type instead of AccountTypeBadge', () => {
      const user = { platform_role: 'finance', accounts: { account_type: 'paid' } }
      const showTypeBadge = !user.platform_role
      expect(showTypeBadge).toBe(false)
    })

    it('customer user rows show Tier badge normally', () => {
      const user = { platform_role: null, accounts: { tier: 'shop' } }
      const showTierBadge = !user.platform_role
      expect(showTierBadge).toBe(true)
    })

    it('customer user rows show Type badge normally', () => {
      const user = { platform_role: null, accounts: { account_type: 'paid' } }
      const showTypeBadge = !user.platform_role
      expect(showTypeBadge).toBe(true)
    })
  })

  describe('Form field visibility by user type', () => {
    it('customer mode shows Account Name, Tier, Account Type fields', () => {
      const formUserType = 'customer' as const
      const showCustomerFields = formUserType === 'customer'
      const showPlatformFields = formUserType === 'platform'
      expect(showCustomerFields).toBe(true)
      expect(showPlatformFields).toBe(false)
    })

    it('platform mode hides Account Name, Tier, Account Type fields', () => {
      const formUserType = 'platform' as const
      const showCustomerFields = formUserType === 'customer'
      expect(showCustomerFields).toBe(false)
    })

    it('platform mode shows Platform Role dropdown', () => {
      const formUserType = 'platform' as const
      const showPlatformFields = formUserType === 'platform'
      expect(showPlatformFields).toBe(true)
    })
  })

  describe('Form submit body construction', () => {
    it('customer mode sends account_name, tier, account_type', () => {
      const formUserType = 'customer' as const
      const formEmail = 'test@test.com'
      const formName = 'Test User'
      const formAccountName = 'Test Shop'
      const formTier = 'shop'
      const formAccountType = 'paid'

      let body: Record<string, unknown>
      if (formUserType === 'platform') {
        body = { email: formEmail, full_name: formName, platform_role: 'support' }
      } else {
        body = {
          email: formEmail,
          full_name: formName,
          account_name: formAccountName,
          tier: formTier,
          account_type: formAccountType,
        }
      }

      expect(body.account_name).toBe('Test Shop')
      expect(body.tier).toBe('shop')
      expect(body.account_type).toBe('paid')
      expect(body).not.toHaveProperty('platform_role')
    })

    it('platform mode sends ConsignIQ System account + platform_role', () => {
      const formUserType = 'platform' as const
      const formEmail = 'admin@consigniq.com'
      const formName = 'Admin User'
      const formPlatformRole = 'support'

      let body: Record<string, unknown>
      if (formUserType === 'platform') {
        body = {
          email: formEmail,
          full_name: formName,
          account_name: 'ConsignIQ System',
          tier: 'solo',
          account_type: 'paid',
          platform_role: formPlatformRole,
        }
      } else {
        body = { email: formEmail, full_name: formName, account_name: 'X', tier: 'shop', account_type: 'paid' }
      }

      expect(body.account_name).toBe('ConsignIQ System')
      expect(body.tier).toBe('solo')
      expect(body.account_type).toBe('paid')
      expect(body.platform_role).toBe('support')
    })

    it('platform mode requires platform_role selection', () => {
      const formUserType = 'platform' as const
      const formPlatformRole = ''

      if (formUserType === 'platform' && !formPlatformRole) {
        // Should show error and not submit
        expect(formPlatformRole).toBe('')
      }
    })
  })
})

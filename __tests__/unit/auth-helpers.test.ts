/**
 * Tests for src/lib/auth-helpers.ts
 * M1/M2: Shared auth + profile lookup helpers
 */
import { ERRORS } from '@/lib/errors'

describe('Error constants', () => {
  it('exports UNAUTHORIZED', () => {
    expect(ERRORS.UNAUTHORIZED).toBe('Unauthorized')
  })

  it('exports PROFILE_NOT_FOUND', () => {
    expect(ERRORS.PROFILE_NOT_FOUND).toBe('User profile not found')
  })

  it('exports OWNER_REQUIRED', () => {
    expect(ERRORS.OWNER_REQUIRED).toBeTruthy()
  })

  it('exports UPGRADE_REQUIRED', () => {
    expect(ERRORS.UPGRADE_REQUIRED).toBe('Upgrade required')
  })

  it('all error values are strings', () => {
    for (const value of Object.values(ERRORS)) {
      expect(typeof value).toBe('string')
    }
  })
})

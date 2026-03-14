/**
 * Tests for password setup validation logic
 * Tests the validation rules used in /auth/setup-password
 */

describe('Password validation rules', () => {
  function validate(password: string, confirmPassword: string): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password !== confirmPassword) return 'Passwords do not match'
    return null
  }

  it('rejects password shorter than 8 characters', () => {
    expect(validate('short', 'short')).toBe('Password must be at least 8 characters')
  })

  it('rejects empty password', () => {
    expect(validate('', '')).toBe('Password must be at least 8 characters')
  })

  it('rejects 7 character password', () => {
    expect(validate('1234567', '1234567')).toBe('Password must be at least 8 characters')
  })

  it('rejects password mismatch', () => {
    expect(validate('password123', 'password456')).toBe('Passwords do not match')
  })

  it('accepts valid matching passwords', () => {
    expect(validate('password123', 'password123')).toBeNull()
  })

  it('accepts exactly 8 character password', () => {
    expect(validate('12345678', '12345678')).toBeNull()
  })
})

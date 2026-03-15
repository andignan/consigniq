/**
 * Tests for src/lib/anthropic.ts
 * I6: Centralized model constant and singleton client
 */
import { ANTHROPIC_MODEL } from '@/lib/anthropic'

describe('Anthropic configuration', () => {
  it('exports ANTHROPIC_MODEL constant', () => {
    expect(ANTHROPIC_MODEL).toBe('claude-sonnet-4-20250514')
  })

  it('model constant is a valid Claude model ID', () => {
    expect(ANTHROPIC_MODEL).toMatch(/^claude-/)
  })
})

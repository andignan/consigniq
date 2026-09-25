/**
 * Tests for src/lib/anthropic.ts
 * I6: Centralized model constant and singleton client
 */
import { ANTHROPIC_MODEL, parseJsonResponse } from '@/lib/anthropic'

describe('Anthropic configuration', () => {
  it('exports ANTHROPIC_MODEL constant', () => {
    expect(ANTHROPIC_MODEL).toBe('claude-sonnet-5')
  })

  it('model constant is a valid Claude model ID', () => {
    expect(ANTHROPIC_MODEL).toMatch(/^claude-/)
  })
})

describe('parseJsonResponse', () => {
  it('parses plain JSON', () => {
    expect(parseJsonResponse('{"name":"Vase"}')).toEqual({ name: 'Vase' })
  })

  it('parses JSON wrapped in markdown code fences', () => {
    expect(parseJsonResponse('```json\n{"price": 25}\n```')).toEqual({ price: 25 })
  })

  it('parses JSON surrounded by prose', () => {
    expect(parseJsonResponse('Here you go: {"a": {"b": 1}} Hope that helps')).toEqual({ a: { b: 1 } })
  })

  it('throws when no JSON object is present', () => {
    expect(() => parseJsonResponse('no json here')).toThrow()
  })
})

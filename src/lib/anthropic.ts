// Shared Anthropic client and model constant
// I6: Centralized to avoid hardcoding model names across 5 routes
import Anthropic from '@anthropic-ai/sdk'

export const ANTHROPIC_MODEL = 'claude-sonnet-5'

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

/**
 * Parses a JSON object from a model response. Tolerates markdown code fences
 * and surrounding prose by extracting the outermost {...}. Throws if none parses.
 */
export function parseJsonResponse<T>(text: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) throw new Error('No JSON object in response')
    return JSON.parse(text.slice(start, end + 1)) as T
  }
}

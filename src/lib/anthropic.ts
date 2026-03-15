// Shared Anthropic client and model constant
// I6: Centralized to avoid hardcoding model names across 5 routes
import Anthropic from '@anthropic-ai/sdk'

export const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

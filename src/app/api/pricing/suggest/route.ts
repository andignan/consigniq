// app/api/pricing/suggest/route.ts
// AI pricing engine using Claude
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCategoryConfig } from '@/lib/pricing/categories'
import type { CompResult } from '@/app/api/pricing/comps/route'

const anthropic = new Anthropic()

export interface PriceSuggestion {
  price: number
  low: number
  high: number
  reasoning: string
}

export async function POST(request: NextRequest) {
  const { name, category, condition, description, comps } = await request.json() as {
    name: string
    category: string
    condition: string
    description?: string
    comps: CompResult[]
  }

  if (!name || !category || !condition) {
    return NextResponse.json(
      { error: 'name, category, and condition are required' },
      { status: 400 }
    )
  }

  const config = getCategoryConfig(category)

  const compsSection = comps.length > 0
    ? `\nRecent eBay sold comparables:\n${comps.map((c, i) => `${i + 1}. "${c.title}" — sold for $${c.price.toFixed(2)}${c.condition ? ` (${c.condition})` : ''}`).join('\n')}`
    : '\nNo comparable sales data available. Use your knowledge of typical resale values.'

  const prompt = `You are a consignment shop pricing expert. Price this item for a brick-and-mortar consignment store.

Item: ${name}
Category: ${config.label}
Condition: ${condition}
${description ? `Description: ${description}` : ''}
${compsSection}

Category pricing notes: ${config.priceGuidance}

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "price": <recommended price as a number>,
  "low": <low end of fair range>,
  "high": <high end of fair range>,
  "reasoning": "<2-3 sentences explaining your pricing rationale, referencing comps if available>"
}

Important:
- Price for a consignment store, not eBay (stores typically price 10-20% below eBay sold prices to account for no shipping and immediate sale)
- Round prices to clean numbers ($5 increments under $50, $10 increments under $200, $25 increments above $200)
- The reasoning should be concise and helpful for the store owner
- If comps suggest a wide range, lean toward the middle-low end for faster turnover`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text) as PriceSuggestion

    // Validate the response
    if (
      typeof parsed.price !== 'number' ||
      typeof parsed.low !== 'number' ||
      typeof parsed.high !== 'number' ||
      typeof parsed.reasoning !== 'string'
    ) {
      throw new Error('Invalid response shape')
    }

    return NextResponse.json({ suggestion: parsed })
  } catch (err) {
    console.error('AI pricing failed:', err)
    return NextResponse.json(
      { error: 'AI pricing failed. Please try again.' },
      { status: 500 }
    )
  }
}

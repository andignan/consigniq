// app/api/pricing/suggest/route.ts
// AI pricing engine using Claude
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCategoryConfig } from '@/lib/pricing/categories'
import type { CompResult } from '@/app/api/pricing/comps/route'

export interface PriceSuggestion {
  price: number
  low: number
  high: number
  reasoning: string
}

export async function POST(request: NextRequest) {
  const { name, category, condition, description, comps, photoBase64, photoMediaType } = await request.json() as {
    name: string
    category: string
    condition: string
    description?: string
    comps: CompResult[]
    photoBase64?: string
    photoMediaType?: string
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set in environment variables' },
      { status: 500 }
    )
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const userContent: Anthropic.MessageCreateParams['messages'][0]['content'] =
      photoBase64 && photoMediaType
        ? [
            {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: photoMediaType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: photoBase64,
              },
            },
            { type: 'text' as const, text: prompt },
          ]
        : prompt

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: PriceSuggestion
    try {
      parsed = JSON.parse(text)
    } catch {
      console.error('Failed to parse AI response:', text)
      return NextResponse.json(
        { error: 'AI returned invalid JSON: ' + text.substring(0, 200) },
        { status: 500 }
      )
    }

    if (
      typeof parsed.price !== 'number' ||
      typeof parsed.low !== 'number' ||
      typeof parsed.high !== 'number' ||
      typeof parsed.reasoning !== 'string'
    ) {
      return NextResponse.json(
        { error: 'AI returned unexpected shape: ' + JSON.stringify(parsed).substring(0, 200) },
        { status: 500 }
      )
    }

    return NextResponse.json({ suggestion: parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('AI pricing failed:', message)
    return NextResponse.json(
      { error: 'AI pricing failed: ' + message },
      { status: 500 }
    )
  }
}

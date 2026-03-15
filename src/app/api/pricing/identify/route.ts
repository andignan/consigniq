// app/api/pricing/identify/route.ts
// Photo-based item identification using Claude vision
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'

export interface IdentifyResult {
  name: string
  category: string
  condition: string
  description: string
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set' },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('photo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'photo is required' }, { status: 400 })
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, and WebP images are supported' },
      { status: 400 }
    )
  }

  // Convert to base64
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `You are a consignment shop expert. Identify this item from the photo.

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "name": "<specific item name, include brand if visible>",
  "category": "<one of: Clothing & Shoes, Furniture, Jewelry & Silver, China & Crystal, Collectibles & Art, Electronics, Books & Games, Toys, Tools, Luxury & Designer, Kitchen & Home, Other>",
  "condition": "<one of: excellent, very_good, good, fair, poor>",
  "description": "<brief description: brand, material, size, color, notable features, any visible damage>"
}`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: IdentifyResult
    try {
      parsed = JSON.parse(text)
    } catch {
      console.error('Failed to parse identify response:', text)
      return NextResponse.json(
        { error: 'AI returned invalid JSON: ' + text.substring(0, 200) },
        { status: 500 }
      )
    }

    return NextResponse.json({ result: parsed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Photo identification failed:', msg)
    return NextResponse.json(
      { error: 'Photo identification failed: ' + msg },
      { status: 500 }
    )
  }
}

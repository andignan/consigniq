// app/api/pricing/identify/route.ts
// Photo-based item identification using Claude vision
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic'

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

  // Collect all photo files: 'photo' (backward compat) + 'photo_1', 'photo_2', 'photo_3'
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  const photoFiles: File[] = []

  const mainPhoto = formData.get('photo') as File | null
  if (mainPhoto && validTypes.includes(mainPhoto.type)) {
    photoFiles.push(mainPhoto)
  }
  for (let i = 1; i <= 3; i++) {
    const f = formData.get(`photo_${i}`) as File | null
    if (f && validTypes.includes(f.type)) {
      photoFiles.push(f)
    }
  }

  if (photoFiles.length === 0) {
    return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 })
  }

  // Convert all photos to base64 image content blocks
  const imageBlocks: Array<{
    type: 'image'
    source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }
  }> = []

  for (const file of photoFiles) {
    if (!validTypes.includes(file.type)) continue
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    imageBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
        data: base64,
      },
    })
  }

  const multiPhotoNote = imageBlocks.length > 1
    ? ' Multiple photos may show different angles of the same item — use all photos to identify the item accurately.'
    : ''

  try {
    const anthropic = getAnthropicClient()

    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: `You are a consignment shop expert. Identify this item from the photo${imageBlocks.length > 1 ? 's' : ''}.${multiPhotoNote}

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "name": "<specific item name, include brand if visible>",
  "category": "<one of: Clothing & Shoes, Furniture, Jewelry & Silver, China & Crystal, Collectibles & Art, Electronics, Books & Games, Toys, Tools, Luxury & Designer, Kitchen & Home, Other>",
  "condition": "<one of: new_in_box, new_with_tags, new_without_tags, new, like_new, excellent, very_good, good, fair, poor>",
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

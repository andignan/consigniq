// app/api/help/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { HELP_KNOWLEDGE_BASE } from '@/lib/help-knowledge-base'
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { question } = body as { question?: string }

  if (!question || !question.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set' },
      { status: 500 }
    )
  }

  try {
    const anthropic = getAnthropicClient()

    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system: `You are the ConsignIQ help assistant. Only answer questions about ConsignIQ features and how to use the application. If the question is not about ConsignIQ, politely say you can only help with ConsignIQ questions.

Use the following knowledge base to answer:

${HELP_KNOWLEDGE_BASE}

Keep answers concise (2-4 sentences). Use plain language.`,
      messages: [{ role: 'user', content: question.trim() }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ answer: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Help search failed:', msg)
    return NextResponse.json({ error: 'Help search failed: ' + msg }, { status: 500 })
  }
}

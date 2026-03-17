// app/api/pricing/suggest/route.ts
// AI pricing engine using Claude
import { NextRequest, NextResponse } from 'next/server'
import { getCategoryConfig } from '@/lib/pricing/categories'
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'
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

  // Detect tier for prompt customization — solo users are individual resellers, not shop owners
  let detectedTier = 'shop'

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set in environment variables' },
      { status: 500 }
    )
  }

  // ─── Tier-based usage limit check ─────────────────────────
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      const { data: account } = await supabase
        .from('accounts')
        .select('id, tier, ai_lookups_this_month, ai_lookups_reset_at, bonus_lookups, bonus_lookups_used')
        .eq('id', profile.account_id)
        .single()

      if (account) {
        const tier = (account.tier || 'shop') as Tier
        detectedTier = tier
        const tierConfig = TIER_CONFIGS[tier]

        if (tierConfig.aiPricingLimit !== null) {
          // Check if counter needs reset (>30 days since last reset)
          const resetAt = new Date(account.ai_lookups_reset_at || 0)
          const daysSinceReset = (Date.now() - resetAt.getTime()) / (1000 * 60 * 60 * 24)

          if (daysSinceReset > 30) {
            await supabase
              .from('accounts')
              .update({ ai_lookups_this_month: 0, ai_lookups_reset_at: new Date().toISOString() })
              .eq('id', account.id)
            account.ai_lookups_this_month = 0
          }

          const monthlyUsed = account.ai_lookups_this_month ?? 0
          const bonusAvailable = (account.bonus_lookups ?? 0) - (account.bonus_lookups_used ?? 0)
          const monthlyRemaining = tierConfig.aiPricingLimit - monthlyUsed

          if (monthlyRemaining <= 0 && bonusAvailable <= 0) {
            return NextResponse.json(
              { error: 'limit_reached', tier, limit: tierConfig.aiPricingLimit, bonus_lookups: account.bonus_lookups ?? 0 },
              { status: 403 }
            )
          }
        }
      }
    }
  }

  // Build prompt — Solo users are individual resellers, Starter+ are consignment shops
  const isSoloTier = detectedTier === 'solo'
  const roleDesc = isSoloTier
    ? 'You are a resale pricing expert. Price this item for resale on platforms like eBay, Poshmark, or Facebook Marketplace.'
    : 'You are a consignment shop pricing expert. Price this item for a brick-and-mortar consignment store.'

  const pricingGuidance = isSoloTier
    ? `- Price for resale — suggest what a buyer would pay on eBay or similar platforms
- Factor in condition, demand, and typical resale margins
- Round prices to clean numbers ($5 increments under $50, $10 increments under $200, $25 increments above $200)
- The reasoning should reference comparable sales and market demand
- If comps suggest a wide range, lean toward competitive pricing for faster sale`
    : `- Price for a consignment store, not eBay (stores typically price 10-20% below eBay sold prices to account for no shipping and immediate sale)
- Round prices to clean numbers ($5 increments under $50, $10 increments under $200, $25 increments above $200)
- The reasoning should be concise and helpful for the store owner
- If comps suggest a wide range, lean toward the middle-low end for faster turnover`

  const prompt = `${roleDesc}

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
${pricingGuidance}`

  try {
    const anthropic = getAnthropicClient()

    const userContent: Parameters<typeof anthropic.messages.create>[0]['messages'][0]['content'] =
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
      model: ANTHROPIC_MODEL,
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

    // Increment AI pricing usage for starter tier tracking
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('account_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        try {
          // Check if monthly quota is exhausted — if so, use bonus lookups
          const { data: acct } = await supabase
            .from('accounts')
            .select('ai_lookups_this_month, tier, bonus_lookups, bonus_lookups_used')
            .eq('id', profile.account_id)
            .single()

          const tierCfg = TIER_CONFIGS[(acct?.tier || 'shop') as Tier]
          if (tierCfg.aiPricingLimit !== null && (acct?.ai_lookups_this_month ?? 0) >= tierCfg.aiPricingLimit) {
            // Monthly exhausted, use bonus
            await supabase
              .from('accounts')
              .update({ bonus_lookups_used: (acct?.bonus_lookups_used ?? 0) + 1 })
              .eq('id', profile.account_id)
          } else {
            await supabase.rpc('increment_ai_lookups', { p_account_id: profile.account_id })
          }
        } catch {
          // Non-critical — usage tracking failure should not block the response
        }
      }
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

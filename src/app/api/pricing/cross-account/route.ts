// app/api/pricing/cross-account/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Tier } from '@/lib/tier-limits'
import { canUseFeature } from '@/lib/feature-gates'

export interface CrossAccountStats {
  sample_count: number
  avg_sold_price: number
  min_sold_price: number
  max_sold_price: number
  median_sold_price: number
  avg_days_to_sell: number | null
  sold_count: number
  unsold_count: number
  match_level: 'exact' | 'fuzzy' | 'category'
  insight_text?: string
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile for account_id and tier
  const { data: profile } = await supabase
    .from('users')
    .select('account_id, accounts(tier)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Pro-tier only
  const tier = (profile.accounts as unknown as { tier: string })?.tier as Tier ?? 'starter'
  if (!canUseFeature(tier, 'cross_customer_pricing')) {
    return NextResponse.json({ error: 'Cross-customer pricing requires Pro tier' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const name = searchParams.get('name')
  const condition = searchParams.get('condition')

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }

  // Three-level match: exact → fuzzy → category fallback
  let stats: CrossAccountStats | null = null

  // Level 1: Exact match — same name + category + condition (cross-account)
  if (name && condition) {
    const { data } = await supabase
      .from('price_history')
      .select('sold_price, days_to_sell, sold')
      .eq('category', category)
      .ilike('name', name)
      .eq('condition', condition)
      .eq('sold', true)
      .not('sold_price', 'is', null)

    if (data && data.length >= 3) {
      stats = computeStats(data, 'exact')
    }
  }

  // Level 2: Fuzzy match — ilike name + category (any condition)
  if (!stats && name) {
    const { data } = await supabase
      .from('price_history')
      .select('sold_price, days_to_sell, sold')
      .eq('category', category)
      .ilike('name', `%${name}%`)
      .eq('sold', true)
      .not('sold_price', 'is', null)

    if (data && data.length >= 3) {
      stats = computeStats(data, 'fuzzy')
    }
  }

  // Level 3: Category fallback — all sold items in category
  if (!stats) {
    const { data } = await supabase
      .from('price_history')
      .select('sold_price, days_to_sell, sold')
      .eq('category', category)
      .eq('sold', true)
      .not('sold_price', 'is', null)

    if (data && data.length >= 3) {
      stats = computeStats(data, 'category')
    }
  }

  if (!stats) {
    return NextResponse.json({ stats: null, message: 'Insufficient market data' })
  }

  // Generate insight text via Claude if we have the API key
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { getAnthropicClient: getClient, ANTHROPIC_MODEL: MODEL } = await import('@/lib/anthropic')
      const anthropic = getClient()

      const prompt = `You are a pricing analyst for a consignment shop. Based on this cross-account market data, write a 1-2 sentence insight:

Category: ${category}
Item: ${name || 'General category'}
Condition: ${condition || 'Any'}
Match level: ${stats.match_level}
Sample size: ${stats.sample_count} items
Average sold price: $${stats.avg_sold_price.toFixed(2)}
Price range: $${stats.min_sold_price.toFixed(2)} – $${stats.max_sold_price.toFixed(2)}
Median price: $${stats.median_sold_price.toFixed(2)}
Average days to sell: ${stats.avg_days_to_sell?.toFixed(0) ?? 'N/A'}

Write a brief, actionable insight about pricing this item based on the market data. Be specific about numbers. Do not use markdown.`

      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      })

      const textBlock = msg.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        stats.insight_text = textBlock.text
      }
    } catch {
      // Non-critical — insight is optional
    }
  }

  return NextResponse.json({ stats })
}

function computeStats(
  data: Array<{ sold_price: number | null; days_to_sell: number | null; sold: boolean }>,
  matchLevel: 'exact' | 'fuzzy' | 'category'
): CrossAccountStats {
  const prices = data
    .map(d => d.sold_price)
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b)

  const days = data
    .map(d => d.days_to_sell)
    .filter((d): d is number => d != null)

  const sum = prices.reduce((a, b) => a + b, 0)
  const avg = sum / prices.length
  const mid = Math.floor(prices.length / 2)
  const median = prices.length % 2 !== 0
    ? prices[mid]
    : (prices[mid - 1] + prices[mid]) / 2

  const avgDays = days.length > 0
    ? days.reduce((a, b) => a + b, 0) / days.length
    : null

  return {
    sample_count: data.length,
    avg_sold_price: Math.round(avg * 100) / 100,
    min_sold_price: prices[0],
    max_sold_price: prices[prices.length - 1],
    median_sold_price: Math.round(median * 100) / 100,
    avg_days_to_sell: avgDays ? Math.round(avgDays * 10) / 10 : null,
    sold_count: data.filter(d => d.sold).length,
    unsold_count: data.filter(d => !d.sold).length,
    match_level: matchLevel,
  }
}

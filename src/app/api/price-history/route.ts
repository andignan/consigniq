// app/api/price-history/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile(supabase)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const name = searchParams.get('name')
  const excludeItemId = searchParams.get('exclude_item_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50)

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }

  let query = supabase
    .from('price_history')
    .select('*')
    .eq('account_id', auth.profile.account_id)
    .eq('category', category)
    .eq('sold', true)
    .order('sold_at', { ascending: false })
    .limit(limit)

  if (excludeItemId) {
    query = query.neq('item_id', excludeItemId)
  }

  if (name) {
    query = query.ilike('name', `%${name}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If name search returned few results, do a broader category-only search
  if (name && (data?.length ?? 0) < limit) {
    const broadQuery = supabase
      .from('price_history')
      .select('*')
      .eq('account_id', auth.profile.account_id)
      .eq('category', category)
      .eq('sold', true)
      .order('sold_at', { ascending: false })
      .limit(limit)

    if (excludeItemId) {
      broadQuery.neq('item_id', excludeItemId)
    }

    const { data: broadData } = await broadQuery

    const seenIds = new Set((data ?? []).map((r: Record<string, unknown>) => r.id))
    const merged = [...(data ?? [])]
    for (const row of broadData ?? []) {
      const r = row as Record<string, unknown>
      if (!seenIds.has(r.id) && merged.length < limit) {
        merged.push(row)
        seenIds.add(r.id)
      }
    }

    return NextResponse.json({ history: merged })
  }

  return NextResponse.json({ history: data ?? [] })
}

// app/api/admin/network-stats/route.ts
// M7: Queries sold records directly instead of fetching all and filtering in JS
import { checkSuperadmin, createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: auth.status }
    )
  }

  const supabase = createAdminClient()

  // M7: Two parallel queries — total count + sold records only
  const [totalRes, soldRes] = await Promise.all([
    supabase.from('price_history').select('*', { count: 'exact', head: true }),
    supabase.from('price_history')
      .select('category, sold_price, days_to_sell')
      .eq('sold', true),
  ])

  if (soldRes.error) {
    return NextResponse.json({ error: soldRes.error.message }, { status: 500 })
  }

  const soldRecords = soldRes.data ?? []
  const daysValues = soldRecords
    .map(r => r.days_to_sell)
    .filter((d): d is number => d != null)

  const avgDays = daysValues.length > 0
    ? Math.round((daysValues.reduce((a, b) => a + b, 0) / daysValues.length) * 10) / 10
    : null

  // Top 5 categories by record count (from sold records)
  const categoryCounts: Record<string, number> = {}
  for (const r of soldRecords) {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
  }
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }))

  return NextResponse.json({
    total_records: totalRes.count ?? 0,
    sold_items: soldRecords.length,
    top_categories: topCategories,
    avg_days_to_sell: avgDays,
  })
}

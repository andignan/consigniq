// app/api/admin/network-stats/route.ts
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

  // Fetch all price_history records for network stats
  const { data: records, error } = await supabase
    .from('price_history')
    .select('category, sold, sold_price, days_to_sell')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const allRecords = records ?? []
  const soldRecords = allRecords.filter(r => r.sold === true)
  const daysValues = soldRecords
    .map(r => r.days_to_sell)
    .filter((d): d is number => d != null)

  const avgDays = daysValues.length > 0
    ? Math.round((daysValues.reduce((a, b) => a + b, 0) / daysValues.length) * 10) / 10
    : null

  // Top 5 categories by record count
  const categoryCounts: Record<string, number> = {}
  for (const r of allRecords) {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
  }
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }))

  return NextResponse.json({
    total_records: allRecords.length,
    sold_items: soldRecords.length,
    top_categories: topCategories,
    avg_days_to_sell: avgDays,
  })
}

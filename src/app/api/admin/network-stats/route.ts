// app/api/admin/network-stats/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check superadmin
  const { data: profile } = await supabase
    .from('users')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

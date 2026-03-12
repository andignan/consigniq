// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { differenceInDays, parseISO } from 'date-fns'

function daysLeft(expiryDate: string) {
  return differenceInDays(parseISO(expiryDate), new Date())
}

function urgencyColor(days: number) {
  if (days > 14) return 'bg-emerald-500'
  if (days > 7) return 'bg-amber-400'
  if (days > 0) return 'bg-orange-500'
  return 'bg-red-500'
}

function urgencyBadge(days: number, status: string) {
  if (status === 'grace') return { label: 'Grace period', color: 'text-red-600 bg-red-50 border-red-200' }
  if (days <= 0) return { label: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' }
  if (days <= 7) return { label: `${days}d left`, color: 'text-orange-700 bg-orange-50 border-orange-200' }
  if (days <= 14) return { label: `${days}d left`, color: 'text-amber-700 bg-amber-50 border-amber-200' }
  return { label: `${days}d left`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load all active consignors
  const { data: consignors } = await supabase
    .from('consignors')
    .select('*, items(count)')
    .in('status', ['active', 'grace'])
    .order('expiry_date', { ascending: true })

  // Load summary counts
  const { count: pendingCount } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: pricedCount } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'priced')

  const { data: soldItems } = await supabase
    .from('items')
    .select('sold_price')
    .eq('status', 'sold')

  const totalSoldValue = soldItems?.reduce((sum, i) => sum + (i.sold_price || 0), 0) ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Consignors', value: consignors?.length ?? 0, sub: 'on the floor' },
          { label: 'Needs Pricing', value: pendingCount ?? 0, sub: 'items pending', urgent: (pendingCount ?? 0) > 0 },
          { label: 'Items on Floor', value: pricedCount ?? 0, sub: 'priced & active' },
          { label: 'Total Sold Value', value: `$${totalSoldValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'all time' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-xl border p-5 ${stat.urgent ? 'border-amber-300' : 'border-stone-200'}`}>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.urgent ? 'text-amber-600' : 'text-stone-900'}`}>
              {stat.value}
            </p>
            <p className="text-xs text-stone-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Consignor lifecycle list */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Active Consignors</h2>
          <a href="/dashboard/consignors/new"
            className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-1.5 rounded-lg transition-colors">
            + New Consignor
          </a>
        </div>

        {!consignors?.length ? (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">
            No active consignors yet. Add your first one to get started.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {consignors.map(c => {
              const days = daysLeft(c.expiry_date)
              const badge = urgencyBadge(days, c.status)
              const pct = Math.min(100, Math.max(0, ((60 - days) / 60) * 100))

              return (
                <a key={c.id} href={`/dashboard/consignors/${c.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors">
                  {/* Urgency dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${urgencyColor(days)}`} />

                  {/* Name + progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-stone-900 text-sm truncate">{c.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${urgencyColor(days)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Item count */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-stone-500">
                      {(c.items as any)?.[0]?.count ?? 0} items
                    </p>
                    <p className="text-xs text-stone-400">
                      Expires {new Date(c.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

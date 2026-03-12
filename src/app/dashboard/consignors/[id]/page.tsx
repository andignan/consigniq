// app/dashboard/consignors/[id]/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Plus, Tag, Phone, Mail, FileText,
  Clock, Package, AlertTriangle, Trash2, DollarSign
} from 'lucide-react'
import { getLifecycleStatus, COLOR_CLASSES, CONDITION_LABELS, type Item } from '@/types'

// ============================================================
// Item status badge
// ============================================================
function ItemStatusBadge({ status }: { status: Item['status'] }) {
  const map: Record<Item['status'], { label: string; className: string }> = {
    pending: { label: 'Pending Price', className: 'bg-amber-100 text-amber-700' },
    priced: { label: 'Priced', className: 'bg-indigo-100 text-indigo-700' },
    sold: { label: 'Sold', className: 'bg-emerald-100 text-emerald-700' },
    donated: { label: 'Donated', className: 'bg-gray-100 text-gray-600' },
    returned: { label: 'Returned', className: 'bg-gray-100 text-gray-600' },
  }
  const { label, className } = map[status]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}

// ============================================================
// Page
// ============================================================
export default async function ConsignorDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { intake?: string; count?: string }
}) {
  const supabase = createServerClient()

  const [consignorRes, itemsRes] = await Promise.all([
    supabase.from('consignors').select('*').eq('id', params.id).single(),
    supabase.from('items').select('*').eq('consignor_id', params.id).order('created_at', { ascending: true }),
  ])

  if (consignorRes.error || !consignorRes.data) notFound()

  const consignor = consignorRes.data
  const items: Item[] = itemsRes.data ?? []

  const lifecycle = getLifecycleStatus(
    consignor.intake_date,
    consignor.expiry_date,
    consignor.grace_end_date
  )
  const colors = COLOR_CLASSES[lifecycle.color]

  const pendingItems = items.filter(i => i.status === 'pending')
  const pricedItems = items.filter(i => i.status === 'priced')
  const soldItems = items.filter(i => i.status === 'sold')

  const totalOwed = soldItems.reduce((sum, i) => {
    return sum + ((i.sold_price ?? 0) * (consignor.split_consignor / 100))
  }, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <Link
        href="/dashboard/consignors"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Consignors
      </Link>

      {/* Intake success banner */}
      {searchParams.intake === 'done' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-700 flex items-center gap-2">
          <Package className="w-4 h-4 shrink-0" />
          {searchParams.count} item{Number(searchParams.count) !== 1 ? 's' : ''} logged successfully.
          <Link href={`/dashboard/consignors/${params.id}/intake`} className="ml-auto font-medium underline">
            Add more
          </Link>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{consignor.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {consignor.phone && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                  {consignor.phone}
                </span>
              )}
              {consignor.email && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  {consignor.email}
                </span>
              )}
            </div>
          </div>

          {/* Lifecycle badge */}
          <div className="flex flex-col items-end gap-2">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${colors.badge}`}>
              {lifecycle.label}
            </span>
            {lifecycle.isGrace && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                Contact consignor for pickup
              </span>
            )}
            {lifecycle.isDonationEligible && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Trash2 className="w-3 h-3" />
                Items may be donated
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Intake: {formatDate(consignor.intake_date)}</span>
            <span>Expires: {formatDate(consignor.expiry_date)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colors.bar}`}
              style={{ width: `${lifecycle.progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Day {lifecycle.daysElapsed}</span>
            <span>Grace ends: {formatDate(consignor.grace_end_date)}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Pending" value={pendingItems.length} highlight={pendingItems.length > 0} />
          <StatBox label="Priced" value={pricedItems.length} />
          <StatBox label="Sold" value={soldItems.length} />
          <StatBox
            label="Owed"
            value={`$${totalOwed.toFixed(2)}`}
            highlight={totalOwed > 0}
          />
        </div>

        {consignor.notes && (
          <div className="mt-4 flex gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <FileText className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
            {consignor.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <Link
          href={`/dashboard/consignors/${params.id}/intake`}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Items
        </Link>
        <div className="flex-1" />
        <div className="text-xs text-gray-400 flex items-center">
          {consignor.split_store}/{consignor.split_consignor} split
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Items <span className="text-gray-400 font-normal">({items.length})</span>
          </h2>
          {pendingItems.length > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {pendingItems.length} need pricing
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No items yet</p>
            <Link
              href={`/dashboard/consignors/${params.id}/intake`}
              className="text-indigo-600 text-sm mt-2 block"
            >
              Start intake →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(item => (
              <ItemRow key={item.id} item={item} consignorId={params.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-indigo-50' : 'bg-gray-50'}`}>
      <div className={`text-lg font-bold ${highlight ? 'text-indigo-700' : 'text-gray-700'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function ItemRow({ item, consignorId }: { item: Item; consignorId: string }) {
  const isPending = item.status === 'pending'
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{item.name}</span>
          <span className="text-xs text-gray-400">{item.category}</span>
          <span className="text-xs text-gray-400">· {CONDITION_LABELS[item.condition]}</span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {item.price != null && (
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-800">
              ${item.price.toFixed(2)}
            </div>
            {item.low_price != null && item.high_price != null && (
              <div className="text-xs text-gray-400">
                ${item.low_price}–${item.high_price}
              </div>
            )}
          </div>
        )}
        <ItemStatusBadge status={item.status} />
        {isPending && (
          <Link
            href={`/dashboard/inventory/${item.id}/price`}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Tag className="w-3 h-3" />
            Price
          </Link>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

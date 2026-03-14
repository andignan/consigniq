'use client'

import Link from 'next/link'
import { Phone, Mail, Package, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'
import { getLifecycleStatus, COLOR_CLASSES, type Consignor } from '@/types'
import Tooltip from '@/components/Tooltip'

interface ConsignorCardProps {
  consignor: Consignor & { item_count?: number; pending_count?: number }
  onClick?: () => void
}

export function ConsignorCard({ consignor }: ConsignorCardProps) {
  const lifecycle = getLifecycleStatus(
    consignor.intake_date,
    consignor.expiry_date,
    consignor.grace_end_date
  )
  const colors = COLOR_CLASSES[lifecycle.color]

  return (
    <Link
      href={`/dashboard/consignors/${consignor.id}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-150 group"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {consignor.name}
              </h3>
              {lifecycle.isDonationEligible && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Trash2 className="w-3 h-3" />
                  Donate
                  <Tooltip content="This consignor's agreement and grace period have both ended. Their unsold items can now be marked for donation." />
                </span>
              )}
              {lifecycle.isGrace && !lifecycle.isDonationEligible && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Grace
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {consignor.phone && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Phone className="w-3 h-3" />
                  {consignor.phone}
                </span>
              )}
              {consignor.email && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[140px]">{consignor.email}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors.badge}`}>
              {lifecycle.label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
          </div>
        </div>

        {/* Lifecycle progress bar */}
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colors.bar}`}
              style={{ width: `${lifecycle.progressPct}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            <span>
              {consignor.item_count ?? 0} item{(consignor.item_count ?? 0) !== 1 ? 's' : ''}
              {(consignor.pending_count ?? 0) > 0 && (
                <span className="ml-1 text-amber-600 font-medium">
                  · {consignor.pending_count} pending
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {consignor.split_store}/{consignor.split_consignor} split
            </span>
            <span>
              Intake {formatDate(consignor.intake_date)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================
// Skeleton loader for lists
// ============================================================
export function ConsignorCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-36 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
        <div className="h-6 bg-gray-100 rounded-full w-16" />
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mb-3" />
      <div className="flex justify-between">
        <div className="h-3 bg-gray-100 rounded w-20" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
    </div>
  )
}

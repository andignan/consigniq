// app/dashboard/consignors/new/page.tsx
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { NewConsignorForm } from '@/components/NewConsignorForm'
import { createServerClient } from '@/lib/supabase/server'

async function getLocationDefaults(locationId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('locations')
    .select('default_split_store, default_split_consignor, agreement_days, grace_days')
    .eq('id', locationId)
    .single()
  return data
}

export default async function NewConsignorPage({
  searchParams,
}: {
  searchParams: { location_id?: string; account_id?: string }
}) {
  const locationId = searchParams.location_id ?? process.env.DEFAULT_LOCATION_ID ?? ''
  const accountId = searchParams.account_id ?? process.env.DEFAULT_ACCOUNT_ID ?? ''
  const defaults = locationId ? await getLocationDefaults(locationId) : null

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Back nav */}
      <Link
        href="/dashboard/consignors"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Consignors
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-navy-800">New Consignor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the consignor&apos;s info, then you&apos;ll be taken straight to item intake.
        </p>
      </div>

      <NewConsignorForm
        locationId={locationId}
        accountId={accountId}
        defaultSplitStore={defaults?.default_split_store ?? 60}
        defaultSplitConsignor={defaults?.default_split_consignor ?? 40}
        agreementDays={defaults?.agreement_days ?? 60}
        graceDays={defaults?.grace_days ?? 3}
      />
    </div>
  )
}

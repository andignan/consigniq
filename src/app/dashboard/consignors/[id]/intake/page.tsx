// app/dashboard/consignors/[id]/intake/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { IntakeQueue } from '@/components/IntakeQueue'
import type { Consignor, Item } from '@/types'

export default function IntakePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [consignor, setConsignor] = useState<Consignor | null>(null)
  const [existingItems, setExistingItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [consRes, itemsRes] = await Promise.all([
          fetch(`/api/consignors/${id}`, { credentials: 'include' }),
          fetch(`/api/items?consignor_id=${id}&status=pending`, { credentials: 'include' }),
        ])

        if (!consRes.ok) throw new Error('Failed to load consignor')

        const { consignor } = await consRes.json()
        const { items } = itemsRes.ok ? await itemsRes.json() : { items: [] }

        setConsignor(consignor)
        setExistingItems(items ?? [])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function handleDone(savedCount: number) {
    router.push(`/dashboard/consignors/${id}?intake=done&count=${savedCount}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error || !consignor) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-sm text-red-600">{error ?? 'Consignor not found'}</p>
        <Link href="/dashboard/consignors" className="text-brand-500 hover:text-brand-600 text-sm mt-4 block">
          ← Back to Consignors
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full lg:max-w-5xl lg:mx-auto px-4 py-6">
      <Link
        href={`/dashboard/consignors/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {consignor.name}
      </Link>

      <IntakeQueue
        consignorId={consignor.id}
        consignorName={consignor.name}
        accountId={consignor.account_id}
        locationId={consignor.location_id}
        existingItems={existingItems}
        onDone={handleDone}
      />
    </div>
  )
}

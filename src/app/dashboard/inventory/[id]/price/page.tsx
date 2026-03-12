// app/dashboard/inventory/[id]/price/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Loader2, Sparkles, CheckCircle, DollarSign,
  ExternalLink, AlertCircle, RefreshCw, Search,
} from 'lucide-react'
import type { Item } from '@/types'
import type { CompResult } from '@/app/api/pricing/comps/route'
import type { PriceSuggestion } from '@/app/api/pricing/suggest/route'

type Stage = 'loading' | 'loaded' | 'fetching-comps' | 'pricing' | 'comps-ready' | 'ready' | 'applying' | 'done' | 'error'

export default function PricingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [item, setItem] = useState<Item | null>(null)
  const [comps, setComps] = useState<CompResult[]>([])
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [error, setError] = useState<string | null>(null)
  const [manualPrice, setManualPrice] = useState('')
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  // Load item
  useEffect(() => {
    async function loadItem() {
      try {
        const allRes = await fetch(`/api/items?status=pending`)
        if (!allRes.ok) throw new Error('Failed to load items')
        const { items } = await allRes.json()
        const found = (items as Item[]).find(i => i.id === id)
        if (!found) {
          const anyRes = await fetch(`/api/items?search=`)
          const { items: allItems } = await anyRes.json()
          const anyFound = (allItems as Item[]).find((i: Item) => i.id === id)
          if (!anyFound) throw new Error('Item not found')
          setItem(anyFound)
        } else {
          setItem(found)
        }
        setStage('loaded')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item')
        setStage('error')
      }
    }
    loadItem()
  }, [id])

  async function fetchComps(): Promise<CompResult[]> {
    if (!item) return []
    setStage('fetching-comps')
    try {
      const res = await fetch('/api/pricing/comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          description: item.description,
          condition: item.condition,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.comps ?? []
      }
    } catch {
      // Comps are optional
    }
    return []
  }

  async function runCompsOnly() {
    if (!item) return
    setError(null)
    setSuggestion(null)
    setComps([])
    setManualPrice('')

    const fetchedComps = await fetchComps()
    setComps(fetchedComps)
    setStage('comps-ready')
  }

  async function runFullPricing() {
    if (!item) return
    setError(null)
    setSuggestion(null)
    setComps([])
    setManualPrice('')

    const fetchedComps = await fetchComps()
    setComps(fetchedComps)

    setStage('pricing')
    try {
      const suggestRes = await fetch('/api/pricing/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          condition: item.condition,
          description: item.description,
          comps: fetchedComps,
        }),
      })
      if (!suggestRes.ok) {
        const errData = await suggestRes.json()
        throw new Error(errData.error ?? 'Pricing failed')
      }
      const { suggestion: s } = await suggestRes.json()
      setSuggestion(s)
      setStage('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI pricing failed')
      setStage('error')
    }
  }

  const hasManualPrice = manualPrice !== '' && parseFloat(manualPrice) > 0
  const finalPrice = hasManualPrice ? parseFloat(manualPrice) : suggestion?.price ?? 0
  const hasResults = stage === 'comps-ready' || stage === 'ready'
  // Comps-only mode requires manual price; full AI mode can use suggestion or manual
  const canApply = hasResults && (suggestion ? finalPrice > 0 : hasManualPrice)

  async function applyPrice() {
    if (!item || !canApply) return
    setStage('applying')
    try {
      const res = await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          price: finalPrice,
          low_price: hasManualPrice ? null : suggestion?.low ?? null,
          high_price: hasManualPrice ? null : suggestion?.high ?? null,
          ai_reasoning: suggestion?.reasoning ?? null,
        }),
      })
      if (!res.ok) throw new Error('Failed to apply price')

      try {
        const pendingRes = await fetch('/api/items?status=pending')
        if (pendingRes.ok) {
          const { items: pending } = await pendingRes.json()
          setPendingCount((pending as Item[]).length)
        }
      } catch {
        // Non-critical
      }

      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply price')
      setStage('error')
    }
  }

  // Loading state
  if (stage === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  // Error with no item
  if (stage === 'error' && !item) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-sm text-red-600">{error ?? 'Item not found'}</p>
        <Link href="/dashboard" className="text-indigo-600 text-sm mt-4 block">
          &larr; Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!item) return null

  // Done state
  if (stage === 'done') {
    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Price Applied</h2>
          <p className="text-sm text-gray-500 mb-1">
            {item.name} — <strong>${finalPrice.toFixed(2)}</strong>
          </p>
          {!hasManualPrice && suggestion && (
            <p className="text-xs text-gray-400 mb-6">
              Range: ${suggestion.low.toFixed(2)} – ${suggestion.high.toFixed(2)}
            </p>
          )}
          {hasManualPrice && (
            <p className="text-xs text-gray-400 mb-6">Manual override</p>
          )}
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/inventory?status=priced"
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              View Priced
            </Link>
            {pendingCount != null && pendingCount > 0 ? (
              <Link
                href="/dashboard/inventory?status=pending"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
              >
                Price Next Item ({pendingCount})
              </Link>
            ) : (
              <Link
                href="/dashboard/inventory"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
              >
                View Inventory
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Item details card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{item.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                {item.category}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {item.condition}
              </span>
              {(item as Item & { consignor?: { name: string } }).consignor?.name && (
                <span className="text-xs text-gray-400">
                  {(item as Item & { consignor?: { name: string } }).consignor?.name}
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            item.status === 'pending'
              ? 'bg-amber-50 text-amber-600'
              : item.status === 'priced'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {item.status}
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-gray-500">{item.description}</p>
        )}
      </div>

      {/* Action buttons */}
      {stage === 'loaded' && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={runCompsOnly}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            eBay Comps Only
          </button>
          <button
            onClick={runFullPricing}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Full AI Pricing
          </button>
        </div>
      )}

      {/* Progress states */}
      {(stage === 'fetching-comps' || stage === 'pricing') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">
              {stage === 'fetching-comps'
                ? 'Searching eBay sold listings...'
                : 'Analyzing pricing with AI...'}
            </span>
          </div>
          <div className="flex gap-2">
            <div className={`h-1.5 rounded-full flex-1 transition-colors ${
              stage === 'fetching-comps' ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-500'
            }`} />
            <div className={`h-1.5 rounded-full flex-1 transition-colors ${
              stage === 'pricing' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-200'
            }`} />
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          {/* AI Price suggestion (only in full pricing mode) */}
          {suggestion && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900">AI Price Suggestion</h2>
              </div>

              <div className="flex items-baseline gap-3 mb-3">
                <div className="flex items-baseline gap-1">
                  <DollarSign className="w-5 h-5 text-gray-400 self-center" />
                  <span className="text-3xl font-bold text-gray-900">
                    {suggestion.price.toFixed(2)}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  Range: ${suggestion.low.toFixed(2)} – ${suggestion.high.toFixed(2)}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{suggestion.reasoning}</p>
              </div>
            </div>
          )}

          {/* Comparable sales */}
          {comps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                eBay Comparable Sales
              </h2>
              <div className="space-y-2">
                {comps.slice(0, 5).map((comp, i) => (
                  <a
                    key={i}
                    href={comp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    {comp.thumbnail && (
                      <img
                        src={comp.thumbnail}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{comp.title}</p>
                      {comp.condition && (
                        <p className="text-xs text-gray-400">{comp.condition}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-semibold text-gray-900">
                        ${comp.price.toFixed(2)}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* No comps found (comps-only mode) */}
          {comps.length === 0 && !suggestion && (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-400">No eBay comparable sales found for this item.</p>
            </div>
          )}

          {/* Manual price + Apply */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="border border-gray-200 rounded-xl p-4 mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {suggestion ? 'Manual Price Override' : 'Enter Price'}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPrice}
                  onChange={e => setManualPrice(e.target.value)}
                  placeholder={suggestion ? suggestion.price.toFixed(2) : '0.00'}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {hasManualPrice && suggestion && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Manual price will be used instead of AI suggestion
                </p>
              )}
              {!suggestion && !hasManualPrice && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Enter a price based on the comps above
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={applyPrice}
                disabled={!canApply}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                {canApply ? `Apply Price — $${finalPrice.toFixed(2)}` : 'Enter a price to apply'}
              </button>
              <button
                onClick={suggestion ? runFullPricing : runCompsOnly}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {stage === 'error' && error && item && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-medium text-red-700">Pricing Error</p>
          </div>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={runFullPricing}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

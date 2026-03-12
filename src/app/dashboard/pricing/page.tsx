// app/dashboard/pricing/page.tsx
'use client'

import { useState } from 'react'
import {
  Sparkles, Loader2, DollarSign, ExternalLink, RefreshCw, AlertCircle,
} from 'lucide-react'
import { ITEM_CATEGORIES, CONDITION_LABELS, type ItemCondition } from '@/types'
import type { CompResult } from '@/app/api/pricing/comps/route'
import type { PriceSuggestion } from '@/app/api/pricing/suggest/route'

type Stage = 'idle' | 'fetching-comps' | 'pricing' | 'ready' | 'error'

export default function PriceLookupPage() {
  // Form
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(ITEM_CATEGORIES[0])
  const [condition, setCondition] = useState<ItemCondition>('good')
  const [description, setDescription] = useState('')

  // Results
  const [comps, setComps] = useState<CompResult[]>([])
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  async function runPricing() {
    if (!name.trim()) return
    setError(null)
    setSuggestion(null)
    setComps([])

    // Step 1: Fetch comps
    setStage('fetching-comps')
    let fetchedComps: CompResult[] = []
    try {
      const compsRes = await fetch('/api/pricing/comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, description, condition }),
      })
      if (compsRes.ok) {
        const data = await compsRes.json()
        fetchedComps = data.comps ?? []
        console.log('[price-lookup] Comps response:', { source: data.source, count: fetchedComps.length, comps: fetchedComps })
      } else {
        console.error('[price-lookup] Comps fetch failed:', compsRes.status)
      }
    } catch (err) {
      console.error('[price-lookup] Comps fetch error:', err)
    }
    console.log('[price-lookup] Setting comps state:', fetchedComps.length)
    setComps(fetchedComps)

    // Step 2: AI pricing
    setStage('pricing')
    try {
      const suggestRes = await fetch('/api/pricing/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, condition, description, comps: fetchedComps }),
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

  function reset() {
    setName('')
    setCategory(ITEM_CATEGORIES[0])
    setCondition('good')
    setDescription('')
    setComps([])
    setSuggestion(null)
    setStage('idle')
    setError(null)
  }

  const isRunning = stage === 'fetching-comps' || stage === 'pricing'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Price Lookup</h1>
        <p className="text-sm text-gray-400">
          Quick pricing tool — nothing saved to the database
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isRunning && runPricing()}
              placeholder="e.g. Waterford Crystal Lismore Vase"
              disabled={isRunning}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              >
                {ITEM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Condition</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as ItemCondition)}
                disabled={isRunning}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              >
                {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brand, size, color, markings, damage..."
              disabled={isRunning}
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={runPricing}
            disabled={!name.trim() || isRunning}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {stage === 'fetching-comps' ? 'Searching comps...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Get AI Price Suggestion
              </>
            )}
          </button>
          {(stage === 'ready' || stage === 'error') && (
            <button
              onClick={reset}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="flex gap-2 mb-4">
          <div className={`h-1.5 rounded-full flex-1 transition-colors ${
            stage === 'fetching-comps' ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-500'
          }`} />
          <div className={`h-1.5 rounded-full flex-1 transition-colors ${
            stage === 'pricing' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-200'
          }`} />
        </div>
      )}

      {/* Results */}
      {stage === 'ready' && suggestion && (
        <div className="space-y-4">
          {/* Price suggestion */}
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

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed">{suggestion.reasoning}</p>
            </div>

            <button
              onClick={runPricing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Re-run
            </button>
          </div>

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
        </div>
      )}

      {/* Error */}
      {stage === 'error' && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-medium text-red-700">Pricing Error</p>
          </div>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={runPricing}
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

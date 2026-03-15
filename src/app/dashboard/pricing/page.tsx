// app/dashboard/pricing/page.tsx
'use client'

import { useRef, useState } from 'react'
import {
  Sparkles, Loader2, DollarSign, ExternalLink, RefreshCw, AlertCircle,
  Camera, X, Search,
} from 'lucide-react'
import { ITEM_CATEGORIES, CONDITION_LABELS, type ItemCondition } from '@/types'
import { getDescriptionHint } from '@/lib/description-hints'
import { compressImage } from '@/lib/compress-image'
import type { CompResult } from '@/app/api/pricing/comps/route'
import type { PriceSuggestion } from '@/app/api/pricing/suggest/route'
import { useUser } from '@/contexts/UserContext'
import { Check } from 'lucide-react'

type Stage = 'idle' | 'identifying' | 'fetching-comps' | 'pricing' | 'comps-ready' | 'ready' | 'error'

export default function PriceLookupPage() {
  // Form
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(ITEM_CATEGORIES[0])
  const [condition, setCondition] = useState<ItemCondition>('good')
  const [description, setDescription] = useState('')

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoMediaType, setPhotoMediaType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Results
  const [comps, setComps] = useState<CompResult[]>([])
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const contextUser = useUser()
  const isSolo = (contextUser?.accounts?.tier ?? 'starter') === 'solo'

  async function handlePhoto(file: File) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are supported')
      return
    }

    setStage('identifying')
    setError(null)
    try {
      // Compress image client-side before sending
      const compressed = await compressImage(file)
      setPhotoPreview(compressed.previewUrl)
      setPhotoBase64(compressed.base64)
      setPhotoMediaType(compressed.mediaType)

      const compressedFile = new File([compressed.blob], 'photo.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('photo', compressedFile)
      const res = await fetch('/api/pricing/identify', { method: 'POST', credentials: 'include', body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Identification failed')
      }
      const { result } = await res.json()
      setName(result.name)
      if (ITEM_CATEGORIES.includes(result.category)) setCategory(result.category)
      if (['excellent', 'very_good', 'good', 'fair', 'poor'].includes(result.condition)) {
        setCondition(result.condition as ItemCondition)
      }
      setDescription(result.description)
      setStage('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo identification failed')
      setStage('idle')
    }
  }

  function clearPhoto() {
    setPhotoPreview(null)
    setPhotoBase64(null)
    setPhotoMediaType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function fetchComps(): Promise<CompResult[]> {
    setStage('fetching-comps')
    try {
      const res = await fetch('/api/pricing/comps', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, description, condition }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.comps ?? []
      }
    } catch (err) {
      console.error('[price-lookup] Comps fetch error:', err)
    }
    return []
  }

  async function runCompsOnly() {
    if (!name.trim()) return
    setError(null)
    setSuggestion(null)
    setComps([])

    const fetchedComps = await fetchComps()
    setComps(fetchedComps)
    setStage(fetchedComps.length > 0 ? 'comps-ready' : 'comps-ready')
  }

  async function runFullPricing(existingComps?: CompResult[]) {
    if (!name.trim()) return
    setError(null)
    setSuggestion(null)

    let fetchedComps: CompResult[]
    if (existingComps) {
      fetchedComps = existingComps
    } else {
      setComps([])
      fetchedComps = await fetchComps()
      setComps(fetchedComps)
    }

    setStage('pricing')
    try {
      const suggestRes = await fetch('/api/pricing/suggest', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, category, condition, description, comps: fetchedComps,
          ...(photoBase64 && photoMediaType ? { photoBase64, photoMediaType } : {}),
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

  function reset() {
    setName('')
    setCategory(ITEM_CATEGORIES[0])
    setCondition('good')
    setDescription('')
    setComps([])
    setSuggestion(null)
    setStage('idle')
    setError(null)
    setSaved(false)
    setSaving(false)
    clearPhoto()
  }

  async function saveToInventory() {
    if (!suggestion || !name.trim() || saving || saved) return
    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: contextUser?.account_id,
          location_id: contextUser?.location_id,
          name: name.trim(),
          category,
          condition,
          description: description || null,
          consignor_id: null,
          price: suggestion.price,
          low_price: suggestion.low,
          high_price: suggestion.high,
          ai_reasoning: suggestion.reasoning,
        }),
      })
      if (res.ok) {
        setSaved(true)
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  const isRunning = stage === 'identifying' || stage === 'fetching-comps' || stage === 'pricing'
  const hasResults = stage === 'comps-ready' || stage === 'ready'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Price Lookup</h1>
        <p className="text-sm text-gray-400">
          {isSolo ? 'Price items and save to your inventory' : 'Quick pricing tool — nothing saved to the database'}
        </p>
      </div>

      {/* Photo Upload */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handlePhoto(file)
          }}
        />
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Item photo"
              className="w-full h-48 object-contain rounded-xl bg-gray-50"
            />
            <button
              onClick={clearPhoto}
              className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-sm transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
            {stage === 'identifying' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Identifying item...
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            Upload a photo to auto-identify
          </button>
        )}
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
              onKeyDown={e => e.key === 'Enter' && !isRunning && runFullPricing()}
              onBlur={e => {
                const v = e.target.value.trim()
                if (v) setName(v.replace(/\b\w/g, c => c.toUpperCase()))
              }}
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
            {(() => {
              const hint = getDescriptionHint(category, description)
              return hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null
            })()}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={runCompsOnly}
            disabled={!name.trim() || isRunning}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:border-gray-200 disabled:text-gray-400 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {isRunning && !suggestion && stage === 'fetching-comps' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching comps...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                eBay Comps Only
              </>
            )}
          </button>
          <button
            onClick={() => runFullPricing()}
            disabled={!name.trim() || isRunning}
            title={!name.trim() ? 'Enter an item name to get AI pricing' : undefined}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {isRunning && (stage === 'pricing' || (stage === 'fetching-comps' && !suggestion)) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {stage === 'fetching-comps' ? 'Searching comps...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Full AI Pricing
              </>
            )}
          </button>
          {(hasResults || stage === 'error') && (
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
      {(stage === 'fetching-comps' || stage === 'pricing') && (
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

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">{suggestion.reasoning}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => runFullPricing()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-run
                </button>
                {isSolo && !saved && (
                  <button
                    onClick={saveToInventory}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save to My Inventory
                  </button>
                )}
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <Check className="w-4 h-4" />
                    Saved to your inventory
                  </span>
                )}
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

          {/* No comps found */}
          {comps.length === 0 && !suggestion && (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-400">No eBay comparable sales found for this item.</p>
            </div>
          )}

          {/* Escalate to AI pricing from comps-only */}
          {stage === 'comps-ready' && !suggestion && (
            <button
              onClick={() => runFullPricing(comps)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Get AI Suggestion
            </button>
          )}

          {/* Price Another Item */}
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-3 rounded-xl transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Price Another Item
          </button>
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
            onClick={() => runFullPricing()}
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

'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Plus, Trash2, Check, ChevronDown, Loader2, Package, ArrowRight
} from 'lucide-react'
import { ITEM_CATEGORIES, CONDITION_LABELS, type Item, type ItemCondition } from '@/types'

// ============================================================
// Types
// ============================================================

interface DraftItem {
  id: string           // local-only temp ID
  name: string
  category: string
  condition: ItemCondition
  description: string
  saving?: boolean
  saved?: boolean
  savedId?: string     // real DB ID after save
}

function makeDraft(): DraftItem {
  return {
    id: Math.random().toString(36).slice(2),
    name: '',
    category: 'Other',
    condition: 'good',
    description: '',
  }
}

// ============================================================
// IntakeQueue
// ============================================================

interface IntakeQueueProps {
  consignorId: string
  consignorName: string
  accountId: string
  locationId: string
  existingItems?: Item[]
  onDone?: (savedCount: number) => void
}

export function IntakeQueue({
  consignorId,
  consignorName,
  accountId,
  locationId,
  existingItems = [],
  onDone,
}: IntakeQueueProps) {
  const [queue, setQueue] = useState<DraftItem[]>([makeDraft()])
  const [savedItems, setSavedItems] = useState<Item[]>(existingItems)
  const [saveAllLoading, setSaveAllLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  // ============================================================
  // Handlers
  // ============================================================

  function updateDraft(id: string, field: keyof DraftItem, value: string) {
    setQueue(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    )
  }

  function addRow() {
    setQueue(prev => [...prev, makeDraft()])
  }

  function removeRow(id: string) {
    setQueue(prev => {
      const next = prev.filter(item => item.id !== id)
      return next.length === 0 ? [makeDraft()] : next
    })
  }

  // Enter key on name field: move to category select
  function handleNameKeyDown(e: React.KeyboardEvent, rowId: string, rowIndex: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const categoryEl = document.getElementById(`category-${rowId}`)
      if (categoryEl) (categoryEl as HTMLSelectElement).focus()
    }
  }

  // Enter/Tab on last row's description: add new row
  function handleDescKeyDown(e: React.KeyboardEvent, rowId: string, rowIndex: number) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (rowIndex === queue.length - 1) {
        addRow()
        // Focus the new row's name input next tick
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('.item-name-input')
          inputs[inputs.length - 1]?.focus()
        }, 50)
      }
    }
  }

  async function saveItem(draft: DraftItem): Promise<Item | null> {
    if (!draft.name.trim()) return null

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        location_id: locationId,
        consignor_id: consignorId,
        name: draft.name.trim(),
        category: draft.category,
        condition: draft.condition,
        description: draft.description.trim() || null,
      }),
    })

    if (!res.ok) throw new Error('Failed to save item')
    const { item } = await res.json()
    return item as Item
  }

  async function handleSaveAll() {
    const unsaved = queue.filter(d => d.name.trim() && !d.saved)
    if (unsaved.length === 0) {
      onDone?.(savedItems.length)
      return
    }

    setSaveAllLoading(true)
    setError(null)

    // Mark all as saving
    setQueue(prev =>
      prev.map(d => unsaved.find(u => u.id === d.id) ? { ...d, saving: true } : d)
    )

    const results: Item[] = []
    const errors: string[] = []

    for (const draft of unsaved) {
      try {
        const item = await saveItem(draft)
        if (item) {
          results.push(item)
          setQueue(prev =>
            prev.map(d => d.id === draft.id ? { ...d, saving: false, saved: true, savedId: item.id } : d)
          )
        }
      } catch {
        errors.push(draft.name)
        setQueue(prev =>
          prev.map(d => d.id === draft.id ? { ...d, saving: false } : d)
        )
      }
    }

    setSavedItems(prev => [...prev, ...results])
    setSaveAllLoading(false)

    if (errors.length > 0) {
      setError(`Failed to save: ${errors.join(', ')}`)
    } else {
      onDone?.([...savedItems, ...results].length)
    }
  }

  async function handleDeleteSaved(itemId: string) {
    try {
      await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
      setSavedItems(prev => prev.filter(i => i.id !== itemId))
    } catch {
      setError('Failed to delete item')
    }
  }

  // ============================================================
  // Counts
  // ============================================================
  const filledRows = queue.filter(d => d.name.trim())
  const unsavedCount = filledRows.filter(d => !d.saved).length
  const totalCount = savedItems.length + filledRows.filter(d => d.saved).length

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Item Intake
          </h2>
          <p className="text-sm text-gray-500">
            {consignorName} · {totalCount} item{totalCount !== 1 ? 's' : ''} logged
          </p>
        </div>
        {savedItems.length > 0 && (
          <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2.5 py-1 rounded-full">
            {savedItems.length} saved
          </span>
        )}
      </div>

      {/* Saved items (read-only summary) */}
      {savedItems.length > 0 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
            Logged Items
          </h3>
          <div className="space-y-2">
            {savedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-sm text-gray-800 truncate">{item.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{item.category}</span>
                  <span className="text-xs text-gray-400 shrink-0">· {CONDITION_LABELS[item.condition]}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSaved(item.id)}
                  className="ml-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draft queue */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Add Items
          </span>
          <span className="text-xs text-gray-400">
            Press Enter to move between fields · Enter on last field adds a new row
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          {queue.map((draft, index) => (
            <IntakeRow
              key={draft.id}
              draft={draft}
              index={index}
              isFirst={index === 0}
              firstInputRef={index === 0 ? firstInputRef : undefined}
              onChange={updateDraft}
              onRemove={() => removeRow(draft.id)}
              onNameKeyDown={(e) => handleNameKeyDown(e, draft.id, index)}
              onDescKeyDown={(e) => handleDescKeyDown(e, draft.id, index)}
            />
          ))}
        </div>

        {/* Add row button */}
        <button
          type="button"
          onClick={addRow}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add another item
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saveAllLoading || unsavedCount === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {saveAllLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              {unsavedCount > 0
                ? `Save ${unsavedCount} Item${unsavedCount !== 1 ? 's' : ''}`
                : 'All Items Saved'
              }
            </>
          )}
        </button>

        {savedItems.length > 0 && (
          <button
            type="button"
            onClick={() => onDone?.(savedItems.length)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-5 rounded-xl transition-colors"
          >
            Done
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// IntakeRow — individual item row in the queue
// ============================================================

interface IntakeRowProps {
  draft: DraftItem
  index: number
  isFirst: boolean
  firstInputRef?: React.RefObject<HTMLInputElement>
  onChange: (id: string, field: keyof DraftItem, value: string) => void
  onRemove: () => void
  onNameKeyDown: (e: React.KeyboardEvent) => void
  onDescKeyDown: (e: React.KeyboardEvent) => void
}

function IntakeRow({
  draft,
  index,
  isFirst,
  firstInputRef,
  onChange,
  onRemove,
  onNameKeyDown,
  onDescKeyDown,
}: IntakeRowProps) {
  return (
    <div
      className={`p-4 transition-colors ${
        draft.saving ? 'bg-indigo-50' : draft.saved ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Row number */}
        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0 mt-2.5">
          {draft.saving ? (
            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
          ) : draft.saved ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            index + 1
          )}
        </div>

        {/* Fields — stacked two rows */}
        <div className="flex-1 space-y-2">
          {/* Row 1: Name, Category, Condition */}
          <div className="flex gap-2">
            <input
              ref={isFirst ? firstInputRef : undefined}
              type="text"
              value={draft.name}
              onChange={e => onChange(draft.id, 'name', e.target.value)}
              onKeyDown={onNameKeyDown}
              placeholder="Item name"
              disabled={draft.saved || draft.saving}
              className="item-name-input flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition"
            />

            <div className="relative w-40 shrink-0">
              <select
                id={`category-${draft.id}`}
                value={draft.category}
                onChange={e => onChange(draft.id, 'category', e.target.value)}
                disabled={draft.saved || draft.saving}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition bg-white"
              >
                {ITEM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative w-28 shrink-0">
              <select
                id={`condition-${draft.id}`}
                value={draft.condition}
                onChange={e => onChange(draft.id, 'condition', e.target.value as ItemCondition)}
                disabled={draft.saved || draft.saving}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition bg-white"
              >
                {(Object.entries(CONDITION_LABELS) as [ItemCondition, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2: Description — full width */}
          <textarea
            value={draft.description}
            onChange={e => onChange(draft.id, 'description', e.target.value)}
            onKeyDown={onDescKeyDown}
            placeholder="Notes / description (brand, size, color, markings, damage...)"
            disabled={draft.saved || draft.saving}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition resize-none"
          />
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          disabled={draft.saved || draft.saving}
          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 mt-2.5"
          title="Remove row"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

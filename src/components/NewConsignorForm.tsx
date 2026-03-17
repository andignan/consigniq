'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Phone, Mail, FileText, Percent, ChevronRight, Loader2, Check } from 'lucide-react'

// In production this comes from context / session
const DEFAULT_SPLIT_STORE = 60
const DEFAULT_SPLIT_CONSIGNOR = 40
const AGREEMENT_DAYS = 60
const GRACE_DAYS = 3

function addDays(date: Date, days: number): string {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  // Use local date parts to avoid UTC timezone shift
  const y = result.getFullYear()
  const m = String(result.getMonth() + 1).padStart(2, '0')
  const d = String(result.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface FormState {
  name: string
  phone: string
  email: string
  notes: string
  split_store: number
  split_consignor: number
}

interface NewConsignorFormProps {
  locationId: string
  accountId: string
  defaultSplitStore?: number
  defaultSplitConsignor?: number
  agreementDays?: number
  graceDays?: number
}

export function NewConsignorForm({
  locationId,
  accountId,
  defaultSplitStore = DEFAULT_SPLIT_STORE,
  defaultSplitConsignor = DEFAULT_SPLIT_CONSIGNOR,
  agreementDays = AGREEMENT_DAYS,
  graceDays = GRACE_DAYS,
}: NewConsignorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSplitCustom, setShowSplitCustom] = useState(false)

  const today = new Date()
  const intakeDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const expiryDate = addDays(today, agreementDays)
  const graceEndDate = addDays(today, agreementDays + graceDays)

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    notes: '',
    split_store: defaultSplitStore,
    split_consignor: defaultSplitConsignor,
  })

  function set(field: keyof FormState, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleStoreChange(val: string) {
    const n = Math.min(100, Math.max(0, parseInt(val) || 0))
    setForm(prev => ({ ...prev, split_store: n, split_consignor: 100 - n }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/consignors', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          location_id: locationId,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
          intake_date: intakeDate,
          expiry_date: expiryDate,
          grace_end_date: graceEndDate,
          split_store: form.split_store,
          split_consignor: form.split_consignor,
          status: 'active',
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to create consignor')
      }

      const { consignor } = await res.json()
      // Go straight to intake for this consignor
      router.push(`/dashboard/consignors/${consignor.id}/intake`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Consignor Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Consignor Details
        </h2>

        <div className="space-y-4">
          {/* Name — required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Jane Smith"
                required
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(708) 555-0123"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="jane@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any notes about this consignor…"
                rows={3}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Agreement Terms */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Agreement Terms
          </h2>
          <button
            type="button"
            onClick={() => setShowSplitCustom(!showSplitCustom)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {showSplitCustom ? 'Use default' : 'Customize split'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-0.5">Intake Date</div>
            <div className="text-sm font-semibold text-navy-800">{formatDisplayDate(intakeDate)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-0.5">Agreement Expires</div>
            <div className="text-sm font-semibold text-navy-800">{formatDisplayDate(expiryDate)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-0.5">Grace Period Ends</div>
            <div className="text-sm font-semibold text-navy-800">{formatDisplayDate(graceEndDate)}</div>
          </div>
          <div className="bg-brand-50 rounded-lg p-3 text-center">
            <div className="text-xs text-brand-600 mb-0.5">Split</div>
            <div className="text-sm font-semibold text-brand-800">
              {form.split_store}/{form.split_consignor}
            </div>
            <div className="text-xs text-brand-500">store / consignor</div>
          </div>
        </div>

        {showSplitCustom && (
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Percent className="inline w-4 h-4 mr-1" />
              Store keeps (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.split_store}
                onChange={e => handleStoreChange(e.target.value)}
                className="flex-1 accent-brand-600"
              />
              <div className="flex items-center gap-1 text-sm font-semibold w-24 justify-center">
                <span className="text-gray-700">{form.split_store}%</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-700">{form.split_consignor}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Consignor receives {form.split_consignor}% of final sold price
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !form.name.trim()}
        title={!form.name.trim() ? 'Enter consignor name to continue' : undefined}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating…
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Create &amp; Start Intake
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
      <p className="text-xs text-center text-gray-400">
        You&apos;ll be taken straight to item intake after creating the consignor.
      </p>
    </form>
  )
}

function formatDisplayDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

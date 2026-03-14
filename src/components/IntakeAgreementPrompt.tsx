'use client'

import { useState } from 'react'
import { Mail, Loader2, Check, X } from 'lucide-react'

interface IntakeAgreementPromptProps {
  consignorId: string
  consignorName: string
  consignorEmail: string | null
}

export default function IntakeAgreementPrompt({
  consignorId,
  consignorName,
  consignorEmail,
}: IntakeAgreementPromptProps) {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  if (dismissed || !consignorEmail) return null

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch('/api/agreements/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consignor_id: consignorId }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: `Agreement sent to ${data.email_sent_to}` })
      } else {
        setResult({ success: false, message: data.error || 'Failed to send' })
      }
    } catch {
      setResult({ success: false, message: 'Network error' })
    } finally {
      setSending(false)
    }
  }

  if (result?.success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-700 flex items-center gap-2">
        <Check className="w-4 h-4 shrink-0" />
        Agreement email sent to {consignorEmail}
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Mail className="w-4 h-4 shrink-0" />
          <span>Ready to send the agreement email to <strong>{consignorName}</strong>?</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-3 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            {sending ? 'Sending…' : 'Send'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
      {result && !result.success && (
        <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <X className="w-3 h-3" />
          {result.message}
        </div>
      )}
    </div>
  )
}

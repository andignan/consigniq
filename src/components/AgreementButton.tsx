'use client'

import { useState } from 'react'
import { Mail, Check, Loader2, X } from 'lucide-react'

interface AgreementButtonProps {
  consignorId: string
  consignorName: string
  consignorEmail: string | null
  itemCount: number
  lastSentAt: string | null
}

export default function AgreementButton({
  consignorId,
  consignorName,
  consignorEmail,
  itemCount,
  lastSentAt,
}: AgreementButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSend() {
    setSending(true)
    setResult(null)
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
        setResult({ success: false, message: data.error || 'Failed to send agreement' })
      }
    } catch {
      setResult({ success: false, message: 'Network error — please try again' })
    } finally {
      setSending(false)
    }
  }

  const hasEmail = !!consignorEmail
  const isResend = !!lastSentAt

  return (
    <>
      <button
        onClick={() => hasEmail ? setShowModal(true) : setResult({ success: false, message: 'No email address on file for this consignor.' })}
        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        <Mail className="w-4 h-4" />
        {isResend ? 'Resend Agreement' : 'Send Agreement'}
      </button>

      {isResend && (
        <span className="text-xs text-gray-400">
          Last sent {new Date(lastSentAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}

      {/* Result toast */}
      {result && !showModal && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          result.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {result.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result.message}
          <button onClick={() => setResult(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !sending && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-navy-800 mb-2">
              {isResend ? 'Resend Agreement Email?' : 'Send Agreement Email?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Send agreement email to <strong>{consignorName}</strong> at{' '}
              <strong>{consignorEmail}</strong>?
              {itemCount > 0 && (
                <> This will list all <strong>{itemCount}</strong> item{itemCount !== 1 ? 's' : ''} currently in their consignment.</>
              )}
            </p>

            {result && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${
                result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {result.message}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowModal(false); setResult(null) }}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {result?.success ? 'Close' : 'Cancel'}
              </button>
              {!result?.success && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

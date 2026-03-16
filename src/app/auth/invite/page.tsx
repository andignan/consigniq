'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { APP } from '@/lib/constants'

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-400 text-sm">Loading...</p>
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}

function InviteContent() {
  const searchParams = useSearchParams()
  const encodedLink = searchParams.get('link')
  const name = searchParams.get('name') || ''
  const account = searchParams.get('account') || ''
  const type = searchParams.get('type') // 'reset' for password reset

  const [clicked, setClicked] = useState(false)

  if (!encodedLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 mb-2">{APP.name}</h1>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 mt-6">
            <p className="text-sm text-red-600 font-medium">This link is invalid or has expired.</p>
            <p className="text-xs text-stone-400 mt-2">Please request a new invite from your administrator.</p>
          </div>
          <p className="text-center text-xs text-stone-400 mt-6">{APP.name} · {APP.version}</p>
        </div>
      </div>
    )
  }

  let decodedLink: string
  try {
    decodedLink = atob(encodedLink)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 mb-2">{APP.name}</h1>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 mt-6">
            <p className="text-sm text-red-600 font-medium">This link is invalid.</p>
          </div>
        </div>
      </div>
    )
  }

  const isReset = type === 'reset'

  function handleClick() {
    setClicked(true)
    window.location.href = decodedLink
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{APP.name}</h1>
          <p className="mt-1 text-sm text-stone-500">{APP.tagline}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
          {isReset ? (
            <>
              <h2 className="text-lg font-semibold text-stone-900 mb-2">Reset Your Password</h2>
              <p className="text-sm text-stone-500 mb-6">
                {name ? `Hi ${name}, click` : 'Click'} the button below to set a new password for your {APP.name} account.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-stone-900 mb-2">You&apos;re Invited!</h2>
              <p className="text-sm text-stone-500 mb-6">
                {name ? `Hi ${name}, y` : 'Y'}ou&apos;ve been invited to join
                {account ? <> <strong>{account}</strong></> : ''} on {APP.name}.
              </p>
            </>
          )}

          <button
            onClick={handleClick}
            disabled={clicked}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {clicked
              ? 'Redirecting...'
              : isReset
                ? 'Reset Password'
                : 'Set Up Your Account'}
          </button>

          <p className="text-xs text-stone-400 mt-4">
            This link expires in 24 hours.
          </p>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          {APP.name} · {APP.version}
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetupPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // On mount, let Supabase process the token from the URL hash
  useEffect(() => {
    const supabase = createClient()
    // Supabase auto-detects the access_token/refresh_token from the URL hash
    // and establishes a session. We wait for the auth state to settle.
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
        setReady(true)
      }
    })
    // Also check if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
  }, [])

  async function handleSubmit() {
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">ConsignIQ</h1>
          <p className="mt-1 text-sm text-stone-500">Consignment & Estate Sale Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Set Your Password</h2>
          <p className="text-sm text-stone-500 mb-6">Create a password to access your account.</p>

          {!ready && (
            <p className="text-sm text-stone-400 mb-4">Verifying your invite link...</p>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                disabled={!ready}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                disabled={!ready}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !ready || !password || !confirmPassword}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Setting password...' : 'Set Password & Sign In'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          ConsignIQ &middot; Mokena, IL &middot; v1.0
        </p>
      </div>
    </div>
  )
}

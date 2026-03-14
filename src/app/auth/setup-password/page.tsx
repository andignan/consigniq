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
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    async function establishSession() {
      const supabase = createClient()

      // 1. Parse tokens from URL hash (Supabase implicit/invite flow)
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!sessionError) {
            // Clear the hash from the URL for cleanliness
            window.history.replaceState(null, '', window.location.pathname)
            setReady(true)
            return
          }
        }
      }

      // 2. Check if already signed in (e.g. user navigated here manually)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        return
      }

      // 3. Listen for auth state changes as fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
          setReady(true)
        }
      })

      // 4. Timeout after 10 seconds
      timeout = setTimeout(() => {
        subscription.unsubscribe()
        setExpired(true)
      }, 10000)
    }

    establishSession()

    return () => {
      if (timeout) clearTimeout(timeout)
    }
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

          {expired && !ready && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-700 font-medium">This link has expired or is invalid.</p>
              <p className="text-xs text-red-600 mt-1">Please request a new invite from your administrator.</p>
            </div>
          )}

          {!ready && !expired && (
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

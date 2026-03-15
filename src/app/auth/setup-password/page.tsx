'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { APP } from '@/lib/constants'

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

export default function SetupPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

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
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!sessionError && data.user) {
            window.history.replaceState(null, '', window.location.pathname)
            const fullName = data.user.user_metadata?.full_name as string | undefined
            if (fullName) setUserName(fullName.split(' ')[0])
            if (data.user.email) setUserEmail(data.user.email)
            setReady(true)
            return
          }
        }
      }

      // 2. Check if already signed in
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const fullName = session.user.user_metadata?.full_name as string | undefined
        if (fullName) setUserName(fullName.split(' ')[0])
        if (session.user.email) setUserEmail(session.user.email)
        setReady(true)
        return
      }

      // 3. Listen for auth state changes as fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
          if (session?.user.user_metadata?.full_name) {
            setUserName((session.user.user_metadata.full_name as string).split(' ')[0])
          }
          if (session?.user.email) setUserEmail(session.user.email)
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
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{APP.name}</h1>
          <p className="mt-1 text-sm text-stone-500">{APP.tagline}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          {ready && (
            <div className="mb-3">
              <p className="text-sm text-amber-600 font-medium">
                {userName ? `Welcome to ${APP.name}, ${userName}!` : `Welcome to ${APP.name}!`}
              </p>
              {userEmail && (
                <p className="text-xs text-stone-400">{userEmail}</p>
              )}
            </div>
          )}
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  disabled={!ready}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={!ready}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
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
          {APP.name} &middot; {APP.version}
        </p>
      </div>
    </div>
  )
}

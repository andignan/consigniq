'use client'
// src/app/auth/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { APP } from '@/lib/constants'
import Logo from '@/components/Logo'

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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Check if superadmin to redirect to /admin (uses service role to bypass RLS)
      let destination = '/dashboard'
      try {
        const res = await fetch('/api/auth/check-superadmin', { credentials: 'include' })
        if (res.ok) {
          const { is_superadmin } = await res.json()
          if (is_superadmin) destination = '/admin'
        }
      } catch {
        // Non-critical — default to /dashboard
      }
      router.push(destination)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="mb-10 flex justify-center">
          <Logo size="lg" showSubtitle />
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <h2 className="text-lg font-semibold text-navy-800 mb-6">Sign in to your account</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
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

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false) }}
              className="w-full text-xs text-stone-500 hover:text-stone-700 transition-colors mt-1"
            >
              Forgot your password?
            </button>
          </div>

          {showForgot && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              {forgotSent ? (
                <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Check your email for a reset link.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-stone-600">Enter your email to receive a password reset link.</p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!forgotEmail) return
                      setForgotLoading(true)
                      try {
                        await fetch('/api/auth/forgot-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: forgotEmail }),
                        })
                      } catch {
                        // Always show success for security
                      }
                      setForgotLoading(false)
                      setForgotSent(true)
                    }}
                    disabled={forgotLoading || !forgotEmail}
                    className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          {APP.name} · {APP.version}
        </p>
      </div>
    </div>
  )
}

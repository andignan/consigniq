'use client'
// src/app/auth/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">ConsignIQ</h1>
          <p className="mt-1 text-sm text-stone-500">Consignment & Estate Sale Platform</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">Sign in to your account</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourshop.com"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          ConsignIQ · Mokena, IL · v1.0
        </p>
      </div>
    </div>
  )
}

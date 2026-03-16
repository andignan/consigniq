'use client'

import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

export default function TrialExpiredPage() {
  const tiers: Tier[] = ['solo', 'starter', 'standard', 'pro']

  async function handleCheckout(tier: string) {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const body = await res.json()
      if (body.url) {
        window.location.href = body.url
      } else {
        alert(body.error || 'Failed to create checkout session')
      }
    } catch {
      alert('Failed to connect to billing')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your trial has ended</h1>
          <p className="text-gray-500 mb-8">
            Choose a plan to continue using ConsignIQ. Your data is safe and waiting for you.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {tiers.map(tier => {
              const config = TIER_CONFIGS[tier]
              return (
                <div key={tier} className="border border-gray-200 rounded-xl p-4 text-left">
                  <h3 className="font-semibold text-gray-900">{config.label}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${config.price}<span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {config.aiPricingLimit ? `${config.aiPricingLimit} AI lookups/mo` : 'Unlimited AI lookups'}
                  </p>
                  <button
                    onClick={() => handleCheckout(tier)}
                    className="w-full mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Choose {config.label}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

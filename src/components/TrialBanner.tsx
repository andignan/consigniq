'use client'

import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

export default function TrialBanner() {
  const user = useUser()
  const account = user?.accounts
  if (!account || account.account_type !== 'trial' || !account.trial_ends_at) return null

  const now = new Date()
  const trialEnd = new Date(account.trial_ends_at)
  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  if (daysRemaining <= 0) return null // expired trials handled by layout redirect

  const color = daysRemaining > 14
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : daysRemaining > 7
      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
      : 'bg-orange-50 border-orange-200 text-orange-800'

  return (
    <div className={`border-b px-4 py-2 text-sm font-medium flex items-center justify-between ${color}`}>
      <span>Trial — {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>
      <Link
        href="/dashboard/settings?tab=account"
        className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
      >
        Upgrade Now
      </Link>
    </div>
  )
}

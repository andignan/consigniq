import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/layout/Sidebar'
import HelpWidget from '@/components/HelpWidget'
import TrialBanner from '@/components/TrialBanner'
import TrialExpiredPage from '@/components/TrialExpiredPage'
import CancellationBanner from '@/components/CancellationBanner'
import { UserProvider } from '@/contexts/UserContext'
import { LocationProvider } from '@/contexts/LocationContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  let { data: profile } = await supabase
    .from('users')
    .select('*, accounts(*), locations(*)')
    .eq('id', user.id)
    .single()

  // If RLS blocked the query (e.g. superadmin without matching account_id),
  // try with service role and redirect superadmins to /admin
  if (!profile) {
    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient
      .from('users')
      .select('*, accounts(*), locations(*)')
      .eq('id', user.id)
      .single()

    if (adminProfile?.platform_role) {
      redirect('/admin')
    }
    profile = adminProfile
  }

  if (profile?.platform_role) {
    redirect('/admin')
  }

  // Check if trial has expired — show locked page
  const accountType = profile?.accounts?.account_type
  const trialEndsAt = profile?.accounts?.trial_ends_at
  if (accountType === 'trial' && trialEndsAt) {
    const isExpired = new Date(trialEndsAt) <= new Date()
    if (isExpired) {
      return (
        <UserProvider user={profile}>
          <TrialExpiredPage />
        </UserProvider>
      )
    }
  }

  // Check if account is suspended/cancelled/deleted — show lockout
  const accountStatus = profile?.accounts?.status
  if (accountStatus === 'suspended' || accountStatus === 'cancelled' || accountStatus === 'deleted') {
    return (
      <UserProvider user={profile}>
        <TrialExpiredPage />
      </UserProvider>
    )
  }

  // Auto-transition: cancelled_grace → cancelled_limited when period_end is reached
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountData = profile?.accounts as any
  if (accountType === 'cancelled_grace' && accountData?.subscription_period_end) {
    const periodEnd = new Date(accountData.subscription_period_end)
    if (periodEnd <= new Date()) {
      // Transition to cancelled_limited
      await supabase
        .from('accounts')
        .update({ account_type: 'cancelled_limited' })
        .eq('id', profile.account_id)

      // Update the in-memory profile so the banner renders correctly
      accountData.account_type = 'cancelled_limited'
    }
  }

  // Load all locations for this account (for location switcher)
  const { data: allLocations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('account_id', profile?.account_id)
    .order('created_at', { ascending: true })

  const locationsList = (allLocations ?? []).map(l => ({ id: l.id, name: l.name }))

  return (
    <div className="flex h-screen w-full max-w-[100vw] bg-stone-50 overflow-hidden">
      <UserProvider user={profile}>
        <Suspense fallback={null}>
          <LocationProvider
            userLocationId={profile?.location_id ?? null}
            userRole={profile?.role ?? 'staff'}
            locations={locationsList}
          >
            <Sidebar user={profile} />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <TrialBanner />
              <CancellationBanner />
              <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
                {children}
              </main>
            </div>
            <HelpWidget />
          </LocationProvider>
        </Suspense>
      </UserProvider>
    </div>
  )
}

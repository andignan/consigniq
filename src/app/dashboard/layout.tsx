import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/layout/Sidebar'
import HelpWidget from '@/components/HelpWidget'
import TrialBanner from '@/components/TrialBanner'
import TrialExpiredPage from '@/components/TrialExpiredPage'
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

    if (adminProfile?.is_superadmin) {
      redirect('/admin')
    }
    // Non-superadmin with no profile — use whatever we got
    profile = adminProfile
  }

  // Superadmin users always belong in /admin, even if RLS returned a profile
  if (profile?.is_superadmin) {
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

  // Check if account is suspended/cancelled
  const accountStatus = profile?.accounts?.status
  if (accountStatus === 'suspended' || accountStatus === 'cancelled') {
    return (
      <UserProvider user={profile}>
        <TrialExpiredPage />
      </UserProvider>
    )
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

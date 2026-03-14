import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/layout/Sidebar'
import HelpWidget from '@/components/HelpWidget'
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

  // Load all locations for this account (for location switcher)
  const { data: allLocations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('account_id', profile?.account_id)
    .order('created_at', { ascending: true })

  const locationsList = (allLocations ?? []).map(l => ({ id: l.id, name: l.name }))

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      <UserProvider user={profile}>
        <Suspense fallback={null}>
          <LocationProvider
            userLocationId={profile?.location_id ?? null}
            userRole={profile?.role ?? 'staff'}
            locations={locationsList}
          >
            <Sidebar user={profile} />
            <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
              {children}
            </main>
            <HelpWidget />
          </LocationProvider>
        </Suspense>
      </UserProvider>
    </div>
  )
}

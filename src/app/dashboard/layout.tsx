import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { UserProvider } from '@/contexts/UserContext'
import { LocationProvider } from '@/contexts/LocationContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, accounts(*), locations(*)')
    .eq('id', user.id)
    .single()

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
          </LocationProvider>
        </Suspense>
      </UserProvider>
    </div>
  )
}

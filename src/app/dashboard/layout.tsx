import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { UserProvider } from '@/contexts/UserContext'

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

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      <Suspense fallback={null}>
        <Sidebar user={profile} />
      </Suspense>
      <UserProvider user={profile}>
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          {children}
        </main>
      </UserProvider>
    </div>
  )
}

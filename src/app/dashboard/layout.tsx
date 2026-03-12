import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

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
      <Sidebar user={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
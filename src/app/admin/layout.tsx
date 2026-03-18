import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminSidebar from './AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Use service role client to bypass RLS — superadmin may not have
  // an account_id that satisfies RLS policies on the users table
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('users')
    .select('id, email, full_name, platform_role')
    .eq('id', user.id)
    .single()

  if (!profile?.platform_role) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      <AdminSidebar name={profile.full_name?.trim() || 'Admin'} email={profile.email} platformRole={profile.platform_role || 'super_admin'} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}

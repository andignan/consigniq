import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ is_superadmin: false })
  }

  // Use service role to bypass RLS
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await serviceClient
    .from('users')
    .select('platform_role, is_superadmin')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    is_superadmin: !!profile?.platform_role || profile?.is_superadmin === true,
    platform_role: profile?.platform_role ?? (profile?.is_superadmin ? 'super_admin' : null),
  })
}

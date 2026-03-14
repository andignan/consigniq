// lib/supabase/admin.ts
// Service role Supabase client for admin operations that bypass RLS.
// ONLY use in server-side admin routes after verifying superadmin status.
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from './server'

/**
 * Creates a Supabase client with the service role key (bypasses RLS).
 * Use for cross-account admin queries.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Checks if the authenticated user is a superadmin.
 * Uses the regular auth client for session, then service role to read is_superadmin
 * (superadmin user may not satisfy RLS policies on the users table).
 */
export async function checkSuperadmin() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false as const, status: 401 }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) return { authorized: false as const, status: 403 }
  return { authorized: true as const, userId: user.id }
}

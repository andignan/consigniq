// lib/tier-guard.ts
// Server-side tier gate for page-level access control
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canUseFeature } from '@/lib/feature-gates'
import type { Tier, Feature } from '@/lib/tier-limits'

/**
 * Checks if the current user's tier allows access to a feature.
 * If not, redirects to /dashboard. Call at the top of server components.
 */
export async function requireFeature(feature: Feature) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('account_id, accounts(tier)')
    .eq('id', user.id)
    .single()

  const tier = ((profile?.accounts as { tier?: string } | null)?.tier ?? 'starter') as Tier

  if (!canUseFeature(tier, feature)) {
    redirect('/dashboard')
  }
}

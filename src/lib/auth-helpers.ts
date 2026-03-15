// M1/M2: Shared auth + profile lookup helpers
// Reduces duplicate 5-line auth pattern across 15+ API routes
import { NextResponse } from 'next/server'
import { ERRORS } from '@/lib/errors'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any
type User = { id: string; email?: string; [key: string]: unknown }

type AuthSuccess = { user: User; error?: never }
type AuthFailure = { user?: never; error: NextResponse }
export type AuthResult = AuthSuccess | AuthFailure

type ProfileSuccess<T = Record<string, unknown>> = { user: User; profile: T; error?: never }
type ProfileFailure = { user?: never; profile?: never; error: NextResponse }
export type ProfileResult<T = Record<string, unknown>> = ProfileSuccess<T> | ProfileFailure

/**
 * Authenticates the current user via Supabase session.
 * Returns { user } on success or { error: NextResponse } on failure.
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient
): Promise<AuthResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: ERRORS.UNAUTHORIZED }, { status: 401 }) }
  }
  return { user: user as unknown as User }
}

/**
 * Authenticates user and loads their profile from the users table.
 * @param select - columns to select from users table (default: 'account_id')
 * Returns { user, profile } on success or { error: NextResponse } on failure.
 */
export async function getAuthenticatedProfile<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  select = 'account_id'
): Promise<ProfileResult<T>> {
  const auth = await getAuthenticatedUser(supabase)
  if (auth.error) return { error: auth.error }

  const { data: profile } = await supabase
    .from('users')
    .select(select)
    .eq('id', auth.user.id)
    .single()

  if (!profile) {
    return { error: NextResponse.json({ error: ERRORS.PROFILE_NOT_FOUND }, { status: 404 }) }
  }

  return { user: auth.user, profile: profile as T }
}

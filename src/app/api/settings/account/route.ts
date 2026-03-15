import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'

export async function GET() {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string; role: string }>(supabase, 'role, account_id')
  if (auth.error) return auth.error

  if (auth.profile.role !== 'owner') {
    return NextResponse.json({ error: ERRORS.OWNER_REQUIRED }, { status: 403 })
  }

  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, name, tier, stripe_customer_id, status')
    .eq('id', auth.profile.account_id)
    .single()

  if (accError) return NextResponse.json({ error: accError.message }, { status: 500 })

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email, role, location_id, created_at')
    .eq('account_id', auth.profile.account_id)
    .order('created_at', { ascending: true })

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, email, role, created_at, expires_at, accepted_at')
    .eq('account_id', auth.profile.account_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ account, users, invitations: invitations ?? [] })
}

export async function PATCH(request: Request) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string; role: string }>(supabase, 'role, account_id')
  if (auth.error) return auth.error

  if (auth.profile.role !== 'owner') {
    return NextResponse.json({ error: ERRORS.OWNER_REQUIRED }, { status: 403 })
  }

  const body = await request.json()
  const allowed = ['name']
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) filtered[key] = body[key]
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(filtered)
    .eq('id', auth.profile.account_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

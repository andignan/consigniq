import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'
import crypto from 'crypto'

export async function POST(request: Request) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string; role: string }>(supabase, 'role, account_id')
  if (auth.error) return auth.error

  if (auth.profile.role !== 'owner') {
    return NextResponse.json({ error: ERRORS.OWNER_REQUIRED }, { status: 403 })
  }

  const body = await request.json()
  const { email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
  }

  if (role !== 'owner' && role !== 'staff') {
    return NextResponse.json({ error: 'role must be owner or staff' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('account_id', auth.profile.account_id)
    .eq('email', email)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'User already exists on this account' }, { status: 409 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      account_id: auth.profile.account_id,
      email,
      role,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitation: data }, { status: 201 })
}

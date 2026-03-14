import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, account_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
  }

  if (role !== 'owner' && role !== 'staff') {
    return NextResponse.json({ error: 'role must be owner or staff' }, { status: 400 })
  }

  // Check if user already exists on this account
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('account_id', profile.account_id)
    .eq('email', email)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'User already exists on this account' }, { status: 409 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      account_id: profile.account_id,
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

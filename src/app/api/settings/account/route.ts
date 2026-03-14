import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify owner role
  const { data: profile } = await supabase
    .from('users')
    .select('role, account_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
  }

  // Fetch account
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, name, tier, stripe_customer_id, status')
    .eq('id', profile.account_id)
    .single()

  if (accError) return NextResponse.json({ error: accError.message }, { status: 500 })

  // Fetch all users on this account
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email, role, location_id, created_at')
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: true })

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

  // Fetch pending invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, email, role, created_at, expires_at, accepted_at')
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ account, users, invitations: invitations ?? [] })
}

export async function PATCH(request: Request) {
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
  const allowed = ['name']
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) filtered[key] = body[key]
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(filtered)
    .eq('id', profile.account_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

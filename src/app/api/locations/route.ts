import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('account_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('locations')
    .select('id, account_id, name, address, city, state, phone, default_split_store, default_split_consignor, agreement_days, grace_days, markdown_enabled, created_at')
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ locations: data })
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: 'Only owners can create locations' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('locations')
    .insert({
      account_id: profile.account_id,
      name: body.name.trim(),
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      phone: body.phone || null,
      default_split_store: body.default_split_store ?? 60,
      default_split_consignor: body.default_split_consignor ?? 40,
      agreement_days: body.agreement_days ?? 60,
      grace_days: body.grace_days ?? 3,
      markdown_enabled: body.markdown_enabled ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location: data }, { status: 201 })
}

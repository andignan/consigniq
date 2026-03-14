// app/api/admin/users/route.ts
import { checkSuperadmin, createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { buildInviteEmail } from '@/lib/email-templates'

export async function GET(request: NextRequest) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const accountType = searchParams.get('account_type')
  const tier = searchParams.get('tier')

  // Get all users with their account info
  let query = supabase
    .from('users')
    .select('id, email, full_name, role, account_id, location_id, is_superadmin, created_at, accounts(id, name, tier, status, account_type, trial_ends_at, is_complimentary, complimentary_tier)')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data: users, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Client-side filter by account_type and tier since these are on the joined accounts table
  let filtered = users ?? []

  if (accountType) {
    filtered = filtered.filter((u: Record<string, unknown>) => {
      const account = u.accounts as Record<string, unknown> | null
      return account?.account_type === accountType
    })
  }

  if (tier) {
    filtered = filtered.filter((u: Record<string, unknown>) => {
      const account = u.accounts as Record<string, unknown> | null
      return account?.tier === tier
    })
  }

  return NextResponse.json({ users: filtered })
}

export async function POST(request: NextRequest) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const body = await request.json()
  const { email, full_name, account_name, tier, account_type, complimentary_tier } = body

  if (!email || !full_name || !account_name) {
    return NextResponse.json({ error: 'email, full_name, and account_name are required' }, { status: 400 })
  }

  if (!tier || !['solo', 'starter', 'standard', 'pro'].includes(tier)) {
    return NextResponse.json({ error: 'tier must be solo, starter, standard, or pro' }, { status: 400 })
  }

  if (!account_type || !['paid', 'trial', 'complimentary'].includes(account_type)) {
    return NextResponse.json({ error: 'account_type must be paid, trial, or complimentary' }, { status: 400 })
  }

  // 1. Create account
  const accountData: Record<string, unknown> = {
    name: account_name,
    tier,
    status: 'active',
    account_type,
  }

  if (account_type === 'trial') {
    accountData.trial_ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  if (account_type === 'complimentary') {
    accountData.is_complimentary = true
    accountData.complimentary_tier = complimentary_tier || tier
  }

  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .insert(accountData)
    .select()
    .single()

  if (accountError) {
    return NextResponse.json({ error: `Failed to create account: ${accountError.message}` }, { status: 500 })
  }

  // 2. Create default location
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .insert({
      account_id: account.id,
      name: `${account_name} - Main`,
      default_split_store: 60,
      default_split_consignor: 40,
      agreement_days: 60,
      grace_days: 14,
      markdown_enabled: false,
    })
    .select()
    .single()

  if (locationError) {
    // Clean up account
    await supabase.from('accounts').delete().eq('id', account.id)
    return NextResponse.json({ error: `Failed to create location: ${locationError.message}` }, { status: 500 })
  }

  // 3. Create Supabase auth user (no email — we send our own via Resend)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name },
  })

  if (authError) {
    // Clean up
    await supabase.from('locations').delete().eq('id', location.id)
    await supabase.from('accounts').delete().eq('id', account.id)
    return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 500 })
  }

  // 4. Create users table row
  // Use upsert because Supabase may have a trigger on auth.users that auto-creates
  // a partial row in public.users — upsert ensures we set all required fields regardless.
  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert({
      id: authData.user.id,
      email,
      full_name,
      account_id: account.id,
      location_id: location.id,
      role: 'owner',
      is_superadmin: false,
    }, { onConflict: 'id' })
    .select()
    .single()

  if (userError) {
    // Clean up
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('locations').delete().eq('id', location.id)
    await supabase.from('accounts').delete().eq('id', account.id)
    return NextResponse.json({ error: `Failed to create user record: ${userError.message}` }, { status: 500 })
  }

  // 5. Generate invite link and send branded email via Resend
  let inviteError: string | undefined
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${appUrl}/auth/setup-password` },
    })

    if (linkError) {
      inviteError = `Failed to generate invite link: ${linkError.message}`
    } else if (linkData?.properties?.action_link) {
      const emailContent = buildInviteEmail({
        fullName: full_name,
        accountName: account_name,
        tier,
        setupLink: linkData.properties.action_link,
      })
      await sendEmail({ to: email, ...emailContent })
    }
  } catch (err) {
    // Non-critical — user and account are created, invite can be resent
    inviteError = `Invite email failed: ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json({
    account,
    user,
    location,
    ...(inviteError ? { invite_warning: inviteError } : {}),
  }, { status: 201 })
}

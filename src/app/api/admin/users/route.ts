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
    .select('id, email, full_name, role, account_id, location_id, platform_role, created_at, accounts(id, name, tier, status, account_type, trial_ends_at, is_complimentary, complimentary_tier)')
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
  const { email, full_name, platform_role } = body

  // Platform user creation path
  if (platform_role) {
    if (auth.platformRole !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can create platform users' }, { status: 403 })
    }

    if (!VALID_PLATFORM_ROLES.includes(platform_role)) {
      return NextResponse.json({ error: `platform_role must be one of: ${VALID_PLATFORM_ROLES.join(', ')}` }, { status: 400 })
    }

    if (!email || !full_name) {
      return NextResponse.json({ error: 'email and full_name are required' }, { status: 400 })
    }

    // Find system account
    const { data: systemAccount, error: sysAccErr } = await supabase
      .from('accounts')
      .select('id')
      .eq('is_system', true)
      .limit(1)
      .single()

    if (sysAccErr || !systemAccount) {
      return NextResponse.json({ error: 'System account not found — configuration error' }, { status: 500 })
    }

    // Find or create system location
    let systemLocation: { id: string }
    const { data: existingLoc } = await supabase
      .from('locations')
      .select('id')
      .eq('account_id', systemAccount.id)
      .limit(1)
      .single()

    if (existingLoc) {
      systemLocation = existingLoc
    } else {
      const { data: newLoc, error: createLocErr } = await supabase
        .from('locations')
        .insert({
          account_id: systemAccount.id,
          name: 'System',
          default_split_store: 60,
          default_split_consignor: 40,
          agreement_days: 60,
          grace_days: 14,
          markdown_enabled: false,
        })
        .select('id')
        .single()

      if (createLocErr || !newLoc) {
        return NextResponse.json({ error: 'Failed to create system location' }, { status: 500 })
      }
      systemLocation = newLoc
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name },
    })

    if (authError) {
      return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 500 })
    }

    // Create users table row with platform_role
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        full_name,
        account_id: systemAccount.id,
        location_id: systemLocation.id,
        role: 'owner',
        platform_role,
      }, { onConflict: 'id' })
      .select()
      .single()

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: `Failed to create user record: ${userError.message}` }, { status: 500 })
    }

    // Send invite email (non-critical)
    let inviteError: string | undefined
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/auth/setup-password` },
      })

      if (linkError) {
        inviteError = `Failed to generate invite link: ${linkError.message}`
      } else if (linkData?.properties?.action_link) {
        let setupLink = linkData.properties.action_link
        try {
          const linkUrl = new URL(setupLink)
          linkUrl.searchParams.set('redirect_to', `${appUrl}/auth/setup-password`)
          setupLink = linkUrl.toString()
        } catch {
          // If URL parsing fails, use the link as-is
        }
        const emailContent = buildInviteEmail({
          fullName: full_name,
          accountName: 'ConsignIQ',
          tier: 'solo',
          setupLink,
          isPlatformUser: true,
        })
        await sendEmail({ to: email, ...emailContent })
      }
    } catch (err) {
      inviteError = `Invite email failed: ${err instanceof Error ? err.message : String(err)}`
    }

    return NextResponse.json({
      account: systemAccount,
      user,
      location: systemLocation,
      ...(inviteError ? { invite_warning: inviteError } : {}),
    }, { status: 201 })
  }

  // Customer user creation path
  const { account_name, tier, account_type, complimentary_tier } = body

  if (!email || !full_name || !account_name) {
    return NextResponse.json({ error: 'email, full_name, and account_name are required' }, { status: 400 })
  }

  // Prevent creating a customer account that duplicates a system account name
  const { data: existingSystem } = await supabase
    .from('accounts')
    .select('id')
    .eq('is_system', true)
    .ilike('name', account_name)
    .limit(1)
    .maybeSingle()

  if (existingSystem) {
    return NextResponse.json({ error: 'This account name is reserved for system use' }, { status: 400 })
  }

  if (!tier || !['solo', 'shop', 'enterprise'].includes(tier)) {
    return NextResponse.json({ error: 'tier must be solo, shop, or enterprise' }, { status: 400 })
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
    // Use 'recovery' type instead of 'invite' — invite links expire based on
    // Supabase's short email OTP expiry (often 1 hour). Recovery links use the
    // longer recovery expiry setting (24 hours). The setup-password page handles both.
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/setup-password` },
    })

    if (linkError) {
      inviteError = `Failed to generate invite link: ${linkError.message}`
    } else if (linkData?.properties?.action_link) {
      // Rewrite the redirect_to in the action link to ensure it points to /auth/setup-password
      // Supabase may ignore the redirectTo option if the URL isn't in the Redirect URLs allowlist
      let setupLink = linkData.properties.action_link
      try {
        const linkUrl = new URL(setupLink)
        linkUrl.searchParams.set('redirect_to', `${appUrl}/auth/setup-password`)
        setupLink = linkUrl.toString()
      } catch {
        // If URL parsing fails, use the link as-is
      }
      const emailContent = buildInviteEmail({
        fullName: full_name,
        accountName: account_name,
        tier,
        setupLink,
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

const VALID_PLATFORM_ROLES = ['super_admin', 'support', 'finance']

export async function PATCH(request: NextRequest) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: auth.status })
  }

  // Only super_admin can modify platform roles
  if (auth.platformRole !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can modify platform roles' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const body = await request.json()
  const { user_id, platform_role } = body

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // Validate platform_role (null to remove, or valid role string)
  if (platform_role !== null && !VALID_PLATFORM_ROLES.includes(platform_role)) {
    return NextResponse.json({ error: `platform_role must be null or one of: ${VALID_PLATFORM_ROLES.join(', ')}` }, { status: 400 })
  }

  // If removing super_admin, check we're not removing the last one
  if (platform_role !== 'super_admin') {
    const { data: currentUser } = await supabase
      .from('users')
      .select('platform_role')
      .eq('id', user_id)
      .single()

    if (currentUser?.platform_role === 'super_admin') {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('platform_role', 'super_admin')

      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last super admin' }, { status: 400 })
      }
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update({ platform_role })
    .eq('id', user_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

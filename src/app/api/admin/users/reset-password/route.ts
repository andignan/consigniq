import { checkSuperadmin, createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { buildPasswordResetEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const { user_id } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // Look up the user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', user_id)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate password recovery link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: user.email,
    options: { redirectTo: `${appUrl}/auth/setup-password` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: `Failed to generate reset link: ${linkError?.message || 'unknown error'}` }, { status: 500 })
  }

  // Rewrite redirect_to in the action link to ensure it points to /auth/setup-password
  let resetLink = linkData.properties.action_link
  try {
    const linkUrl = new URL(resetLink)
    linkUrl.searchParams.set('redirect_to', `${appUrl}/auth/setup-password`)
    resetLink = linkUrl.toString()
  } catch {
    // If URL parsing fails, use as-is
  }

  // Send branded reset email via Resend
  try {
    const emailContent = buildPasswordResetEmail({
      fullName: user.full_name || user.email,
      resetLink,
    })
    await sendEmail({ to: user.email, ...emailContent })
  } catch (err) {
    return NextResponse.json({ error: `Failed to send reset email: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }

  return NextResponse.json({ sent: true })
}

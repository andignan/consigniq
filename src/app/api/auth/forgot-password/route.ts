import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { buildPasswordResetEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  // Always return 200 to prevent user enumeration
  // If the email doesn't exist, we silently do nothing.
  try {
    const supabase = createAdminClient()

    // Look up user in public.users table
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (user) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: user.email,
        options: { redirectTo: `${appUrl}/auth/setup-password` },
      })

      if (!linkError && linkData?.properties?.action_link) {
        const emailContent = buildPasswordResetEmail({
          fullName: user.full_name || user.email,
          resetLink: linkData.properties.action_link,
        })
        await sendEmail({ to: user.email, ...emailContent })
      }
    }
  } catch {
    // Silently fail — do not reveal whether the email exists
  }

  return NextResponse.json({ sent: true })
}

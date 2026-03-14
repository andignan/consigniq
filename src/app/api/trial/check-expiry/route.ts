import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  // Auth check: require CRON_SECRET header, or allow if no secret configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results = { reminders_sent: 0, accounts_expired: 0, errors: [] as string[] }

  // 1. Find trials expiring in 1 day, send reminder emails
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStart = new Date(tomorrow)
  tomorrowStart.setHours(0, 0, 0, 0)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const { data: expiringAccounts } = await supabase
    .from('accounts')
    .select('id, name, trial_ends_at')
    .eq('account_type', 'trial')
    .eq('status', 'active')
    .gte('trial_ends_at', tomorrowStart.toISOString())
    .lte('trial_ends_at', tomorrowEnd.toISOString())

  for (const account of expiringAccounts ?? []) {
    // Get the owner user's email
    const { data: owner } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('account_id', account.id)
      .eq('role', 'owner')
      .single()

    if (owner?.email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consigniq.com'
        await sendEmail({
          to: owner.email,
          subject: 'Your ConsignIQ trial ends tomorrow',
          text: `Hi ${owner.full_name || 'there'},\n\nYour ConsignIQ trial ends tomorrow. Add a payment method to keep access to your account.\n\nVisit your settings page to upgrade: ${appUrl}/dashboard/settings?tab=account\n\nThanks,\nThe ConsignIQ Team`,
          html: `<p>Hi ${owner.full_name || 'there'},</p><p>Your ConsignIQ trial ends tomorrow. Add a payment method to keep access to your account.</p><p><a href="${appUrl}/dashboard/settings?tab=account">Upgrade your plan</a></p><p>Thanks,<br>The ConsignIQ Team</p>`,
        })
        results.reminders_sent++
      } catch (err) {
        results.errors.push(`Failed to email ${owner.email}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // 2. Find expired trials — no action needed, layout already locks them out
  const { data: expiredTrials } = await supabase
    .from('accounts')
    .select('id')
    .eq('account_type', 'trial')
    .eq('status', 'active')
    .lt('trial_ends_at', new Date().toISOString())

  results.accounts_expired = expiredTrials?.length ?? 0

  return NextResponse.json(results)
}

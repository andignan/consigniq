// Cron endpoint: checks grace periods and sends reminder emails
// - Finds cancelled_grace accounts where period_end is in 3 days → sends reminder
// - Finds cancelled_grace accounts where period_end has passed → transitions to cancelled_limited
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { buildGraceReminderEmail, buildAccessEndedEmail } from '@/lib/email-templates'
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

export async function POST(request: NextRequest) {
  // Auth: CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results = { reminders_sent: 0, transitioned: 0, errors: [] as string[] }

  // 1. Send grace period reminders (period_end in 3 days)
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const targetStart = new Date(threeDaysFromNow)
  targetStart.setHours(0, 0, 0, 0)
  const targetEnd = new Date(threeDaysFromNow)
  targetEnd.setHours(23, 59, 59, 999)

  const { data: expiringAccounts } = await supabase
    .from('accounts')
    .select('id, name, cancelled_tier, subscription_period_end')
    .eq('account_type', 'cancelled_grace')
    .gte('subscription_period_end', targetStart.toISOString())
    .lte('subscription_period_end', targetEnd.toISOString())

  for (const account of expiringAccounts ?? []) {
    const { data: owner } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('account_id', account.id)
      .eq('role', 'owner')
      .single()

    if (owner?.email) {
      try {
        const tier = (account.cancelled_tier || 'starter') as Tier
        const tierLabel = TIER_CONFIGS[tier]?.label || 'your plan'
        const endDate = new Date(account.subscription_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        const emailContent = buildGraceReminderEmail({
          fullName: owner.full_name || owner.email,
          tierLabel,
          periodEndDate: endDate,
          resubscribeUrl: `${appUrl}/dashboard/settings?tab=billing`,
        })
        await sendEmail({ to: owner.email, ...emailContent })
        results.reminders_sent++
      } catch (err) {
        results.errors.push(`Reminder failed for ${account.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // 2. Auto-transition overdue cancelled_grace → cancelled_limited
  const { data: overdueAccounts } = await supabase
    .from('accounts')
    .select('id, name, cancelled_tier')
    .eq('account_type', 'cancelled_grace')
    .lt('subscription_period_end', new Date().toISOString())

  for (const account of overdueAccounts ?? []) {
    await supabase
      .from('accounts')
      .update({ account_type: 'cancelled_limited' })
      .eq('id', account.id)
    results.transitioned++

    // Send access ended email
    const { data: owner } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('account_id', account.id)
      .eq('role', 'owner')
      .single()

    if (owner?.email) {
      try {
        const tier = (account.cancelled_tier || 'starter') as Tier
        const tierLabel = TIER_CONFIGS[tier]?.label || 'your plan'
        const emailContent = buildAccessEndedEmail({
          fullName: owner.full_name || owner.email,
          tierLabel,
          resubscribeUrl: `${appUrl}/dashboard/settings?tab=billing`,
        })
        await sendEmail({ to: owner.email, ...emailContent })
      } catch {
        // Non-critical
      }
    }
  }

  return NextResponse.json(results)
}

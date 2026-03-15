// app/api/agreements/notify-expiring/route.ts
// I7: Uses CRON_SECRET auth pattern (matches /api/trial/check-expiry)
// Finds consignors expiring in 3 days and sends reminder emails.
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { buildExpiryReminderEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  // Auth check: require CRON_SECRET header, or allow if no secret configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Find consignors expiring in exactly 3 days from today
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + 3)
  const targetDateStr = targetDate.toISOString().slice(0, 10)

  const { data: expiringConsignors } = await supabase
    .from('consignors')
    .select('id, name, email, expiry_date, grace_end_date, location_id, account_id')
    .eq('expiry_date', targetDateStr)
    .not('email', 'is', null)

  if (!expiringConsignors || expiringConsignors.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No consignors expiring in 3 days' })
  }

  // Check which ones already have a notification sent (via agreements table)
  const consignorIds = expiringConsignors.map(c => c.id)
  const { data: existingAgreements } = await supabase
    .from('agreements')
    .select('consignor_id, email_sent_at')
    .in('consignor_id', consignorIds)
    .not('email_sent_at', 'is', null)

  const notifiedConsignorIds = new Set(
    (existingAgreements ?? [])
      .filter(a => a.email_sent_at)
      .map(a => a.consignor_id)
  )

  // Get unique location IDs to fetch location data
  const locationIds = Array.from(new Set(expiringConsignors.map(c => c.location_id)))
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, phone')
    .in('id', locationIds)

  const locationMap = new Map((locations ?? []).map(l => [l.id, l]))

  let sentCount = 0
  const errors: string[] = []

  for (const consignor of expiringConsignors) {
    if (notifiedConsignorIds.has(consignor.id)) continue
    if (!consignor.email) continue

    const location = locationMap.get(consignor.location_id)
    if (!location) continue

    const { subject, text, html } = buildExpiryReminderEmail({
      storeName: location.name,
      storePhone: location.phone,
      consignorName: consignor.name,
      expiryDate: consignor.expiry_date,
      graceEndDate: consignor.grace_end_date,
    })

    try {
      await sendEmail({ to: consignor.email, subject, text, html })
      sentCount++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${consignor.name}: ${msg}`)
    }
  }

  return NextResponse.json({
    sent: sentCount,
    skipped: notifiedConsignorIds.size,
    errors: errors.length > 0 ? errors : undefined,
  })
}

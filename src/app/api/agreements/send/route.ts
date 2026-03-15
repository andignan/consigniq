// app/api/agreements/send/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { buildAgreementEmail } from '@/lib/email-templates'
import { CONDITION_LABELS } from '@/types'
import { canUseFeature } from '@/lib/feature-gates'
import type { Tier } from '@/lib/tier-limits'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedProfile<{ account_id: string; accounts: { tier?: string } | null }>(
    supabase, 'account_id, accounts(tier)'
  )
  if (auth.error) return auth.error

  const profile = auth.profile
  const tier = (profile.accounts?.tier ?? 'starter') as Tier
  if (!canUseFeature(tier, 'agreements')) {
    return NextResponse.json({ error: `${ERRORS.UPGRADE_REQUIRED} — agreements are not available on your plan` }, { status: 403 })
  }

  const body = await request.json()
  const { consignor_id } = body

  if (!consignor_id) {
    return NextResponse.json({ error: 'consignor_id is required' }, { status: 400 })
  }

  // Fetch consignor
  const { data: consignor, error: consignorError } = await supabase
    .from('consignors')
    .select('*')
    .eq('id', consignor_id)
    .eq('account_id', profile.account_id)
    .single()

  if (consignorError || !consignor) {
    return NextResponse.json({ error: 'Consignor not found' }, { status: 404 })
  }

  if (!consignor.email) {
    return NextResponse.json(
      { error: 'This consignor has no email address on file. Please add an email address to their profile before sending an agreement.' },
      { status: 400 }
    )
  }

  // Fetch items for this consignor
  const { data: items } = await supabase
    .from('items')
    .select('name, category, condition')
    .eq('consignor_id', consignor_id)
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: true })

  // Fetch location
  const { data: location } = await supabase
    .from('locations')
    .select('name, address, city, state, phone, agreement_days, grace_days')
    .eq('id', consignor.location_id)
    .single()

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  // Build email
  const emailItems = (items ?? []).map(item => ({
    name: item.name,
    category: item.category,
    condition: CONDITION_LABELS[item.condition as keyof typeof CONDITION_LABELS] || item.condition,
  }))

  const { subject, text, html } = buildAgreementEmail({
    storeName: location.name,
    storeAddress: location.address || '',
    storeCity: location.city || '',
    storeState: location.state || '',
    storePhone: location.phone,
    consignorName: consignor.name,
    intakeDate: consignor.intake_date,
    expiryDate: consignor.expiry_date,
    graceEndDate: consignor.grace_end_date,
    splitStore: consignor.split_store,
    splitConsignor: consignor.split_consignor,
    agreementDays: location.agreement_days,
    graceDays: location.grace_days,
    items: emailItems,
  })

  // Create agreement record
  const now = new Date().toISOString()
  const { data: agreement, error: agreementError } = await supabase
    .from('agreements')
    .insert({
      account_id: profile.account_id,
      consignor_id: consignor.id,
      generated_at: now,
      expiry_date: consignor.expiry_date,
      grace_end: consignor.grace_end_date,
    })
    .select()
    .single()

  if (agreementError) {
    return NextResponse.json({ error: 'Failed to create agreement record: ' + agreementError.message }, { status: 500 })
  }

  // Send email
  try {
    await sendEmail({ to: consignor.email, subject, text, html })
  } catch (err) {
    // Update agreement to note email failed
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Agreement created but email failed: ' + msg }, { status: 500 })
  }

  // M5: Update email_sent_at with error handling
  try {
    await supabase
      .from('agreements')
      .update({ email_sent_at: now })
      .eq('id', agreement.id)
  } catch (err) {
    console.error('Failed to update email_sent_at:', err instanceof Error ? err.message : String(err))
  }

  return NextResponse.json({
    success: true,
    agreement_id: agreement.id,
    email_sent_to: consignor.email,
    item_count: emailItems.length,
  })
}

// Admin account deletion endpoint
// Complimentary/trial: immediate hard delete of all data
// Paid: cancel Stripe subscription, soft delete (status='deleted', deleted_at=now)
import { checkSuperadmin, createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { buildAccountDeletedEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: auth.status }
    )
  }

  const supabase = createAdminClient()
  const body = await request.json()
  const { account_id, reason } = body as { account_id?: string; reason?: string }

  if (!account_id) {
    return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
  }

  // Fetch account
  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, name, tier, status, account_type, stripe_customer_id, is_complimentary')
    .eq('id', account_id)
    .single()

  if (accErr || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Get all users for this account (needed for auth deletion + email)
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('account_id', account_id)

  const ownerUser = (users ?? []).find(u => u.role === 'owner')
  const ownerEmail = ownerUser?.email

  const isPaid = account.account_type === 'paid'
  const hasStripe = !!account.stripe_customer_id

  if (isPaid && hasStripe) {
    // ─── Paid account with Stripe: soft delete ───────────────
    // Cancel Stripe subscription if active
    try {
      const { getStripe } = await import('@/lib/stripe')
      const stripe = getStripe()

      // List active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: account.stripe_customer_id!,
        status: 'active',
        limit: 10,
      })

      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id)
      }
    } catch (err) {
      console.error('Stripe subscription cancel failed:', err instanceof Error ? err.message : String(err))
      // Continue with deletion even if Stripe fails
    }

    // Soft delete: mark as deleted
    await supabase
      .from('accounts')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deletion_reason: reason || null,
      })
      .eq('id', account_id)

    // Send notification email
    if (ownerEmail) {
      try {
        const { subject, text, html } = buildAccountDeletedEmail({
          accountName: account.name,
          ownerName: ownerUser?.full_name || 'there',
          isPaid: true,
        })
        await sendEmail({ to: ownerEmail, subject, text, html })
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      deleted: false,
      soft_deleted: true,
      message: 'Stripe subscription cancelled and account marked for deletion',
    })
  } else {
    // ─── Complimentary/trial/paid-no-stripe: hard delete ─────
    // Delete in order to respect foreign key constraints
    const tables = ['items', 'consignors', 'price_history', 'agreements', 'markdowns', 'invitations']
    for (const table of tables) {
      await supabase.from(table).delete().eq('account_id', account_id)
    }

    // Delete locations
    await supabase.from('locations').delete().eq('account_id', account_id)

    // Delete users rows
    await supabase.from('users').delete().eq('account_id', account_id)

    // Delete account
    await supabase.from('accounts').delete().eq('id', account_id)

    // Delete Supabase auth users
    for (const user of users ?? []) {
      try {
        await supabase.auth.admin.deleteUser(user.id)
      } catch {
        // Continue even if auth deletion fails for one user
      }
    }

    // Send notification email
    if (ownerEmail) {
      try {
        const { subject, text, html } = buildAccountDeletedEmail({
          accountName: account.name,
          ownerName: ownerUser?.full_name || 'there',
          isPaid: false,
        })
        await sendEmail({ to: ownerEmail, subject, text, html })
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      deleted: true,
      soft_deleted: false,
      message: 'Account and all data permanently deleted',
    })
  }
}

// lib/email-templates.ts
// Email templates for agreement and notification emails

const EMAIL_COLORS = {
  brandPrimary: '#0A9E78',
  headerBg: '#071020',
  textPrimary: '#1a1a1a',
  textBody: '#374151',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  bgSubtle: '#fafafa',
  borderDefault: '#e5e7eb',
  white: '#ffffff',
  brandLight: '#E7F5EF',
  brandLightBorder: '#C3E8D8',
  brandDark: '#056A50',
  brandMedium: '#077D5F',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerText: '#991b1b',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  dangerButton: '#dc2626',
  sectionBg: '#f9fafb',
} as const

interface AgreementEmailData {
  storeName: string
  storeAddress: string
  storeCity: string
  storeState: string
  storePhone: string | null
  consignorName: string
  intakeDate: string
  expiryDate: string
  graceEndDate: string
  splitStore: number
  splitConsignor: number
  agreementDays: number
  graceDays: number
  items: Array<{ name: string; category: string; condition: string }>
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function buildAgreementEmail(data: AgreementEmailData) {
  const itemList = data.items
    .map((item, i) => `${i + 1}. ${item.name} — ${item.category}, ${item.condition}`)
    .join('\n')

  const itemListHtml = data.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.category}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.condition}</td></tr>`
    )
    .join('')

  const storeContact = data.storePhone ? `Phone: ${data.storePhone}` : ''
  const storeAddr = `${data.storeAddress}, ${data.storeCity}, ${data.storeState}`

  const text = `CONSIGNMENT AGREEMENT
${data.storeName}
${storeAddr}
${storeContact}

Dear ${data.consignorName},

Thank you for consigning with ${data.storeName}! This email confirms the terms of your consignment agreement.

AGREEMENT DETAILS
─────────────────
Intake Date: ${formatDate(data.intakeDate)}
Agreement Expires: ${formatDate(data.expiryDate)}
Grace Period Ends: ${formatDate(data.graceEndDate)}
Revenue Split: ${data.splitConsignor}% to you / ${data.splitStore}% to store

ITEMS CONSIGNED (${data.items.length} total)
─────────────────
${itemList}

HOW IT WORKS
─────────────────
• Your items will be displayed for sale for ${data.agreementDays} days from intake.
• When an item sells, you receive ${data.splitConsignor}% of the sale price.
• After ${data.agreementDays} days, if items remain unsold, you have a ${data.graceDays}-day grace period (until ${formatDate(data.graceEndDate)}) to pick them up.
• Items not picked up after the grace period may be donated or disposed of at the store's discretion.
• You will receive a reminder email before your agreement expires.

PICKING UP UNSOLD ITEMS
─────────────────
Please visit ${data.storeName} during business hours before ${formatDate(data.graceEndDate)} to collect any unsold items.
${storeContact ? `Contact us at ${data.storePhone} with any questions.` : ''}

Thank you for choosing ${data.storeName}!

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${EMAIL_COLORS.textPrimary};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${EMAIL_COLORS.headerBg};border-radius:12px;padding:24px;margin-bottom:24px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:${EMAIL_COLORS.white};">${data.storeName}</h1>
    <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textFaint};">${storeAddr}</p>
    ${storeContact ? `<p style="margin:4px 0 0;font-size:13px;color:${EMAIL_COLORS.textFaint};">${storeContact}</p>` : ''}
  </div>

  <h2 style="font-size:18px;color:${EMAIL_COLORS.textPrimary};margin:0 0 16px;">Consignment Agreement</h2>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Dear ${data.consignorName},
  </p>
  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Thank you for consigning with ${data.storeName}! This email confirms the terms of your consignment agreement.
  </p>

  <div style="background:${EMAIL_COLORS.bgSubtle};border:1px solid ${EMAIL_COLORS.borderDefault};border-radius:8px;padding:16px;margin:20px 0;">
    <h3 style="margin:0 0 12px;font-size:14px;color:${EMAIL_COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Agreement Details</h3>
    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:4px 0;color:${EMAIL_COLORS.textMuted};">Intake Date</td><td style="padding:4px 0;font-weight:600;">${formatDate(data.intakeDate)}</td></tr>
      <tr><td style="padding:4px 0;color:${EMAIL_COLORS.textMuted};">Agreement Expires</td><td style="padding:4px 0;font-weight:600;">${formatDate(data.expiryDate)}</td></tr>
      <tr><td style="padding:4px 0;color:${EMAIL_COLORS.textMuted};">Grace Period Ends</td><td style="padding:4px 0;font-weight:600;">${formatDate(data.graceEndDate)}</td></tr>
      <tr><td style="padding:4px 0;color:${EMAIL_COLORS.textMuted};">Revenue Split</td><td style="padding:4px 0;font-weight:600;">${data.splitConsignor}% to you / ${data.splitStore}% to store</td></tr>
    </table>
  </div>

  <h3 style="font-size:14px;color:${EMAIL_COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 12px;">Items Consigned (${data.items.length} total)</h3>
  <table style="width:100%;font-size:13px;border-collapse:collapse;border:1px solid ${EMAIL_COLORS.borderDefault};border-radius:8px;">
    <thead>
      <tr style="background:${EMAIL_COLORS.sectionBg};">
        <th style="padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid ${EMAIL_COLORS.borderDefault};">Item</th>
        <th style="padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid ${EMAIL_COLORS.borderDefault};">Category</th>
        <th style="padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid ${EMAIL_COLORS.borderDefault};">Condition</th>
      </tr>
    </thead>
    <tbody>
      ${itemListHtml}
    </tbody>
  </table>

  <div style="background:${EMAIL_COLORS.brandLight};border:1px solid ${EMAIL_COLORS.brandLightBorder};border-radius:8px;padding:16px;margin:24px 0;">
    <h3 style="margin:0 0 8px;font-size:14px;color:${EMAIL_COLORS.brandDark};">How It Works</h3>
    <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:${EMAIL_COLORS.brandMedium};">
      <li>Your items will be displayed for sale for <strong>${data.agreementDays} days</strong> from intake.</li>
      <li>When an item sells, you receive <strong>${data.splitConsignor}%</strong> of the sale price.</li>
      <li>After ${data.agreementDays} days, if items remain unsold, you have a <strong>${data.graceDays}-day grace period</strong> (until ${formatDate(data.graceEndDate)}) to pick them up.</li>
      <li>Items not picked up after the grace period may be donated or disposed of at the store's discretion.</li>
    </ul>
  </div>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    To pick up unsold items, please visit <strong>${data.storeName}</strong> during business hours before <strong>${formatDate(data.graceEndDate)}</strong>.
    ${data.storePhone ? ` Contact us at <strong>${data.storePhone}</strong> with any questions.` : ''}
  </p>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Thank you for choosing ${data.storeName}!
  </p>

  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">
    This is an automated message from ConsignIQ.
  </p>
</body>
</html>`

  const subject = `Consignment Agreement — ${data.storeName}`

  return { subject, text, html }
}

interface InviteEmailData {
  fullName: string
  accountName: string
  tier: string
  setupLink: string
}

export function buildInviteEmail(data: InviteEmailData) {
  const tierLabel: Record<string, string> = {
    solo: 'Solo Pricer',
    starter: 'Starter',
    standard: 'Standard',
    pro: 'Pro',
  }
  const tierName = tierLabel[data.tier] || data.tier

  // Wrap the Supabase link in a landing page to prevent email scanner consumption
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getconsigniq.com'
  const encodedLink = Buffer.from(data.setupLink).toString('base64')
  const firstName = data.fullName.split(' ')[0]
  const landingUrl = `${appUrl}/auth/invite?link=${encodeURIComponent(encodedLink)}&name=${encodeURIComponent(firstName)}&account=${encodeURIComponent(data.accountName)}`

  const text = `Hi ${data.fullName},

You've been invited to ConsignIQ!

Account: ${data.accountName}
Plan: ${tierName}

To get started, set your password and log in using the link below:

${landingUrl}

This link expires in 24 hours. If it expires, contact your administrator for a new invite.

Welcome aboard!
The ConsignIQ Team

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${EMAIL_COLORS.textPrimary};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${EMAIL_COLORS.headerBg};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <h1 style="margin:0 0 4px;font-size:22px;color:${EMAIL_COLORS.white};">Consign<span style="color:${EMAIL_COLORS.brandPrimary};">IQ</span></h1>
    <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textFaint};">AI-Powered Consignment Management</p>
  </div>

  <h2 style="font-size:18px;color:${EMAIL_COLORS.textPrimary};margin:0 0 16px;">You're Invited!</h2>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Hi ${data.fullName},
  </p>
  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    You've been invited to join <strong>${data.accountName}</strong> on ConsignIQ.
  </p>

  <div style="background:${EMAIL_COLORS.bgSubtle};border:1px solid ${EMAIL_COLORS.borderDefault};border-radius:8px;padding:16px;margin:20px 0;">
    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:4px 0;color:${EMAIL_COLORS.textMuted};">Account</td><td style="padding:4px 0;font-weight:600;">${data.accountName}</td></tr>
      <tr><td style="padding:4px 0;color:${EMAIL_COLORS.textMuted};">Plan</td><td style="padding:4px 0;font-weight:600;">${tierName}</td></tr>
    </table>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="${landingUrl}" style="display:inline-block;background:${EMAIL_COLORS.brandPrimary};color:${EMAIL_COLORS.white};font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      Set Up Your Account
    </a>
  </div>

  <p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.textMuted};text-align:center;">
    This link expires in 24 hours. If it expires, contact your administrator for a new invite.
  </p>

  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">
    This is an automated message from ConsignIQ.
  </p>
</body>
</html>`

  const subject = "You've been invited to ConsignIQ"

  return { subject, text, html }
}

interface PasswordResetEmailData {
  fullName: string
  resetLink: string
}

export function buildPasswordResetEmail(data: PasswordResetEmailData) {
  // Wrap the Supabase link in a landing page to prevent email scanner consumption
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getconsigniq.com'
  const encodedLink = Buffer.from(data.resetLink).toString('base64')
  const firstName = data.fullName.split(' ')[0]
  const landingUrl = `${appUrl}/auth/invite?link=${encodeURIComponent(encodedLink)}&name=${encodeURIComponent(firstName)}&type=reset`

  const text = `Hi ${data.fullName},

We received a request to reset your ConsignIQ password.

Click the link below to set a new password:

${landingUrl}

This link expires in 24 hours. If you didn't request this, you can safely ignore this email.

The ConsignIQ Team

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${EMAIL_COLORS.textPrimary};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${EMAIL_COLORS.headerBg};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <h1 style="margin:0 0 4px;font-size:22px;color:${EMAIL_COLORS.white};">Consign<span style="color:${EMAIL_COLORS.brandPrimary};">IQ</span></h1>
    <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textFaint};">AI-Powered Consignment Management</p>
  </div>

  <h2 style="font-size:18px;color:${EMAIL_COLORS.textPrimary};margin:0 0 16px;">Reset Your Password</h2>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Hi ${data.fullName},
  </p>
  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    We received a request to reset your ConsignIQ password. Click the button below to set a new password.
  </p>

  <div style="text-align:center;margin:28px 0;">
    <a href="${landingUrl}" style="display:inline-block;background:${EMAIL_COLORS.brandPrimary};color:${EMAIL_COLORS.white};font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      Reset Password
    </a>
  </div>

  <p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.textMuted};text-align:center;">
    This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
  </p>

  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">
    This is an automated message from ConsignIQ.
  </p>
</body>
</html>`

  const subject = 'Reset your ConsignIQ password'

  return { subject, text, html }
}

interface ExpiryReminderData {
  storeName: string
  storePhone: string | null
  consignorName: string
  expiryDate: string
  graceEndDate: string
}

export function buildExpiryReminderEmail(data: ExpiryReminderData) {
  const text = `Hi ${data.consignorName},

This is a friendly reminder that your consignment agreement with ${data.storeName} expires on ${formatDate(data.expiryDate)}.

If you have unsold items, please arrange to pick them up by ${formatDate(data.graceEndDate)} (the end of the grace period). After this date, uncollected items may be donated or disposed of.

${data.storePhone ? `Contact us at ${data.storePhone} with any questions.` : ''}

Thank you,
${data.storeName}

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${EMAIL_COLORS.textPrimary};max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="font-size:18px;color:${EMAIL_COLORS.textPrimary};margin:0 0 16px;">Agreement Expiring Soon</h2>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">Hi ${data.consignorName},</p>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    This is a friendly reminder that your consignment agreement with <strong>${data.storeName}</strong> expires on <strong>${formatDate(data.expiryDate)}</strong>.
  </p>

  <div style="background:${EMAIL_COLORS.dangerBg};border:1px solid ${EMAIL_COLORS.dangerBorder};border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:${EMAIL_COLORS.dangerText};">
      If you have unsold items, please arrange to pick them up by <strong>${formatDate(data.graceEndDate)}</strong> (the end of the grace period). After this date, uncollected items may be donated or disposed of.
    </p>
  </div>

  ${data.storePhone ? `<p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">Contact us at <strong>${data.storePhone}</strong> with any questions.</p>` : ''}

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Thank you,<br><strong>${data.storeName}</strong>
  </p>

  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p>
</body>
</html>`

  const subject = `Your consignment agreement expires soon — ${data.storeName}`

  return { subject, text, html }
}

// ─── Billing Lifecycle Emails ──────────────────────────────

const TIER_FEATURES: Record<string, string[]> = {
  solo: ['200 AI pricing lookups/month', 'Photo identification', 'Personal inventory', 'CSV export'],
  starter: ['Unlimited AI pricing lookups', 'Consignor management & lifecycle', 'Payouts & agreements', 'Reports & analytics', 'Staff management'],
  standard: ['Everything in Starter', 'Repeat item history', 'Markdown schedules', 'Email notifications', 'Multi-location support'],
  pro: ['Everything in Standard', 'Cross-customer pricing intelligence', 'Community pricing feed', 'All Locations dashboard', 'API access'],
}

interface UpgradeEmailData {
  fullName: string
  tierLabel: string
  tierPrice: number
  dashboardUrl: string
}

export function buildUpgradeEmail(data: UpgradeEmailData) {
  const features = TIER_FEATURES[data.tierLabel.toLowerCase()] ?? TIER_FEATURES.starter
  const featureListText = features.map(f => `• ${f}`).join('\n')
  const featureListHtml = features.map(f => `<li>${f}</li>`).join('')

  const text = `Hi ${data.fullName},

You're now on ConsignIQ ${data.tierLabel}!

Your new plan: ${data.tierLabel} — $${data.tierPrice}/month

What's included:
${featureListText}

Go to your dashboard: ${data.dashboardUrl}

Thanks for choosing ConsignIQ!

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${EMAIL_COLORS.textPrimary};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${EMAIL_COLORS.headerBg};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <h1 style="margin:0 0 4px;font-size:22px;color:${EMAIL_COLORS.white};">Consign<span style="color:${EMAIL_COLORS.brandPrimary};">IQ</span></h1>
    <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textFaint};">AI-Powered Consignment Management</p>
  </div>

  <h2 style="font-size:18px;color:${EMAIL_COLORS.textPrimary};margin:0 0 16px;">You're now on ${data.tierLabel}!</h2>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">Hi ${data.fullName},</p>
  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Your ConsignIQ plan has been upgraded to <strong>${data.tierLabel}</strong> ($${data.tierPrice}/month).
  </p>

  <div style="background:${EMAIL_COLORS.bgSubtle};border:1px solid ${EMAIL_COLORS.borderDefault};border-radius:8px;padding:16px;margin:20px 0;">
    <h3 style="margin:0 0 8px;font-size:14px;color:${EMAIL_COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;">What's Included</h3>
    <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:${EMAIL_COLORS.textBody};">${featureListHtml}</ul>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="${data.dashboardUrl}" style="display:inline-block;background:${EMAIL_COLORS.brandPrimary};color:${EMAIL_COLORS.white};font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      Go to Your Dashboard
    </a>
  </div>

  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p>
</body>
</html>`

  const subject = `You're now on ConsignIQ ${data.tierLabel}!`
  return { subject, text, html }
}

interface CancellationEmailData {
  fullName: string
  tierLabel: string
  resubscribeUrl: string
}

export function buildCancellationEmail(data: CancellationEmailData) {
  const text = `Hi ${data.fullName},

Your ConsignIQ subscription has been cancelled.

Your ${data.tierLabel} plan features are no longer active. Your data is still safe — you can resubscribe anytime to restore access.

Resubscribe: ${data.resubscribeUrl}

We'd love to have you back.

The ConsignIQ Team

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${EMAIL_COLORS.textPrimary};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${EMAIL_COLORS.headerBg};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <h1 style="margin:0 0 4px;font-size:22px;color:${EMAIL_COLORS.white};">Consign<span style="color:${EMAIL_COLORS.brandPrimary};">IQ</span></h1>
    <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textFaint};">AI-Powered Consignment Management</p>
  </div>

  <h2 style="font-size:18px;color:${EMAIL_COLORS.textPrimary};margin:0 0 16px;">Your subscription has been cancelled</h2>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">Hi ${data.fullName},</p>
  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    Your ConsignIQ <strong>${data.tierLabel}</strong> subscription has been cancelled. Your plan features are no longer active.
  </p>

  <div style="background:${EMAIL_COLORS.dangerBg};border:1px solid ${EMAIL_COLORS.dangerBorder};border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:${EMAIL_COLORS.dangerText};">
      Your data is safe and will be preserved. You can resubscribe anytime to restore full access.
    </p>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="${data.resubscribeUrl}" style="display:inline-block;background:${EMAIL_COLORS.brandPrimary};color:${EMAIL_COLORS.white};font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      Resubscribe
    </a>
  </div>

  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p>
</body>
</html>`

  const subject = 'Your ConsignIQ subscription has been cancelled'
  return { subject, text, html }
}

interface PaymentFailedEmailData {
  fullName: string
  portalUrl: string
}

export function buildPaymentFailedEmail(data: PaymentFailedEmailData) {
  const text = `Hi ${data.fullName},

We were unable to process your payment for ConsignIQ.

Please update your payment method to avoid losing access to your account. Stripe will retry the payment, but if it continues to fail, your subscription may be cancelled.

Update payment method: ${data.portalUrl}

If you need help, reply to this email.

The ConsignIQ Team

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${EMAIL_COLORS.textPrimary};max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${EMAIL_COLORS.headerBg};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <h1 style="margin:0 0 4px;font-size:22px;color:${EMAIL_COLORS.white};">Consign<span style="color:${EMAIL_COLORS.brandPrimary};">IQ</span></h1>
    <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textFaint};">AI-Powered Consignment Management</p>
  </div>

  <h2 style="font-size:18px;color:${EMAIL_COLORS.textPrimary};margin:0 0 16px;">Action required — payment failed</h2>

  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">Hi ${data.fullName},</p>
  <p style="font-size:14px;line-height:1.6;color:${EMAIL_COLORS.textBody};">
    We were unable to process your payment for ConsignIQ. Please update your payment method to avoid losing access.
  </p>

  <div style="background:${EMAIL_COLORS.warningBg};border:1px solid ${EMAIL_COLORS.warningBorder};border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:${EMAIL_COLORS.textFaint};">
      Stripe will retry the payment automatically, but if it continues to fail, your subscription may be cancelled.
    </p>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="${data.portalUrl}" style="display:inline-block;background:${EMAIL_COLORS.dangerButton};color:${EMAIL_COLORS.white};font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      Update Payment Method
    </a>
  </div>

  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p>
</body>
</html>`

  const subject = 'Action required — payment failed for ConsignIQ'
  return { subject, text, html }
}

// ─── Account Deleted / Scheduled for Deletion ────────────
interface AccountDeletedEmailData {
  accountName: string
  ownerName: string
  isPaid: boolean
}

export function buildAccountDeletedEmail(data: AccountDeletedEmailData) {
  const paidText = `Your ConsignIQ subscription for "${data.accountName}" has been cancelled and your account has been scheduled for deletion. Your data will be retained for 30 days in case you change your mind.`
  const freeText = `Your ConsignIQ account "${data.accountName}" has been closed and all associated data has been deleted.`

  const text = `Hi ${data.ownerName},

${data.isPaid ? paidText : freeText}

If you believe this was done in error, please contact support immediately.

Thanks,
The ConsignIQ Team`

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#1f2937;max-width:480px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="font-size:24px;font-weight:bold;color:#1f2937;margin:0;">ConsignIQ</h1>
    <p style="font-size:12px;color:${EMAIL_COLORS.textFaint};margin:4px 0 0 0;">AI-Powered Consignment Management</p>
  </div>
  <h2 style="font-size:18px;font-weight:bold;margin-bottom:16px;">Account Closed</h2>
  <p style="font-size:14px;line-height:1.6;margin-bottom:16px;">Hi ${data.ownerName},</p>
  <p style="font-size:14px;line-height:1.6;margin-bottom:16px;">${data.isPaid ? paidText : freeText}</p>
  <p style="font-size:14px;line-height:1.6;margin-bottom:16px;">If you believe this was done in error, please contact support immediately.</p>
  <p style="font-size:14px;line-height:1.6;">Thanks,<br>The ConsignIQ Team</p>
  <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;">
  <p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p>
</body>
</html>`

  const subject = data.isPaid ? 'Your ConsignIQ subscription has been cancelled' : 'Your ConsignIQ account has been closed'
  return { subject, text, html }
}

// ─── Grace Period Reminder ──────────────────────────────
interface GraceReminderEmailData { fullName: string; tierLabel: string; periodEndDate: string; resubscribeUrl: string }

export function buildGraceReminderEmail(data: GraceReminderEmailData) {
  const text = `Hi ${data.fullName},\n\nYour ConsignIQ ${data.tierLabel} access ends on ${data.periodEndDate}. After that date, you'll be limited to basic pricing features only.\n\nResubscribe now to keep full access to your consignors, reports, payouts, and all your data: ${data.resubscribeUrl}\n\nYour data is safe and will be preserved.\n\nThanks,\nThe ConsignIQ Team`
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1f2937;max-width:480px;margin:0 auto;padding:24px;"><h2 style="font-size:18px;font-weight:bold;margin-bottom:16px;">Your access ends soon</h2><p>Hi ${data.fullName},</p><p>Your ConsignIQ <strong>${data.tierLabel}</strong> access ends on <strong>${data.periodEndDate}</strong>. After that date, you'll be limited to basic pricing features only.</p><p><a href="${data.resubscribeUrl}" style="display:inline-block;background:${EMAIL_COLORS.brandPrimary};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Resubscribe Now</a></p><p style="font-size:13px;color:${EMAIL_COLORS.textMuted};">Your data is safe and will be preserved.</p><hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;"><p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p></body></html>`
  return { subject: `Your ConsignIQ ${data.tierLabel} access ends on ${data.periodEndDate}`, text, html }
}

// ─── Access Ended ──────────────────────────────────────
interface AccessEndedEmailData { fullName: string; tierLabel: string; resubscribeUrl: string }

export function buildAccessEndedEmail(data: AccessEndedEmailData) {
  const text = `Hi ${data.fullName},\n\nYour ConsignIQ ${data.tierLabel} subscription period has ended. You now have access to basic pricing features only.\n\nAll your data (consignors, items, reports) is preserved and waiting for you. Resubscribe anytime to restore full access: ${data.resubscribeUrl}\n\nThanks,\nThe ConsignIQ Team`
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1f2937;max-width:480px;margin:0 auto;padding:24px;"><h2 style="font-size:18px;font-weight:bold;margin-bottom:16px;">Your subscription period has ended</h2><p>Hi ${data.fullName},</p><p>Your ConsignIQ <strong>${data.tierLabel}</strong> subscription period has ended. You now have access to basic pricing features only.</p><p>All your data (consignors, items, reports) is preserved and waiting for you.</p><p><a href="${data.resubscribeUrl}" style="display:inline-block;background:${EMAIL_COLORS.brandPrimary};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Resubscribe Now</a></p><hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;"><p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p></body></html>`
  return { subject: 'Your ConsignIQ subscription period has ended', text, html }
}

// ─── Payment Final Warning ──────────────────────────────
interface PaymentFinalWarningEmailData { fullName: string; portalUrl: string }

export function buildPaymentFinalWarningEmail(data: PaymentFinalWarningEmailData) {
  const text = `Hi ${data.fullName},\n\nThis is a final warning — we've been unable to process your payment after multiple attempts. Your ConsignIQ subscription will be cancelled if payment is not resolved.\n\nPlease update your payment method immediately: ${data.portalUrl}\n\nThanks,\nThe ConsignIQ Team`
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1f2937;max-width:480px;margin:0 auto;padding:24px;"><h2 style="font-size:18px;font-weight:bold;color:${EMAIL_COLORS.dangerButton};margin-bottom:16px;">Final payment warning</h2><p>Hi ${data.fullName},</p><p>This is a final warning — we've been unable to process your payment after multiple attempts. Your ConsignIQ subscription will be cancelled if payment is not resolved.</p><p><a href="${data.portalUrl}" style="display:inline-block;background:${EMAIL_COLORS.dangerButton};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Update Payment Method</a></p><hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;"><p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p></body></html>`
  return { subject: 'Final warning — update your ConsignIQ payment method', text, html }
}

// ─── Welcome Back (Resubscribe) ────────────────────────
interface WelcomeBackEmailData { fullName: string; tierLabel: string; dashboardUrl: string }

export function buildWelcomeBackEmail(data: WelcomeBackEmailData) {
  const text = `Hi ${data.fullName},\n\nWelcome back! Your ConsignIQ ${data.tierLabel} subscription is active again. All your data — consignors, items, reports, and settings — is right where you left it.\n\nHead to your dashboard: ${data.dashboardUrl}\n\nThanks,\nThe ConsignIQ Team`
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1f2937;max-width:480px;margin:0 auto;padding:24px;"><h2 style="font-size:18px;font-weight:bold;margin-bottom:16px;">Welcome back!</h2><p>Hi ${data.fullName},</p><p>Your ConsignIQ <strong>${data.tierLabel}</strong> subscription is active again. All your data — consignors, items, reports, and settings — is right where you left it.</p><p><a href="${data.dashboardUrl}" style="display:inline-block;background:${EMAIL_COLORS.brandPrimary};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a></p><hr style="border:none;border-top:1px solid ${EMAIL_COLORS.borderDefault};margin:24px 0;"><p style="font-size:11px;color:${EMAIL_COLORS.textFaint};text-align:center;">This is an automated message from ConsignIQ.</p></body></html>`
  return { subject: 'Welcome back to ConsignIQ!', text, html }
}

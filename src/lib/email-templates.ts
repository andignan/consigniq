// lib/email-templates.ts
// Email templates for agreement and notification emails

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
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#f5f0e8;border-radius:12px;padding:24px;margin-bottom:24px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:#78350f;">${data.storeName}</h1>
    <p style="margin:0;font-size:13px;color:#92400e;">${storeAddr}</p>
    ${storeContact ? `<p style="margin:4px 0 0;font-size:13px;color:#92400e;">${storeContact}</p>` : ''}
  </div>

  <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Consignment Agreement</h2>

  <p style="font-size:14px;line-height:1.6;color:#374151;">
    Dear ${data.consignorName},
  </p>
  <p style="font-size:14px;line-height:1.6;color:#374151;">
    Thank you for consigning with ${data.storeName}! This email confirms the terms of your consignment agreement.
  </p>

  <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
    <h3 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Agreement Details</h3>
    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b7280;">Intake Date</td><td style="padding:4px 0;font-weight:600;">${formatDate(data.intakeDate)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Agreement Expires</td><td style="padding:4px 0;font-weight:600;">${formatDate(data.expiryDate)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Grace Period Ends</td><td style="padding:4px 0;font-weight:600;">${formatDate(data.graceEndDate)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Revenue Split</td><td style="padding:4px 0;font-weight:600;">${data.splitConsignor}% to you / ${data.splitStore}% to store</td></tr>
    </table>
  </div>

  <h3 style="font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 12px;">Items Consigned (${data.items.length} total)</h3>
  <table style="width:100%;font-size:13px;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;">Item</th>
        <th style="padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;">Category</th>
        <th style="padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;">Condition</th>
      </tr>
    </thead>
    <tbody>
      ${itemListHtml}
    </tbody>
  </table>

  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:24px 0;">
    <h3 style="margin:0 0 8px;font-size:14px;color:#92400e;">How It Works</h3>
    <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:#78350f;">
      <li>Your items will be displayed for sale for <strong>${data.agreementDays} days</strong> from intake.</li>
      <li>When an item sells, you receive <strong>${data.splitConsignor}%</strong> of the sale price.</li>
      <li>After ${data.agreementDays} days, if items remain unsold, you have a <strong>${data.graceDays}-day grace period</strong> (until ${formatDate(data.graceEndDate)}) to pick them up.</li>
      <li>Items not picked up after the grace period may be donated or disposed of at the store's discretion.</li>
    </ul>
  </div>

  <p style="font-size:14px;line-height:1.6;color:#374151;">
    To pick up unsold items, please visit <strong>${data.storeName}</strong> during business hours before <strong>${formatDate(data.graceEndDate)}</strong>.
    ${data.storePhone ? ` Contact us at <strong>${data.storePhone}</strong> with any questions.` : ''}
  </p>

  <p style="font-size:14px;line-height:1.6;color:#374151;">
    Thank you for choosing ${data.storeName}!
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:11px;color:#9ca3af;text-align:center;">
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

  const text = `Hi ${data.fullName},

You've been invited to ConsignIQ!

Account: ${data.accountName}
Plan: ${tierName}

To get started, set your password and log in using the link below:

${data.setupLink}

This link expires in 24 hours. If it expires, contact your administrator for a new invite.

Welcome aboard!
The ConsignIQ Team

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#f5f0e8;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <h1 style="margin:0 0 4px;font-size:22px;color:#78350f;">ConsignIQ</h1>
    <p style="margin:0;font-size:13px;color:#92400e;">AI-Powered Consignment Management</p>
  </div>

  <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">You're Invited!</h2>

  <p style="font-size:14px;line-height:1.6;color:#374151;">
    Hi ${data.fullName},
  </p>
  <p style="font-size:14px;line-height:1.6;color:#374151;">
    You've been invited to join <strong>${data.accountName}</strong> on ConsignIQ.
  </p>

  <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b7280;">Account</td><td style="padding:4px 0;font-weight:600;">${data.accountName}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Plan</td><td style="padding:4px 0;font-weight:600;">${tierName}</td></tr>
    </table>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="${data.setupLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      Set Up Your Account
    </a>
  </div>

  <p style="font-size:13px;line-height:1.6;color:#6b7280;text-align:center;">
    This link expires in 24 hours. If it expires, contact your administrator for a new invite.
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:11px;color:#9ca3af;text-align:center;">
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
  const text = `Hi ${data.fullName},

We received a request to reset your ConsignIQ password.

Click the link below to set a new password:

${data.resetLink}

This link expires in 24 hours. If you didn't request this, you can safely ignore this email.

The ConsignIQ Team

This is an automated message from ConsignIQ.
`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#f5f0e8;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <h1 style="margin:0 0 4px;font-size:22px;color:#78350f;">ConsignIQ</h1>
    <p style="margin:0;font-size:13px;color:#92400e;">AI-Powered Consignment Management</p>
  </div>

  <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Reset Your Password</h2>

  <p style="font-size:14px;line-height:1.6;color:#374151;">
    Hi ${data.fullName},
  </p>
  <p style="font-size:14px;line-height:1.6;color:#374151;">
    We received a request to reset your ConsignIQ password. Click the button below to set a new password.
  </p>

  <div style="text-align:center;margin:28px 0;">
    <a href="${data.resetLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      Reset Password
    </a>
  </div>

  <p style="font-size:13px;line-height:1.6;color:#6b7280;text-align:center;">
    This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:11px;color:#9ca3af;text-align:center;">
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
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Agreement Expiring Soon</h2>

  <p style="font-size:14px;line-height:1.6;color:#374151;">Hi ${data.consignorName},</p>

  <p style="font-size:14px;line-height:1.6;color:#374151;">
    This is a friendly reminder that your consignment agreement with <strong>${data.storeName}</strong> expires on <strong>${formatDate(data.expiryDate)}</strong>.
  </p>

  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:#991b1b;">
      If you have unsold items, please arrange to pick them up by <strong>${formatDate(data.graceEndDate)}</strong> (the end of the grace period). After this date, uncollected items may be donated or disposed of.
    </p>
  </div>

  ${data.storePhone ? `<p style="font-size:14px;line-height:1.6;color:#374151;">Contact us at <strong>${data.storePhone}</strong> with any questions.</p>` : ''}

  <p style="font-size:14px;line-height:1.6;color:#374151;">
    Thank you,<br><strong>${data.storeName}</strong>
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:11px;color:#9ca3af;text-align:center;">This is an automated message from ConsignIQ.</p>
</body>
</html>`

  const subject = `Your consignment agreement expires soon — ${data.storeName}`

  return { subject, text, html }
}

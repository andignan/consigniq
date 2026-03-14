// lib/email.ts
// Email sending helper using Resend
import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const resend = getResend()
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@consigniq.com'

  const { data, error } = await resend.emails.send({
    from: `ConsignIQ <${from}>`,
    to,
    subject,
    text,
    html,
  })

  if (error) {
    throw new Error(`Email send failed: ${error.message}`)
  }

  return data
}

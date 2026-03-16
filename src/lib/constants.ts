// App-wide constants — single source of truth for branding and config
export const APP = {
  name: 'ConsignIQ',
  tagline: 'AI-Powered Pricing & Inventory',
  logoTagline: 'AI-Powered Pricing & Inventory',
  emailTagline: 'AI-Powered Consignment Management',
  supportEmail: 'admin@getconsigniq.com',
  version: 'v1.0',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://getconsigniq.com',
} as const

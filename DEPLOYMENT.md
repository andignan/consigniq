# ConsignIQ — Vercel Deployment Guide

## Prerequisites

- GitHub repo connected to Vercel
- Supabase project (production)
- Anthropic API key
- SerpApi key
- Stripe account (live keys for production)
- Resend account with verified domain

## Environment Variables

Set all of these in **Vercel → Project → Settings → Environment Variables**:

### Required (app won't function without these)

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (keep secret) |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://consigniq.com` |

### Feature-specific (graceful degradation if missing)

| Variable | Feature | Behavior if missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI pricing & photo identification | Returns 500 with "API key not configured" |
| `SERPAPI_KEY` | eBay sold comp lookups | Returns 500 with "API key not configured" |
| `RESEND_API_KEY` | Email (agreements, notices) | Email features disabled |
| `RESEND_FROM_EMAIL` | Email sender address | Defaults to `noreply@consigniq.com` |
| `STRIPE_SECRET_KEY` | Billing portal | Returns error on billing actions |
| `STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Checkout won't initialize |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Webhook events rejected |
| `STRIPE_STARTER_PRICE_ID` | Starter tier checkout | Checkout for that tier fails |
| `STRIPE_STANDARD_PRICE_ID` | Standard tier checkout | Checkout for that tier fails |
| `STRIPE_PRO_PRICE_ID` | Pro tier checkout | Checkout for that tier fails |

## Supabase Setup

1. Run all migrations in order from `supabase/migrations/` via the Supabase Dashboard SQL Editor
2. Ensure RLS policies are in place for multi-tenant data isolation
3. Enable Email auth provider in Supabase → Authentication → Providers
4. Set the Site URL in Supabase → Authentication → URL Configuration to your production URL

## Vercel Configuration

- **Framework Preset**: Next.js (auto-detected)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Node.js Version**: 18.x or 20.x
- **Root Directory**: `/` (default)

No special `next.config.mjs` settings required — the config is empty.

## Post-Deploy Checklist

1. Verify the app loads at your production URL
2. Test login with a Supabase user
3. Confirm Supabase connection (dashboard should load data)
4. Test AI pricing (requires `ANTHROPIC_API_KEY`)
5. Test eBay comps (requires `SERPAPI_KEY`)
6. Set up Stripe webhook endpoint: `https://your-domain.com/api/billing/webhook`
7. Verify `credentials: 'include'` works on mobile Safari (session cookies)

## Stripe Webhook

After deploying, register your webhook endpoint in Stripe Dashboard → Developers → Webhooks:
- Endpoint URL: `https://your-domain.com/api/billing/webhook`
- Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## DNS & Custom Domain

Configure your custom domain in Vercel → Project → Settings → Domains. Vercel handles SSL automatically.

## Troubleshooting

- **401 on API routes**: Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly. `NEXT_PUBLIC_` vars must be available at build time.
- **Mobile Safari auth issues**: All client-side `fetch()` calls must include `credentials: 'include'`.
- **Missing data**: Ensure Supabase migrations have been run and RLS policies are active.
- **AI pricing returns 500**: Verify `ANTHROPIC_API_KEY` is set in Vercel env vars.

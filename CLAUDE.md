# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ConsignIQ

ConsignIQ is an AI-powered consignment and estate sale management platform. It tracks consignors, their items, pricing, lifecycle status (active/grace/donation-eligible), and store/consignor revenue splits. Built for brick-and-mortar consignment shops.

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- No test framework is configured yet

## Tech Stack

- **Next.js 14** (App Router, React 18, TypeScript, `src/` directory)
- **Supabase** for auth, database, and RLS — accessed via `@supabase/ssr`
- **Tailwind CSS 3** for styling
- **lucide-react** for icons
- Path alias: `@/*` maps to `./src/*`

## Architecture

### Supabase Client Pattern

Two Supabase client factories, both reading from env vars:
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`), used in `'use client'` components and in `src/lib/queries.ts`
- `src/lib/supabase/server.ts` — server client (`createServerClient`), uses `cookies()` from `next/headers`. Used in Server Components and API routes

### Data Layer

- **API routes** (`src/app/api/`) — RESTful endpoints for consignors and items. These use the server Supabase client, validate required fields, and attach `created_by` from the authenticated user.
- **Client query helpers** (`src/lib/queries.ts`) — convenience functions using the browser Supabase client for use in client components. These functions query consignors, items, inventory, locations, and dashboard stats.

### Type System

Two type files exist with overlapping but divergent definitions:
- `src/types/database.ts` — mirrors the Supabase schema closely, includes the `Database` generic interface for Supabase client typing
- `src/types/index.ts` — application-level types with UI helpers (`getLifecycleStatus`, `COLOR_CLASSES`, `ITEM_CATEGORIES`, `CONDITION_LABELS`). This is what most components import from `@/types`

Note: these files have some mismatches (e.g., field names like `split_pct_store` vs `split_store`, `grace_period_days` vs `grace_days`). The `types/index.ts` version reflects the actual app usage.

### Auth & Layout

- Auth: Supabase email/password auth. Login at `/auth/login`.
- Dashboard layout (`src/app/dashboard/layout.tsx`) checks auth server-side and redirects to login if unauthenticated. It also loads the user profile with joined account and location data for the Sidebar.
- No middleware file exists yet — auth is checked in the dashboard layout.

### Multi-tenancy Model

Data is scoped by `account_id` and `location_id`. The dashboard reads `location_id` from query params or falls back to `DEFAULT_LOCATION_ID` env var. RLS policies in Supabase handle row-level access control.

### Consignor Lifecycle

Core domain concept: consignors go through intake_date -> expiry_date -> grace_end_date. The `getLifecycleStatus()` function in `src/types/index.ts` computes lifecycle state (days remaining, color coding, grace/donation eligibility) used throughout the UI.

## Environment Variables

See `.env.example` for the full list. Key services: Supabase, Anthropic (AI pricing), SerpApi (eBay comps), Resend (email).

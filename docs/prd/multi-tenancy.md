# Multi-Tenancy — PRD

**Status:** Implemented

## Data Hierarchy

```
Account (1)
├── Location (1..N)  — Standard+ for multi-location
│   ├── User (1..N)  — staff locked to one location
│   ├── Consignor (0..N)
│   ├── Item (0..N)
│   └── Markdown (0..N)
├── User (1..N)      — owners see all locations
├── Price History (0..N)
├── Agreement (0..N)
└── Invitation (0..N)
```

## account_id Scoping

Every data table has an `account_id` column. All queries from authenticated routes scope by `account_id` from the user's profile. This ensures accounts never see each other's data.

**Server components:** Read `account_id` from the profile query.
**API routes:** Use `getAuthenticatedProfile()` to get `account_id`, then scope queries.
**Client components:** Use `useUser().account_id`.

## RLS (Row-Level Security)

Supabase RLS policies enforce data isolation at the database level:
- Users can only read/write rows where `account_id` matches their own account
- RLS is the defense-in-depth layer — application code also scopes queries
- Superadmin uses `createAdminClient()` (service role) to bypass RLS for cross-account queries

## Location Context

`LocationContext` (`src/contexts/LocationContext.tsx`):
- **Staff:** Locked to assigned `location_id`, cannot switch
- **Owner:** Can switch between locations + "All Locations" view
- **Storage:** `localStorage` key `consigniq_active_location`
- **URL sync:** Updates `?location_id=` query param on switch so server components react
- **Exposed:** `activeLocationId` (null = all), `activeLocationName`, `locations[]`, `isAllLocations`, `canSwitchLocations`, `setActiveLocation()`

## Owner vs Staff Access

| Capability | Owner | Staff |
|---|---|---|
| Switch locations | Yes (sidebar dropdown) | No (locked to assigned location) |
| "All Locations" view | Yes | No |
| Edit location settings | Yes | Read-only |
| Account settings | Yes | Hidden |
| Billing management | Yes | Hidden |
| Invite users | Yes | No |
| Intake items | Yes | Yes |
| Price items | Yes | Yes |
| View reports | Yes (all locations) | Yes (own location only) |

## Multi-Location (Standard+ tier)

- Location switcher in sidebar (owners only, hidden for solo/single-location)
- "All Locations" aggregate view: queries use `account_id` instead of `location_id`
- Each location has independent settings: splits, agreement days, grace days, markdown toggle
- Create locations via Settings → Locations tab or `/api/locations` POST

## Superadmin Bypass

- `createAdminClient()` in `src/lib/supabase/admin.ts` — creates client with `SUPABASE_SERVICE_ROLE_KEY`, bypasses all RLS
- `checkSuperadmin()` — authenticates via regular client, then verifies `is_superadmin` via service role (needed because superadmin may not satisfy RLS)
- All admin routes (`/api/admin/*`) use service role for cross-account queries
- Admin layout checks `is_superadmin` server-side, redirects non-superadmins to `/dashboard`

## Critical Rules

- **Never hardcode `location_id`** — use `useLocation().activeLocationId` in client components, `searchParams.location_id` in server components, request params in API routes
- **Every auth user must have a `users` table row** — auth alone is not enough
- **Superadmin checks must use service role** — superadmin may not have an `account_id` that satisfies RLS

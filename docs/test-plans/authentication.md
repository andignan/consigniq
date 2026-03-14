# Authentication Test Plan

## Scope
Supabase email/password auth, middleware route protection, session handling.

## Happy Path
1. Navigate to `/auth/login`
2. Enter valid email and password
3. Verify redirect to `/dashboard`
4. Verify sidebar shows user name and role
5. Sign out — verify redirect to `/auth/login`

## Edge Cases
- [ ] Invalid email/password shows error message
- [ ] Empty email or password shows validation error
- [ ] Accessing `/dashboard` while logged out redirects to `/auth/login`
- [ ] Accessing `/api/items` while logged out returns 401 JSON (not HTML redirect)
- [ ] `/api/auth/*` routes are NOT protected by middleware
- [ ] Session persists across page refresh
- [ ] Session persists across browser tabs

## Role Enforcement
- [ ] Owner user can access all dashboard pages
- [ ] Staff user can access all dashboard pages
- [ ] Staff user cannot see Account Settings tab on `/dashboard/settings`

## Mobile
- [ ] Login page renders correctly on mobile viewport
- [ ] Session cookies work on mobile Safari (critical: `credentials: 'include'`)
- [ ] After login, mobile sidebar hamburger menu is functional

## Current Status
- **Automated**: Middleware protection tested indirectly via API route tests
- **Manual**: Requires Supabase account with test credentials

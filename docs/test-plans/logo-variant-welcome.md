# Manual Test Plan: Logo Variant + Welcome Message

## Logo Variant (dark/light)

### Admin Sidebar
- [ ] Navigate to `/admin` — "Consign" text is white, "IQ" is teal (#0A9E78)
- [ ] Check mobile view — hamburger menu opens sidebar, same white "Consign" + teal "IQ"
- [ ] "Admin" badge is visible next to logo

### Dashboard Sidebar
- [ ] Navigate to `/dashboard` — sidebar shows "Consign" in white, "IQ" in teal
- [ ] Mobile: hamburger menu sidebar shows same
- [ ] Compare with login page (`/auth/login`) — logo on light bg shows "Consign" in dark text, "IQ" teal

### Auth Pages (light variant)
- [ ] `/auth/login` — Logo shows "Consign" in dark text (inherits parent), "IQ" in teal
- [ ] `/auth/setup-password` — same
- [ ] `/auth/invite` — same

## Welcome Message Consistency

### Solo Dashboard
- [ ] Log in as Solo user → sees "Welcome back, [firstName]!" at top
- [ ] If user has no `full_name`, sees "Dashboard" instead

### Single Location View (Starter/Standard/Pro)
- [ ] Log in as staff/owner with single location → sees "Welcome back, [firstName]!"
- [ ] Date shown below: "Monday, March 16" format

### All Locations View (Owner)
- [ ] Log in as owner, no `location_id` param → All Locations view
- [ ] Sees "Welcome back, [firstName]!" at top
- [ ] Subtitle shows "All Locations · Monday, March 16"

### Edge Cases
- [ ] User with no `full_name` set → all views show "Dashboard" instead of welcome
- [ ] User with multi-word name (e.g. "Jane Smith") → shows "Welcome back, Jane!"

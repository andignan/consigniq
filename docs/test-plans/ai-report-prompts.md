# AI Report Prompts Test Plan

## Scope
Natural language prompt bar on Reports page. User asks a question, Claude generates SQL, validates and executes against Supabase, returns results with AI summary.

## Prompt Bar UI

### Happy Path
1. Navigate to /dashboard/reports
2. Verify AI prompt bar visible at top with Sparkles icon and "Ask a question about your data" label
3. Verify text input with placeholder and Send button
4. Verify 6 suggested prompt chips displayed below input
5. Type "What are our top 5 selling categories?" → press Enter → verify loading spinner
6. Verify result panel appears with: question, AI summary (indigo background), data table, "Powered by AI" label
7. Click X on result panel → verify it closes and input clears
8. Click a suggested prompt chip → verify it populates input and auto-submits
9. Verify Ask button is disabled when input is empty
10. Verify Ask button is disabled during loading

### Edge Cases
- [ ] Enter key submits query
- [ ] Empty input does not submit
- [ ] Error response shows red error banner with X to dismiss
- [ ] Result table handles columns with underscores (displayed as spaces)
- [ ] Null values in results display as "—"
- [ ] Long results table scrolls horizontally
- [ ] No results shows "No results returned." message
- [ ] Multiple queries replace previous result

## API Route Security

### Happy Path
1. Submit a valid question → verify 200 response with question, sql, summary, rows, columns
2. Verify SQL contains real account_id (not placeholder)
3. Verify response includes generated SQL string

### SQL Validation
- [ ] Non-SELECT queries rejected with 422
- [ ] INSERT/UPDATE/DELETE/DROP/ALTER rejected with 422
- [ ] Queries without account_id scoping rejected with 422
- [ ] Queries accessing `users` table rejected with 422
- [ ] Queries accessing `accounts` table rejected with 422
- [ ] Queries accessing `invitations` table rejected with 422
- [ ] Queries accessing `agreements` table rejected with 422

### Role-Based Location Scoping
- [ ] Staff user: query always includes `location_id = '<staff_location>'` filter
- [ ] Owner with specific location selected: query includes `location_id = '<selected>'` filter
- [ ] Owner with "All Locations": query uses `account_id` only, no location filter
- [ ] Unauthenticated user: returns 401

### Error Handling
- [ ] Missing ANTHROPIC_API_KEY returns 500
- [ ] Empty question returns 400
- [ ] Missing question returns 400
- [ ] RPC function not found: returns generated SQL with explanation message

## API Tests (Automated)
- [ ] Returns 401 for unauthenticated user
- [ ] Returns 400 for empty question
- [ ] Returns 400 for missing question
- [ ] Returns 500 if ANTHROPIC_API_KEY not set
- [ ] Rejects non-SELECT queries (422)
- [ ] Rejects queries with INSERT/UPDATE/DROP (422)
- [ ] Rejects queries accessing forbidden tables (422)
- [ ] Rejects queries without account_id scoping (422)
- [ ] Returns rows, columns, summary for valid query
- [ ] Adds location_id filter for staff users
- [ ] No location filter for owner with "all" locations
- [ ] Replaces account_id placeholder with real account_id

## Mobile
- [ ] Prompt bar fully visible on mobile
- [ ] Suggested chips wrap on narrow screens
- [ ] Result table scrolls horizontally
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: 12 API tests for `/api/reports/query`
- **Manual**: Full UI workflow verification required for prompt bar, results display, and security

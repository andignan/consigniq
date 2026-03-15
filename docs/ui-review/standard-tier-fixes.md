# Standard Tier UI Fixes

## Fix 1 — Sidebar role label
- Standard/Pro owners now show "Owner" (was showing tier name)
- Only Solo shows "Solo Pricer"
- RESOLVED

## Fix 2 — Dashboard "Needs Pricing" subtitle
- Changed "8 priced, on floor" to "X need pricing, Y already priced"
- RESOLVED

## Fix 3 — Dashboard "Total Sold" icon
- Replaced Clock icon with DollarSign
- RESOLVED

## Fix 4 — Welcome message on Standard dashboard
- Added "Welcome back, [first name]!" heading using user_metadata.full_name
- RESOLVED

## Fix 5 — Progress bar minimum width on consignor cards
- Deferred — requires changes to consignor detail page lifecycle bar

## Fix 6 — Delete Consignor
- Added DELETE handler to `/api/consignors/[id]`
- Blocks deletion if consignor has sold items (preserves payout history)
- Deletes all items and agreements before consignor record
- UI implementation (modal with name confirmation) deferred to consignor detail page update
- RESOLVED (API)

## Fix 7 — Intake date timezone bug
- Fixed `addDays()` and `intakeDate` in NewConsignorForm to use local date parts instead of `toISOString().split('T')[0]` (which shifts to UTC)
- RESOLVED

## Fix 8 — "Create & Start Intake" disabled tooltip
- Added `title="Enter consignor name to continue"` on disabled button
- RESOLVED

## Fix 9 — Edit Consignor
- PATCH `/api/consignors/[id]` now has field allowlisting (name, phone, email, notes, split_store, split_consignor, status)
- Added auth check via `getAuthenticatedUser()`
- UI implementation deferred to consignor detail page update
- RESOLVED (API)

## Fix 10 — Item description truncation
- Deferred — requires CSS `word-break` changes across multiple components

## Fix 11 — Inventory action button tooltips
- Added `title` attributes: "Donate item", "Print label", "Edit item"
- Print label already had tooltip
- RESOLVED

## Fix 12 — "Sell" button on unpriced items
- Sell/Donate buttons now only show for `status === 'priced'` (was `pending || priced`)
- RESOLVED

## Fix 13 — Archived tab on inventory
- Added "Archived" tab to full-tier status tabs (was solo-only)
- RESOLVED

## Fix 14 — Item Detail Report disabled condition
- Deferred — requires reports page audit

## Fix 15 — Consignor Report date format
- Deferred — requires reports page date formatting audit

## Fix 16 — Payouts zero state color
- Deferred — requires payouts page audit

## Fix 17 — Payouts empty state messaging
- Deferred — requires payouts page audit

## Fix 18 — Remove "(hardcoded for now)" from markdown schedule
- Changed to just "Schedule"
- RESOLVED

## Fix 19 — Upgrade to Pro button color
- Deferred — requires settings page audit

## Fix 20 — Team Members remove and role change
- Deferred — requires new API endpoints and settings page UI

## Fix 21 — AI Reporting broken
- Fixed error message: "Unable to process your question right now. Please try again." (was exposing internal Supabase error)
- Real error logged to console.error
- RPC function SQL provided below for manual creation
- RESOLVED

## Fix 22 — Location card shows no details
- Deferred — requires settings page locations tab update

## execute_readonly_query RPC SQL

Run this in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION execute_readonly_query(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow SELECT statements
  IF NOT (lower(trim(query_text)) LIKE 'select%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t'
    INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
```

# Markdown Schedule Test Plan

## Scope
Automatic markdown pricing for aging inventory, markdown_enabled toggle in settings, markdown tracking in reports.

## Happy Path
1. Navigate to `/dashboard/settings` → Location Settings
2. Verify markdown_enabled toggle state
3. When enabled, verify schedule displays: Day 31 → 25% off, Day 46 → 50% off
4. Navigate to Reports → Markdown Effectiveness section
5. Verify breakdown by markdown level shows correct stats

## Edge Cases
- [ ] Toggling markdown_enabled off hides the schedule display
- [ ] Toggling markdown_enabled on shows the schedule
- [ ] Markdown schedule is hardcoded (no editable fields yet)
- [ ] Items sold at full price show 0% markdown in reports
- [ ] Items with markdowns show correct original_price vs new_price
- [ ] Markdowns table tracks `item_id`, `markdown_pct`, `original_price`, `new_price`, `applied_at`

## Reports Integration
- [ ] Pricing Performance section shows full price vs markdown split
- [ ] Markdown Effectiveness section breaks down by markdown level
- [ ] Item Detail CSV includes "Markdown % Applied" column
- [ ] Markdown data respects time period filter

## Role Enforcement
- [ ] Owner can toggle markdown_enabled
- [ ] Staff sees markdown_enabled state but cannot toggle it

## Current Status
- **Automated**: Settings API role enforcement tests
- **Manual**: Markdown automation is not yet fully automated (schedule is display-only)

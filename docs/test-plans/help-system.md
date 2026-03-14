# Help System Test Plan

## Scope
Three-layer help system: field tooltips, floating help widget with quick links, AI-powered search.

## Layer 1 — Tooltips

### Happy Path
1. Navigate to Settings → Location Settings
2. Verify ? icon appears next to "Default Store Split %" label → hover shows tooltip about store revenue share
3. Verify ? icon appears next to "Default Consignor Split %" label → hover shows tooltip about consignor share
4. Verify ? icon appears next to "Agreement Duration (days)" label → hover shows tooltip about 60-day window
5. Verify ? icon appears next to "Grace Period (days)" label → hover shows tooltip about grace period
6. Verify ? icon appears next to "Automatic markdowns" toggle → hover shows tooltip about markdown schedule
7. Navigate to Inventory → Price a pending item → run AI pricing
8. Verify ? icon appears next to the price range (low-high) → hover shows tooltip about confidence range
9. Navigate to Consignors → find a consignor past grace period
10. Verify ? icon appears next to "Donate" badge → hover shows tooltip about donation eligibility

### Edge Cases
- [ ] Tooltip appears on hover (desktop)
- [ ] Tooltip appears on click/tap (mobile)
- [ ] Tooltip closes when clicking outside
- [ ] Tooltip content is 1-2 sentences max
- [ ] Tooltip positions correctly (above the ? icon with arrow)
- [ ] Multiple tooltips on same page — only one open at a time (via click-outside)

## Layer 2 — Floating Help Widget

### Happy Path
1. Navigate to any /dashboard page
2. Verify floating ? button visible in bottom-right corner
3. Click the ? button → verify help panel opens
4. Verify search box at top of panel
5. Verify three quick link sections: "Getting Started", "Pricing Help", "Account & Settings"
6. Click "How do I add a consignor?" → verify answer appears inline below the question
7. Click same question again → verify answer collapses
8. Click a different question → verify previous answer closes, new one opens
9. Click X button → verify panel closes
10. Click outside panel → verify panel closes (desktop)
11. Reopen panel → verify previous state is reset (no answers expanded)

### Edge Cases
- [ ] Widget does NOT appear on /admin pages
- [ ] Widget visible on all /dashboard/* pages
- [ ] Panel closes with X button
- [ ] Panel closes when clicking backdrop
- [ ] Quick link answers are accurate and match knowledge base
- [ ] 9 quick links total across 3 sections

## Layer 3 — AI Help Search

### Happy Path
1. Open help widget
2. Type "How do I change the split percentage?" in search box
3. Press Enter → verify loading indicator appears
4. Verify AI answer appears below search box
5. Verify "Powered by AI" label appears below the answer
6. Verify answer is relevant to ConsignIQ (not generic)
7. Ask an off-topic question → verify response says it can only help with ConsignIQ

### Edge Cases
- [ ] Empty search query does not submit
- [ ] API returns 400 for empty question body
- [ ] API returns 500 if ANTHROPIC_API_KEY not set
- [ ] AI answer scoped to ConsignIQ — system prompt instructs Claude accordingly
- [ ] Knowledge base passed as system context to Claude
- [ ] Search response appears in indigo panel with "Powered by AI" label
- [ ] Loading state shows spinner while waiting for AI response

## API Tests (Automated)
- [ ] POST `/api/help/search` returns 400 for empty question
- [ ] POST `/api/help/search` returns 400 for missing question
- [ ] POST `/api/help/search` returns 500 if no API key
- [ ] POST `/api/help/search` returns answer for valid question
- [ ] POST `/api/help/search` passes knowledge base in system prompt
- [ ] POST `/api/help/search` system prompt scopes to ConsignIQ only

## Unit Tests (Automated)
- [ ] Knowledge base contains all topic sections
- [ ] Knowledge base includes key split, lifecycle, and markdown details

## Mobile
- [ ] Floating ? button visible on mobile
- [ ] Help panel opens full-screen on mobile (not just a corner panel)
- [ ] Mobile panel has backdrop overlay
- [ ] Search input usable on mobile keyboard
- [ ] Quick links expand/collapse on tap
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: 6 API tests for `/api/help/search` + 4 knowledge base unit tests
- **Manual**: Full UI workflow verification required for tooltips, widget, and AI search

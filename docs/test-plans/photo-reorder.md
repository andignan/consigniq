# Manual Test Plan: Photo Reorder & Make Primary

## Prerequisites
- Logged in as any tier user
- Navigate to Price Lookup or Inventory pricing page

## Test Cases

### 1. Upload 3 photos
- [ ] Upload photo A, then B, then C
- [ ] All 3 appear in row, "Add photo" button disappears
- [ ] Photo A shows "★ Primary" filled teal pill below it

### 2. Set Primary — 3 photos
- [ ] Photo B and C show "Set Primary" outline pill buttons (always visible, no hover needed)
- [ ] Click "Set Primary" on photo B → photo B moves to position 1, gets "★ Primary" pill
- [ ] Photos now: B, A, C
- [ ] Click "Set Primary" on photo C → photo C moves to position 1
- [ ] Photos now: C, B, A

### 3. Set Primary — 2 photos
- [ ] Remove one photo (click X)
- [ ] Non-primary photo shows "Set Primary" pill button
- [ ] Click "Set Primary" → photos swap, new primary shows "★ Primary"

### 4. Single photo — no primary controls
- [ ] Remove photos until only 1 remains
- [ ] No "★ Primary" pill or "Set Primary" button shown
- [ ] No reorder arrows shown

### 5. Reorder arrows still work
- [ ] Upload 3 photos (A, B, C)
- [ ] Hover over photo B → left/right arrows appear on left side
- [ ] Click left arrow → B moves to position 1
- [ ] Click right arrow on middle photo → moves right
- [ ] First photo has no left arrow, last photo has no right arrow

### 6. Disabled / analyzing states
- [ ] While analyzing, no primary controls or reorder arrows appear
- [ ] While disabled, no primary controls or reorder arrows appear

### 7. Analyze button three-state styling
- [ ] 0 photos: button shows "Analyze Photos", grey disabled (`bg-gray-200 text-gray-400`)
- [ ] 1-2 photos: button shows "Analyze N Photo(s)", teal outline (`border-brand-600 text-brand-600`) — secondary prominence
- [ ] 3 photos: button shows "Analyze 3 Photos", filled teal (`bg-brand-600 text-white`) — full prominence

### 8. Analyze button after reorder
- [ ] Upload 2 photos, click "Set Primary" to reorder
- [ ] Click "Analyze 2 Photos" → analysis runs with correct photo order

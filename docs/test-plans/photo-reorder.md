# Manual Test Plan: Photo Reorder & Make Primary

## Prerequisites
- Logged in as any tier user
- Navigate to Price Lookup or Inventory pricing page

## Test Cases

### 1. Upload 3 photos
- [ ] Upload photo A, then B, then C
- [ ] All 3 appear in row, "Add photo" button disappears
- [ ] Photo A shows "Primary" badge

### 2. Make Primary — 3 photos
- [ ] Hover over photo B → "Primary" button appears at bottom
- [ ] Click "Primary" → photo B moves to position 1, gets Primary badge
- [ ] Photos now: B, A, C
- [ ] Hover over photo C → "Primary" button appears
- [ ] Click "Primary" → photo C moves to position 1
- [ ] Photos now: C, B, A

### 3. Make Primary — 2 photos
- [ ] Remove one photo (click X)
- [ ] Hover over the non-primary photo → "Primary" button appears
- [ ] Click "Primary" → photos swap, new primary has badge

### 4. Single photo — no reorder controls
- [ ] Remove photos until only 1 remains
- [ ] Hover over photo — no reorder arrows, no "Primary" button
- [ ] No "Primary" badge shown

### 5. Reorder arrows still work
- [ ] Upload 3 photos (A, B, C)
- [ ] Hover over photo B → left/right arrows appear on left side
- [ ] Click left arrow → B moves to position 1
- [ ] Click right arrow on middle photo → moves right
- [ ] First photo has no left arrow, last photo has no right arrow

### 6. Disabled / analyzing states
- [ ] While analyzing, no "Primary" button or reorder arrows appear
- [ ] While disabled, no "Primary" button or reorder arrows appear

### 7. Analyze button after reorder
- [ ] Upload 2 photos, click "Make Primary" to reorder
- [ ] Click "Analyze 2 Photos" → analysis runs with correct photo order

# Manual Test Plan — Brand Guidelines (docs/brand-guidelines.md)

## Objective
Verify `docs/brand-guidelines.md` exists as the canonical brand reference and that its content matches `docs/prd/brand-identity.md`.

## Prerequisites
- Access to the repository

## Test Cases

### 1. File exists
- [ ] `docs/brand-guidelines.md` exists at the root docs level (not inside prd/)

### 2. Content matches PRD source
- [ ] Open both `docs/brand-guidelines.md` and `docs/prd/brand-identity.md`
- [ ] Brand Colors section (Teal + Navy tables) matches
- [ ] Typography Colors table is present in both files
- [ ] Logo section matches
- [ ] Official Brand Files table matches
- [ ] Implementation section matches

### 3. v1.2 color mappings documented
- [ ] "Mapping from Previous Colors" table includes 4 v1.2 entries:
  - `text-gray-900` → `text-navy-800` (headings)
  - `#1a1a1a` → `#0d1f3c` (email textPrimary)
  - `text-gray-800` → `text-gray-700` (body text)
  - `text-brand-600` → `text-brand-500` (text links)

### 4. Typography Colors accuracy
- [ ] Headings: `#0d1f3c` / `text-navy-800`
- [ ] Body text: `#374151` / `text-gray-700`
- [ ] Metadata: `#6B7280` / `text-gray-500`
- [ ] Placeholder: `#9CA3AF` / `text-gray-400`
- [ ] Links: `#0A9E78` / `text-brand-500`
- [ ] Link hover: `#077D5F` / `hover:text-brand-600`
- [ ] Form input text: `#111827` / `text-gray-900`
- [ ] Email headings: `#0d1f3c` / `EMAIL_COLORS.textPrimary`

### 5. Spot-check code matches guidelines
- [ ] Open any dashboard page heading — uses `text-navy-800`
- [ ] Open any form input — uses `text-gray-900`
- [ ] Open `src/lib/email-templates.ts` — `textPrimary` is `'#0d1f3c'`
- [ ] Open a standalone text link — uses `text-brand-500 hover:text-brand-600`

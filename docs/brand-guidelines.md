# Brand Identity — ConsignIQ

## Brand Colors

### Primary — Brand Teal (v1.1)
| CSS Variable | Tailwind | Hex | Usage |
|---|---|---|---|
| `--ciq-teal-50` | brand-50 | #E7F5EF | Light backgrounds, badges |
| `--ciq-teal-100` | brand-100 | #BDECD8 | Hover backgrounds |
| — | brand-200 | #9BDABD | Borders, rings (hardcoded) |
| — | brand-300 | #6CC9A1 | Disabled states (hardcoded) |
| `--ciq-teal-400` | brand-400 | #1FC896 | Secondary text on dark bg |
| `--ciq-teal-500` | brand-500 | #0A9E78 | **Primary brand color** — buttons, active states, "IQ" wordmark |
| `--ciq-teal-600` | brand-600 | #077D5F | Button default / hover |
| `--ciq-teal-700` | brand-700 | #055C46 | Deep accents |
| — | brand-800 | #056A50 | Bold text on light bg (hardcoded) |
| — | brand-900 | #034D3A | Darkest accent (hardcoded) |

### Secondary — Navy (v1.1)
| CSS Variable | Tailwind | Hex | Usage |
|---|---|---|---|
| `--ciq-navy-100` | navy-100 | #e2ecf6 | Light navy backgrounds |
| `--ciq-navy-200` | navy-200 | #c5d4e8 | Navy borders |
| `--ciq-navy-600` | navy-600 | #1e3f74 | Navy accents |
| `--ciq-navy-700` | navy-700 | #152d55 | Dark navy text |
| `--ciq-navy-800` | navy-800 | #0d1f3c | Primary text on light bg |
| `--ciq-navy-900` | navy-900 | #071020 | **Sidebar background**, email headers |

### Preserved Colors
- **Amber** (`amber-500`): Expiring consignor badge (warning semantics)
- **Red** (`red-*`): Destructive buttons, error states, payment-failed CTA
- **Emerald** (`emerald-*`): Success states (saved items, confirmations)
- **Orange** (`orange-*`): Warning alerts (expiring agreements)

## Typography Colors

| Role | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Headings | `#0d1f3c` | `text-navy-800` | h1/h2/h3, stat values, bold labels, modal titles, price displays |
| Body text | `#374151` | `text-gray-700` | Paragraphs, descriptions, table body text |
| Metadata | `#6B7280` | `text-gray-500` | Timestamps, secondary labels, captions |
| Placeholder | `#9CA3AF` | `text-gray-400` | Hints, helper text, empty states |
| Links | `#0A9E78` | `text-brand-500` | Standalone text links (not buttons/badges) |
| Link hover | `#077D5F` | `hover:text-brand-600` | Link hover state |
| Form input text | `#111827` | `text-gray-900` | Input, textarea, select values (kept for contrast) |
| Email headings | `#0d1f3c` | — | `EMAIL_COLORS.textPrimary` |

## Logo

### Wordmark
- "Consign" in current text color + "IQ" in inline `#0A9E78` (uses `style` not Tailwind class to guarantee teal on dark backgrounds)
- `variant="dark"`: "Consign" renders white (`#ffffff`) for use on dark backgrounds (sidebar, admin)
- `variant="light"` (default): "Consign" uses `text-current` (inherits parent color)
- Component: `src/components/Logo.tsx`
- Sizes: sm (44x28), md (50x32), lg (62x40) — ~1.56:1 aspect ratio
- Optional subtitle: "AI-Powered Pricing & Inventory"

### Mark
- Landscape price tag (56x36) — teal tag body with white grommet ring and text hint lines
- Files: `public/logo-mark.svg` (56x36), `public/favicon.svg` (64x64 dark bg)

## Official Brand Files (v1.1)

| File | Dimensions | Description |
|---|---|---|
| `src/styles/brand-tokens.css` | — | CSS custom properties (`--ciq-*` prefix) |
| `public/logo-mark.svg` | 56x36 | Landscape price tag mark (teal) |
| `public/favicon.svg` | 64x64 | Tag on dark navy rounded square |
| `public/wordmark-dark.svg` | 160x36 | Full lockup — mark + wordmark, white text (for dark backgrounds) |
| `public/wordmark-light.svg` | 160x36 | Full lockup — mark + wordmark, navy text (for light backgrounds) |
| `public/email-logo.png` | 200x130 | PNG render of mark on white background (for email) |
| `src/components/Logo.tsx` | — | React component with size/variant props |

## Implementation

### CSS Tokens (v1.1)
- File: `src/styles/brand-tokens.css`
- CSS custom properties use `--ciq-*` prefix (e.g., `--ciq-teal-500`, `--ciq-navy-900`)
- Semantic aliases: `--ciq-brand`, `--ciq-brand-hover`, `--ciq-brand-light`, `--ciq-brand-text`, `--ciq-bg-dark`
- Consumed by Tailwind via `tailwind.config.ts` → `extend.colors.brand` and `extend.colors.navy`
- Shades without CSS vars (200, 300, 800, 900) use hardcoded hex in Tailwind config
- Semantic tokens in Tailwind: `surface` (DEFAULT/page/section/muted), `border` (DEFAULT/subtle), `content` (DEFAULT/secondary/tertiary/muted)

### Shared Style Constants
- File: `src/lib/style-constants.ts` — single source of truth for repeated class strings
- `TIER_BADGE_CLASSES` — tier badge colors (solo/shop/enterprise), used by settings, admin users, admin accounts
- `STATUS_BADGE_CLASSES` — account status badge colors (active/suspended/cancelled/deleted), used by admin accounts
- `CARD_CLASSES` / `CARD_CLASSES_LG` — card containers (uses semantic tokens)
- `MODAL_BACKDROP` / `MODAL_CONTAINER` — modal overlay and panel classes
- `INPUT_CLASSES` / `PAGE_CONTAINER` / `SECTION_HEADER` — common layout patterns
- **Rule:** New badge/status color maps go here, not in individual page files

### Modal Component
- File: `src/components/ui/Modal.tsx`
- Props: `open`, `onClose`, `title?`, `children`, `maxWidth?` (default `max-w-md`)
- Handles: backdrop click to close, Escape key, scroll lock (`body.overflow = 'hidden'`)
- Uses `MODAL_BACKDROP` and `MODAL_CONTAINER` from style-constants
- Used by: inventory (edit/sell/donate), settings (invite), admin accounts (suspend/delete), admin users (add user)

### Mapping from Previous Colors
| Previous | New | Notes |
|---|---|---|
| `indigo-*` | `brand-*` | All instances across 22 files |
| `amber-500` (sidebar active nav) | `brand-500` | Teal left border + text |
| `amber-500` (auth buttons) | `brand-600` | Teal CTA buttons |
| `stone-900` (sidebar bg) | `navy-900` | Dark navy background |
| `#f5f0e8` (email header bg) | `#071020` | Navy email headers |
| `#78350f` (email header text) | `#ffffff` | White text on navy |
| `#4f46e5` (email CTA buttons) | `#0A9E78` | Teal email buttons |
| `red-*` (admin accent) | `brand-*` | Teal shield + active nav |
| `emerald-*` (lifecycle green) | `brand-*` | Lifecycle "green" badges use brand scale |
| `text-gray-900` (headings) | `text-navy-800` | v1.2 — headings, stat values, bold labels |
| `#1a1a1a` (email textPrimary) | `#0d1f3c` | v1.2 — email heading color matches navy-800 |
| `text-gray-800` (body text) | `text-gray-700` | v1.2 — body text normalization |
| `text-brand-600` (text links) | `text-brand-500` | v1.2 — standalone link color |

### Admin Panel Styling
- Admin sidebar: `bg-navy-900` (dark), Logo component + "Admin" badge, teal active nav (`border-l-2 border-brand-500 text-brand-400 bg-white/5`), white/stone text
- Admin buttons: `bg-brand-600` (primary), amber (disable/suspend), red (delete only)
- Admin stat numbers: standardized `text-navy-800` (no per-status colors)
- Admin stats filter: excludes "ConsignIQ System" account from all counts

### Preserved Semantic Colors
- **Red**: Delete buttons, error messages, destructive modals only
- **Amber**: Disable/suspend actions, warning semantics (expiring consignors)
- **Emerald**: Success states (paid, sold, confirmations)
- **Orange**: Suspend modal

### Welcome Message Pattern
All dashboard views display "Welcome back, [firstName]!" as the page heading when the user's `full_name` is available (falls back to "Dashboard"). The first name is extracted from `user_metadata.full_name` (first word). This applies consistently to:
- Solo dashboard (`SoloDashboard` component, client-side via `useUser().full_name`)
- All Locations view (server-side via `authUser.user_metadata.full_name`)
- Single location view (server-side, same pattern)

### Responsive Layout Standard
- Mobile: `w-full` with `px-4 py-6` padding (no max-width constraint)
- Desktop (1024px+): `lg:max-w-5xl lg:mx-auto` centers content at a comfortable reading width
- The `lg:` prefix ensures zero mobile impact — layout is identical below 1024px
- Applied to all dashboard page containers (11 files, 12 containers)
- NOT applied to: sidebar, admin pages, auth pages

### Icon Standard
- All icons use outlined/stroke style: `fill="none"` + `stroke="currentColor"`
- lucide-react icons are stroke-based by default
- Inline SVGs follow the same convention
- The logo mark is the only intentional filled exception (solid brand square with white tag)

### Button Hierarchy
- **Primary**: Filled teal (`bg-brand-600 hover:bg-brand-700 text-white`) — main CTA per page (e.g., "Price an Item", "New Consignor")
- **Secondary**: Teal outline (`border-2 border-brand-600 text-brand-600 hover:bg-brand-50`) — used for upgrade CTAs in cards and secondary actions
- Applied to SoloDashboard upgrade nudge button to avoid competing with "Price an Item" primary CTA

### UpgradeCard Component
- **File**: `src/components/UpgradeCard.tsx` — single source of truth for all upgrade CTAs
- **Props**: `targetTier` (shop/enterprise), `context` (dashboard/settings/inline), `onUpgrade` (callback), `loading`
- **Config**: `UPGRADE_CARD_CONFIG` object holds all copy/features per tier — change once, updates everywhere
- **Prices**: Derived from `TIER_CONFIGS[targetTier].price` — never hardcoded
- **`onUpgrade` pattern**: Parent page handles Stripe redirect; component stays billing-agnostic. Without `onUpgrade`, renders as `<Link>` to settings
- **Rule**: Never hardcode upgrade UI — always use UpgradeCard

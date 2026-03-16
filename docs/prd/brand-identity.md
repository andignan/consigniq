# Brand Identity — ConsignIQ

## Brand Colors

### Primary — Brand Teal
| Token | Hex | Usage |
|---|---|---|
| brand-50 | #E7F5EF | Light backgrounds, badges |
| brand-100 | #C3E8D8 | Hover backgrounds |
| brand-200 | #9BDABD | Borders, rings |
| brand-300 | #6CC9A1 | Disabled states |
| brand-400 | #3DB885 | Secondary text on dark bg |
| brand-500 | #0A9E78 | **Primary brand color** — buttons, active states, "IQ" wordmark |
| brand-600 | #088B6A | Button default |
| brand-700 | #077D5F | Button hover |
| brand-800 | #056A50 | Bold text on light bg |
| brand-900 | #034D3A | Darkest accent |

### Secondary — Navy
| Token | Hex | Usage |
|---|---|---|
| navy-800 | #0F1D33 | Dark UI borders |
| navy-900 | #071020 | **Sidebar background**, email headers |

### Preserved Colors
- **Amber** (`amber-500`): Expiring consignor badge (warning semantics)
- **Red** (`red-*`): Destructive buttons, error states, payment-failed CTA
- **Emerald** (`emerald-*`): Success states (saved items, confirmations)
- **Orange** (`orange-*`): Warning alerts (expiring agreements)

## Logo

### Wordmark
- "Consign" in current text color + "IQ" in inline `#0A9E78` (uses `style` not Tailwind class to guarantee teal on dark backgrounds)
- `variant="dark"`: "Consign" renders white (`#ffffff`) for use on dark backgrounds (sidebar, admin)
- `variant="light"` (default): "Consign" uses `text-current` (inherits parent color)
- Component: `src/components/Logo.tsx`
- Sizes: sm (28px mark), md (32px), lg (40px)
- Optional subtitle: "AI-Powered Pricing & Inventory"

### Mark
- Rounded square (#0A9E78) with white price tag icon (tag shape + circle cutout)
- Files: `public/logo-mark.svg`, `public/favicon.svg`

## Implementation

### CSS Tokens
- File: `src/styles/brand-tokens.css`
- CSS custom properties in `:root` block
- Consumed by Tailwind via `tailwind.config.ts` → `extend.colors.brand` and `extend.colors.navy`
- Semantic tokens in Tailwind: `surface` (DEFAULT/page/section/muted), `border` (DEFAULT/subtle), `content` (DEFAULT/secondary/tertiary/muted)
- Dark mode scaffold included (commented out)

### Shared Style Constants
- File: `src/lib/style-constants.ts` — single source of truth for repeated class strings
- `TIER_BADGE_CLASSES` — tier badge colors (solo/starter/standard/pro), used by settings, admin users, admin accounts
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

### Admin Panel Styling
- Admin sidebar: `bg-navy-900` (dark), Logo component + "Admin" badge, teal active nav (`border-l-2 border-brand-500 text-brand-400 bg-white/5`), white/stone text
- Admin buttons: `bg-brand-600` (primary), amber (disable/suspend), red (delete only)
- Admin stat numbers: standardized `text-gray-900` (no per-status colors)
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
- **Props**: `targetTier` (starter/standard/pro), `context` (dashboard/settings/inline), `onUpgrade` (callback), `loading`
- **Config**: `UPGRADE_CARD_CONFIG` object holds all copy/features per tier — change once, updates everywhere
- **Prices**: Derived from `TIER_CONFIGS[targetTier].price` — never hardcoded
- **`onUpgrade` pattern**: Parent page handles Stripe redirect; component stays billing-agnostic. Without `onUpgrade`, renders as `<Link>` to settings
- **Rule**: Never hardcode upgrade UI — always use UpgradeCard

### Files Modified
- 6 new files created (brand-tokens.css, Logo.tsx, favicon.svg, logo-mark.svg, brand-identity.md, layout.tsx icons)
- 27 files modified (sidebar, auth pages, admin sidebar, email templates, 20+ dashboard pages/components)
- Post-branding review: 15 additional files updated (20 fixes — admin sidebar dark theme, button/badge/tab color consistency, logo mark + sizing, UX fixes)

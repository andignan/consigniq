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
- Dark mode scaffold included (commented out)

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

### Files Modified
- 6 new files created (brand-tokens.css, Logo.tsx, favicon.svg, logo-mark.svg, brand-identity.md, layout.tsx icons)
- 27 files modified (sidebar, auth pages, admin sidebar, email templates, 20+ dashboard pages/components)
- Post-branding review: 15 additional files updated (20 fixes — admin sidebar dark theme, button/badge/tab color consistency, logo mark + sizing, UX fixes)

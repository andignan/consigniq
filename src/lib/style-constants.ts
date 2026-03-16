// Shared style constants — single source of truth for repeated class strings.
// Import from here instead of defining local maps in each file.

// ─── Tier badge classes ──────────────────────────────────────
// Used in: settings page, admin users, admin accounts
export const TIER_BADGE_CLASSES: Record<string, string> = {
  solo: 'bg-slate-100 text-slate-600',
  starter: 'bg-gray-100 text-gray-600',
  standard: 'bg-brand-50 text-brand-600',
  pro: 'bg-amber-50 text-amber-700',
}

// ─── Account status badge classes ────────────────────────────
// Used in: admin accounts list, admin account detail
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  suspended: 'bg-orange-50 text-orange-600',
  cancelled: 'bg-red-50 text-red-600',
  deleted: 'bg-gray-100 text-gray-400',
}

// ─── Layout class strings ────────────────────────────────────
export const CARD_CLASSES = 'bg-surface rounded-xl border border-border-subtle shadow-sm'
export const CARD_CLASSES_LG = 'bg-surface rounded-2xl border border-border-subtle shadow-sm'
export const MODAL_BACKDROP = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40'
export const MODAL_CONTAINER = 'bg-surface rounded-2xl shadow-xl w-full max-w-md mx-4 p-6'
export const INPUT_CLASSES = 'w-full px-3 py-2 text-sm rounded-lg border border-border text-content focus:outline-none focus:ring-2 focus:ring-brand-500'
export const PAGE_CONTAINER = 'w-full lg:max-w-5xl lg:mx-auto px-4 py-6'
export const SECTION_HEADER = 'text-sm font-semibold text-content-tertiary uppercase tracking-wider'

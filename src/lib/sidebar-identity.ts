// src/lib/sidebar-identity.ts
// Single source of truth for sidebar identity display logic

import type { Tier } from './tier-limits'

export const SIDEBAR_BADGES = {
  super_admin:      { label: 'Super Admin', color: 'red' },
  support:          { label: 'Support',     color: 'blue' },
  finance:          { label: 'Finance',     color: 'amber' },
  solo:             { label: 'Solo',        color: 'purple' },
  shop:             { label: 'Owner',       color: 'green' },
  shop_staff:       { label: 'Staff',       color: 'slate' },
  enterprise:       { label: 'Owner',       color: 'green' },
  enterprise_staff: { label: 'Staff',       color: 'slate' },
} as const

export type BadgeKey = keyof typeof SIDEBAR_BADGES
export type BadgeColor = typeof SIDEBAR_BADGES[BadgeKey]['color']

const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  amber:  'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  green:  'bg-brand-50 text-brand-700',
  slate:  'bg-slate-100 text-slate-600',
}

export function getBadgeConfig(
  tier: Tier | null,
  role: string | null,
  platformRole: string | null
): { label: string; colorClasses: string } | null {
  // Platform role takes precedence
  if (platformRole && platformRole in SIDEBAR_BADGES) {
    const badge = SIDEBAR_BADGES[platformRole as BadgeKey]
    return { label: badge.label, colorClasses: BADGE_COLOR_CLASSES[badge.color] }
  }

  if (!tier) return null

  // Solo has no role distinction
  if (tier === 'solo') {
    const badge = SIDEBAR_BADGES.solo
    return { label: badge.label, colorClasses: BADGE_COLOR_CLASSES[badge.color] }
  }

  // Shop/Enterprise: check role for staff vs owner
  const isStaff = role === 'staff'
  const key = `${tier}${isStaff ? '_staff' : ''}` as BadgeKey
  if (key in SIDEBAR_BADGES) {
    const badge = SIDEBAR_BADGES[key]
    return { label: badge.label, colorClasses: BADGE_COLOR_CLASSES[badge.color] }
  }

  return null
}

export function getDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed) return ''
  return trimmed.split(' ')[0]
}

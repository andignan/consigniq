// ============================================================
// ConsignIQ — Core TypeScript Types
// ============================================================

export type Tier = 'solo' | 'shop' | 'enterprise'
export type UserRole = 'owner' | 'staff'
export type PlatformRole = 'super_admin' | 'support' | 'finance'
export type ConsignorStatus = 'active' | 'expired' | 'grace' | 'closed'
export type ItemStatus = 'pending' | 'priced' | 'sold' | 'donated' | 'returned' | 'archived'
export type ItemCondition = 'new_in_box' | 'new_with_tags' | 'new_without_tags' | 'new' | 'like_new' | 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  new_in_box: 'New in Box',
  new_with_tags: 'New with Tags',
  new_without_tags: 'New without Tags',
  new: 'New',
  like_new: 'Like New',
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

export const ITEM_CATEGORIES = [
  'Clothing & Shoes',
  'Furniture',
  'Jewelry & Silver',
  'China & Crystal',
  'Collectibles & Art',
  'Electronics',
  'Books & Games',
  'Toys',
  'Tools',
  'Luxury & Designer',
  'Kitchen & Home',
  'Other',
] as const

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

export interface Account {
  id: string
  name: string
  tier: Tier
  stripe_customer_id: string | null
  status: 'active' | 'suspended' | 'cancelled'
  created_at: string
}

export interface Location {
  id: string
  account_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  default_split_store: number
  default_split_consignor: number
  agreement_days: number
  grace_days: number
  created_at: string
}

export interface User {
  id: string
  account_id: string
  location_id: string | null
  email: string
  full_name: string | null
  role: UserRole
  is_superadmin: boolean
  platform_role: PlatformRole | null
  created_at: string
}

export interface Consignor {
  id: string
  account_id: string
  location_id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  intake_date: string        // ISO date
  expiry_date: string        // ISO date
  grace_end_date: string     // ISO date
  split_store: number
  split_consignor: number
  status: ConsignorStatus
  created_at: string
  created_by: string | null
  // Joined
  item_count?: number
  pending_count?: number
}

export interface Item {
  id: string
  account_id: string
  location_id: string
  consignor_id: string
  name: string
  category: string
  condition: ItemCondition
  description: string | null
  photo_url: string | null
  price: number | null
  low_price: number | null
  high_price: number | null
  ai_reasoning: string | null
  intake_date: string
  priced_at: string | null
  sold_date: string | null
  sold_price: number | null
  donated_at: string | null
  status: ItemStatus
  current_markdown_pct: number
  effective_price: number | null
  created_at: string
  created_by: string | null
  // Joined
  consignor?: Pick<Consignor, 'id' | 'name'>
}

export interface Agreement {
  id: string
  account_id: string
  consignor_id: string
  generated_at: string
  expiry_date: string
  grace_end: string
  email_sent_at: string | null
  pdf_url: string | null
  split_store: number
  split_consignor: number
  item_count: number
}

// ============================================================
// Lifecycle helpers
// ============================================================

export interface LifecycleStatus {
  daysRemaining: number       // days until expiry (negative = past)
  daysElapsed: number         // days since intake
  isGrace: boolean
  isDonationEligible: boolean
  isExpired: boolean
  color: 'green' | 'yellow' | 'orange' | 'red' | 'gray'
  label: string
  progressPct: number         // 0-100, for progress bar
}

export function getLifecycleStatus(
  intakeDateStr: string,
  expiryDateStr: string,
  graceEndStr: string
): LifecycleStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Parse as local dates (append T00:00:00 so Date() uses local timezone, not UTC)
  const intake = new Date(intakeDateStr + 'T00:00:00')
  const expiry = new Date(expiryDateStr + 'T00:00:00')
  const graceEnd = new Date(graceEndStr + 'T00:00:00')

  const msPerDay = 1000 * 60 * 60 * 24
  const daysElapsed = Math.floor((today.getTime() - intake.getTime()) / msPerDay)
  const daysRemaining = Math.floor((expiry.getTime() - today.getTime()) / msPerDay)
  const totalDays = Math.floor((expiry.getTime() - intake.getTime()) / msPerDay)

  const isExpired = today > expiry
  const isGrace = today > expiry && today <= graceEnd
  const isDonationEligible = today > graceEnd

  let color: LifecycleStatus['color']
  let label: string

  if (isDonationEligible) {
    color = 'gray'
    label = 'Donation Eligible'
  } else if (isGrace) {
    const graceDay = Math.floor((today.getTime() - expiry.getTime()) / msPerDay)
    color = 'red'
    label = `Grace Day ${graceDay}`
  } else if (isExpired) {
    color = 'red'
    label = 'Expired'
  } else if (daysRemaining <= 7) {
    color = 'orange'
    label = `${daysRemaining}d left`
  } else if (daysRemaining <= 14) {
    color = 'yellow'
    label = `${daysRemaining}d left`
  } else {
    color = 'green'
    label = `${daysRemaining}d left`
  }

  const progressPct = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100))

  return {
    daysRemaining,
    daysElapsed,
    isGrace,
    isDonationEligible,
    isExpired,
    color,
    label,
    progressPct,
  }
}

export const COLOR_CLASSES = {
  green: {
    badge: 'bg-brand-50 text-brand-800',
    bar: 'bg-brand-500',
    dot: 'bg-brand-500',
    ring: 'ring-brand-200',
  },
  yellow: {
    badge: 'bg-yellow-100 text-yellow-800',
    bar: 'bg-yellow-400',
    dot: 'bg-yellow-400',
    ring: 'ring-yellow-200',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-800',
    bar: 'bg-orange-500',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200',
  },
  red: {
    badge: 'bg-red-100 text-red-800',
    bar: 'bg-red-500',
    dot: 'bg-red-500',
    ring: 'ring-red-200',
  },
  gray: {
    badge: 'bg-gray-100 text-gray-600',
    bar: 'bg-gray-400',
    dot: 'bg-gray-400',
    ring: 'ring-gray-200',
  },
}

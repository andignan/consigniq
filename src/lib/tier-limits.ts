export type Tier = 'solo' | 'shop' | 'enterprise'

export type AccountType = 'paid' | 'trial' | 'complimentary' | 'cancelled_grace' | 'cancelled_limited'

export type Feature =
  | 'ai_pricing'
  | 'price_lookup'
  | 'save_to_inventory'
  | 'csv_export'
  | 'photo_identification'
  | 'consignor_mgmt'
  | 'lifecycle'
  | 'payouts'
  | 'agreements'
  | 'multi_location'
  | 'staff_management'
  | 'reports'
  | 'repeat_item_history'
  | 'markdown_schedule'
  | 'email_notifications'
  | 'cross_customer_pricing'
  | 'community_pricing_feed'
  | 'multi_location_all'
  | 'api_access'

export interface TierConfig {
  label: string
  price: number // monthly price in USD
  aiPricingLimit: number | null // null = unlimited
  features: Feature[]
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  solo: {
    label: 'Solo Pricer',
    price: 9,
    aiPricingLimit: 200,
    features: [
      'ai_pricing',
      'price_lookup',
      'save_to_inventory',
      'csv_export',
      'photo_identification',
    ],
  },
  shop: {
    label: 'Shop',
    price: 79,
    aiPricingLimit: null,
    features: [
      'ai_pricing',
      'price_lookup',
      'save_to_inventory',
      'csv_export',
      'photo_identification',
      'consignor_mgmt',
      'lifecycle',
      'payouts',
      'agreements',
      'multi_location',
      'staff_management',
      'reports',
      'repeat_item_history',
      'markdown_schedule',
      'email_notifications',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    price: 129,
    aiPricingLimit: null,
    features: [
      'ai_pricing',
      'price_lookup',
      'save_to_inventory',
      'csv_export',
      'photo_identification',
      'consignor_mgmt',
      'lifecycle',
      'payouts',
      'agreements',
      'multi_location',
      'staff_management',
      'reports',
      'repeat_item_history',
      'markdown_schedule',
      'email_notifications',
      'cross_customer_pricing',
      'community_pricing_feed',
      'multi_location_all',
      'api_access',
    ],
  },
}

export const FEATURE_LABELS: Record<Feature, string> = {
  ai_pricing: 'AI Pricing Lookups',
  price_lookup: 'Price Lookup',
  save_to_inventory: 'Save to Inventory',
  csv_export: 'CSV Export',
  photo_identification: 'Photo Identification',
  consignor_mgmt: 'Consignor Management',
  lifecycle: 'Consignor Lifecycle',
  payouts: 'Payouts',
  agreements: 'Agreements',
  multi_location: 'Multi-Location',
  staff_management: 'Staff Management',
  reports: 'Reports & Analytics',
  repeat_item_history: 'Repeat Item History',
  markdown_schedule: 'Markdown Schedules',
  email_notifications: 'Email Notifications',
  cross_customer_pricing: 'Cross-Customer Pricing Intelligence',
  community_pricing_feed: 'Community Pricing Feed',
  multi_location_all: 'All Locations Dashboard',
  api_access: 'API Access',
}

export const FEATURE_REQUIRED_TIER: Record<Feature, Tier> = {
  ai_pricing: 'solo',
  price_lookup: 'solo',
  save_to_inventory: 'solo',
  csv_export: 'solo',
  photo_identification: 'solo',
  consignor_mgmt: 'shop',
  lifecycle: 'shop',
  payouts: 'shop',
  agreements: 'shop',
  multi_location: 'shop',
  staff_management: 'shop',
  reports: 'shop',
  repeat_item_history: 'shop',
  markdown_schedule: 'shop',
  email_notifications: 'shop',
  cross_customer_pricing: 'enterprise',
  community_pricing_feed: 'enterprise',
  multi_location_all: 'enterprise',
  api_access: 'enterprise',
}

// Stripe price ID placeholders
export const STRIPE_PRICE_IDS = {
  solo: process.env.STRIPE_SOLO_PRICE_ID,
  shop: process.env.STRIPE_SHOP_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  topup_50: process.env.STRIPE_TOPUP_50_PRICE_ID,
}

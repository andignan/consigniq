export type Tier = 'starter' | 'standard' | 'pro'

export type Feature =
  | 'ai_pricing'
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
  starter: {
    label: 'Starter',
    price: 0,
    aiPricingLimit: 50,
    features: [
      'ai_pricing',
    ],
  },
  standard: {
    label: 'Standard',
    price: 79,
    aiPricingLimit: null,
    features: [
      'ai_pricing',
      'repeat_item_history',
      'markdown_schedule',
      'email_notifications',
    ],
  },
  pro: {
    label: 'Pro',
    price: 129,
    aiPricingLimit: null,
    features: [
      'ai_pricing',
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
  repeat_item_history: 'Repeat Item History',
  markdown_schedule: 'Markdown Schedules',
  email_notifications: 'Email Notifications',
  cross_customer_pricing: 'Cross-Customer Pricing Intelligence',
  community_pricing_feed: 'Community Pricing Feed',
  multi_location_all: 'All Locations Dashboard',
  api_access: 'API Access',
}

export const FEATURE_REQUIRED_TIER: Record<Feature, Tier> = {
  ai_pricing: 'starter',
  repeat_item_history: 'standard',
  markdown_schedule: 'standard',
  email_notifications: 'standard',
  cross_customer_pricing: 'pro',
  community_pricing_feed: 'pro',
  multi_location_all: 'pro',
  api_access: 'pro',
}

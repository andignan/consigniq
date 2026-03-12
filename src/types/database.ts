// src/types/database.ts
// Type definitions mirroring the Supabase schema
// Tip: You can also auto-generate these with: npx supabase gen types typescript

export type Tier = 'starter' | 'standard' | 'pro'
export type AccountStatus = 'active' | 'suspended' | 'cancelled'
export type UserRole = 'owner' | 'staff'
export type ItemCondition = 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'
export type ItemStatus = 'pending' | 'priced' | 'sold' | 'donated' | 'returned'
export type ConsignorStatus = 'active' | 'expired' | 'grace' | 'closed'
export type MarkdownTrigger = 'schedule' | 'manual'

// ─── Row types (what comes back from Supabase queries) ────────

export interface Account {
  id: string
  name: string
  tier: Tier
  stripe_customer_id: string | null
  status: AccountStatus
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
  markdown_enabled: boolean
  created_at: string
}

export interface User {
  id: string
  account_id: string
  location_id: string | null
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Consignor {
  id: string
  account_id: string
  location_id: string
  name: string
  phone: string | null
  email: string | null
  intake_date: string
  expiry_date: string
  grace_end_date: string
  split_store: number
  split_consignor: number
  notes: string | null
  status: ConsignorStatus
  created_at: string
  created_by: string | null
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
  status: ItemStatus
  intake_date: string
  priced_at: string | null
  sold_date: string | null
  sold_price: number | null
  donated_at: string | null
  current_markdown_pct: number
  effective_price: number | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface PriceHistory {
  id: string
  account_id: string
  location_id: string
  item_id: string | null
  category: string
  name: string
  description: string | null
  condition: string | null
  priced_at: number
  sold_at: number | null
  days_to_sell: number | null
  sold: boolean
  created_at: string
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
}

export interface Markdown {
  id: string
  account_id: string
  item_id: string
  original_price: number
  markdown_pct: number
  new_price: number
  applied_at: string
  triggered_by: MarkdownTrigger
}

export interface Invitation {
  id: string
  account_id: string
  email: string
  role: string
  token: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

// ─── Database type for Supabase client generics ───────────────

export interface Database {
  public: {
    Tables: {
      accounts: { Row: Account; Insert: Partial<Account>; Update: Partial<Account> }
      locations: { Row: Location; Insert: Partial<Location>; Update: Partial<Location> }
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      consignors: { Row: Consignor; Insert: Partial<Consignor>; Update: Partial<Consignor> }
      items: { Row: Item; Insert: Partial<Item>; Update: Partial<Item> }
      price_history: { Row: PriceHistory; Insert: Partial<PriceHistory>; Update: Partial<PriceHistory> }
      agreements: { Row: Agreement; Insert: Partial<Agreement>; Update: Partial<Agreement> }
      markdowns: { Row: Markdown; Insert: Partial<Markdown>; Update: Partial<Markdown> }
      invitations: { Row: Invitation; Insert: Partial<Invitation>; Update: Partial<Invitation> }
    }
  }
}

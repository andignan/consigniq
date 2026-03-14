'use client'

import { createContext, useContext } from 'react'

export interface UserProfile {
  id: string
  account_id: string
  location_id: string | null
  email: string
  full_name: string | null
  role: 'owner' | 'staff'
  accounts?: {
    id: string
    name: string
    tier: string
    ai_lookups_this_month?: number
    ai_lookups_reset_at?: string
    account_type?: string
    trial_ends_at?: string | null
    is_complimentary?: boolean
    complimentary_tier?: string | null
    bonus_lookups?: number
    bonus_lookups_used?: number
    status?: string
  }
  locations?: { id: string; name: string }
}

const UserContext = createContext<UserProfile | null>(null)

export function UserProvider({
  user,
  children,
}: {
  user: UserProfile | null
  children: React.ReactNode
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}

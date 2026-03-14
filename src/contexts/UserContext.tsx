'use client'

import { createContext, useContext } from 'react'

export interface UserProfile {
  id: string
  account_id: string
  location_id: string | null
  email: string
  full_name: string | null
  role: 'owner' | 'staff'
  accounts?: { id: string; name: string }
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

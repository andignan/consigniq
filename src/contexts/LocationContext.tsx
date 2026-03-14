'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface LocationInfo {
  id: string
  name: string
}

interface LocationContextValue {
  activeLocationId: string | null
  activeLocationName: string
  locations: LocationInfo[]
  isAllLocations: boolean
  canSwitchLocations: boolean
  setActiveLocation: (locationId: string) => void
}

const LocationContext = createContext<LocationContextValue>({
  activeLocationId: null,
  activeLocationName: '',
  locations: [],
  isAllLocations: false,
  canSwitchLocations: false,
  setActiveLocation: () => {},
})

const STORAGE_KEY = 'consigniq_active_location'

export function LocationProvider({
  userLocationId,
  userRole,
  locations,
  children,
}: {
  userLocationId: string | null
  userRole: 'owner' | 'staff'
  locations: LocationInfo[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const canSwitch = userRole === 'owner' && locations.length > 1

  const [activeLocationId, setActiveLocationId] = useState<string | null>(() => {
    if (userRole === 'staff') return userLocationId
    // Owner: check localStorage, then URL, then default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'all') return 'all'
      if (stored && locations.some(l => l.id === stored)) return stored
    }
    return userLocationId
  })

  // Sync from URL on mount (URL takes precedence for server component pages)
  useEffect(() => {
    if (userRole === 'staff') return
    const urlLocationId = searchParams.get('location_id')
    if (urlLocationId && (urlLocationId === 'all' || locations.some(l => l.id === urlLocationId))) {
      setActiveLocationId(urlLocationId)
      localStorage.setItem(STORAGE_KEY, urlLocationId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveLocation = useCallback((locationId: string) => {
    if (userRole === 'staff') return
    setActiveLocationId(locationId)
    localStorage.setItem(STORAGE_KEY, locationId)

    // Update URL for server component pages
    const params = new URLSearchParams(searchParams.toString())
    if (locationId === 'all') {
      params.delete('location_id')
    } else {
      params.set('location_id', locationId)
    }
    const qs = params.toString()
    router.push(pathname + (qs ? '?' + qs : ''))
  }, [userRole, searchParams, pathname, router])

  const isAll = activeLocationId === 'all'
  const activeName = isAll
    ? 'All Locations'
    : locations.find(l => l.id === activeLocationId)?.name ?? ''

  return (
    <LocationContext.Provider value={{
      activeLocationId: isAll ? null : activeLocationId,
      activeLocationName: activeName,
      locations,
      isAllLocations: isAll,
      canSwitchLocations: canSwitch,
      setActiveLocation,
    }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  return useContext(LocationContext)
}

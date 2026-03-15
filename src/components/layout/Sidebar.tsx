'use client'
// src/components/layout/Sidebar.tsx
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocation } from '@/contexts/LocationContext'
import { useUser } from '@/contexts/UserContext'
import type { User } from '@/types/database'
import type { Tier } from '@/lib/tier-limits'

// Icons as inline SVGs (same as before)
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)
const ConsignorsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const InventoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)
const PriceLookupIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
)
const ReportsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const PayoutsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const FULL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Consignors', href: '/dashboard/consignors', icon: <ConsignorsIcon /> },
  { label: 'Inventory', href: '/dashboard/inventory', icon: <InventoryIcon /> },
  { label: 'Price Lookup', href: '/dashboard/pricing', icon: <PriceLookupIcon /> },
  { label: 'Reports', href: '/dashboard/reports', icon: <ReportsIcon /> },
  { label: 'Payouts', href: '/dashboard/payouts', icon: <PayoutsIcon /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon /> },
]

const SOLO_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Price Lookup', href: '/dashboard/pricing', icon: <PriceLookupIcon /> },
  { label: 'My Inventory', href: '/dashboard/inventory', icon: <InventoryIcon /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon /> },
]

interface SidebarProps {
  user: (User & { accounts?: { name: string; tier?: string }; locations?: { name: string } }) | null
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [expiringCount, setExpiringCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    activeLocationId,
    activeLocationName,
    locations,
    isAllLocations,
    canSwitchLocations,
    setActiveLocation,
  } = useLocation()

  const contextUser = useUser()
  const accountTier = (contextUser?.accounts?.tier ?? user?.accounts?.tier ?? 'starter') as Tier
  const isSolo = accountTier === 'solo'
  const navItems = isSolo ? SOLO_NAV_ITEMS : FULL_NAV_ITEMS

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, searchParams])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch expiring consignor count (expiring within 7 days or in grace) — skip for solo
  useEffect(() => {
    if (isSolo) return
    async function fetchExpiringCount() {
      if (!contextUser?.account_id) return
      if (!activeLocationId && !isAllLocations) return
      const locId = activeLocationId || (locations.length > 0 ? locations[0].id : null)
      if (!locId && !isAllLocations) return

      try {
        const fetchLocations = isAllLocations ? locations.map(l => l.id) : [locId!]
        let total = 0
        for (const lid of fetchLocations) {
          const res = await fetch(`/api/consignors?location_id=${lid}`, { credentials: 'include' })
          if (!res.ok) continue
          const data = await res.json()
          const consignors = data.consignors || []
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
          total += consignors.filter((c: { status: string; expiry_date: string; grace_end_date: string }) => {
            if (c.status === 'closed') return false
            const expiry = new Date(c.expiry_date + 'T00:00:00')
            const graceEnd = new Date(c.grace_end_date + 'T00:00:00')
            const isExpiringSoon = expiry.getTime() - now.getTime() <= sevenDaysMs && expiry.getTime() >= now.getTime()
            const isInGrace = now > expiry && now <= graceEnd
            return isExpiringSoon || isInGrace
          }).length
        }
        setExpiringCount(total)
      } catch {
        // Silently fail — badge is informational
      }
    }
    fetchExpiringCount()
  }, [contextUser?.account_id, activeLocationId, isAllLocations, locations, isSolo])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function handleLocationSwitch(locationId: string) {
    setActiveLocation(locationId)
    setLocationDropdownOpen(false)
  }

  const locationSwitcher = !isSolo ? (
    <div className="px-5 py-3 border-b border-stone-800" ref={dropdownRef}>
      {canSwitchLocations ? (
        <div className="relative">
          <button
            onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-white font-medium truncate">
                {activeLocationName || 'Select Location'}
              </span>
            </div>
            <svg className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {locationDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-stone-800 rounded-lg shadow-lg border border-stone-700 overflow-hidden z-50">
              <button
                onClick={() => handleLocationSwitch('all')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  isAllLocations
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-stone-300 hover:bg-stone-700 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                All Locations
                {isAllLocations && (
                  <svg className="w-4 h-4 ml-auto text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="border-t border-stone-700" />
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => handleLocationSwitch(loc.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                    !isAllLocations && activeLocationName === loc.name
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-stone-300 hover:bg-stone-700 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{loc.name}</span>
                  {!isAllLocations && activeLocationName === loc.name && (
                    <svg className="w-4 h-4 ml-auto text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2">
          <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-stone-400 truncate">
            {activeLocationName || 'No location assigned'}
          </span>
        </div>
      )}
    </div>
  ) : null

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-stone-800">
        <h1 className="text-white font-bold text-lg tracking-tight">ConsignIQ</h1>
        {isSolo && (
          <p className="text-stone-500 text-xs mt-0.5">Solo Pricer</p>
        )}
      </div>

      {/* Location Switcher (hidden for solo) */}
      {locationSwitcher}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const hasQuery = item.href.includes('?')
          const active = hasQuery
            ? fullPath === item.href
            : pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-500 text-white'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              {item.icon}
              {item.label}
              {item.label === 'Consignors' && expiringCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {expiringCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Solo upgrade CTA */}
      {isSolo && (
        <div className="px-3 pb-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/billing/checkout', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tier: 'starter' }),
                })
                const data = await res.json()
                if (data.url) window.location.href = data.url
              } catch {
                // Fall back to settings page
                router.push('/dashboard/settings?tab=billing')
              }
            }}
            className="w-full block px-3 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 transition-colors text-center"
          >
            Upgrade to Starter — full shop management. $49/month
          </button>
        </div>
      )}

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-stone-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-stone-300 text-sm font-medium truncate">
            {user?.full_name?.trim() || user?.email || 'Unknown'}
          </p>
          <p className="text-stone-500 text-xs capitalize">{isSolo ? 'Solo Pricer' : user?.role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile: header bar + overlay (hidden on md+) */}
      <div className="block md:hidden">
        {/* Fixed header bar with hamburger */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white p-1"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg tracking-tight">ConsignIQ</h1>
          {!isSolo && activeLocationName && (
            <span className="text-stone-400 text-xs truncate ml-auto">{activeLocationName}</span>
          )}
        </div>

        {/* Sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            {/* Sidebar panel */}
            <aside className="relative w-60 bg-stone-900 flex flex-col h-full">
              {sidebarContent}
            </aside>
          </div>
        )}
      </div>

      {/* Desktop: always-visible sidebar (hidden below md) */}
      <aside className="hidden md:flex w-60 bg-stone-900 flex-col h-full shrink-0">
        {sidebarContent}
      </aside>
    </>
  )
}

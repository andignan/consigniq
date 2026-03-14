'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { LayoutDashboard, Building2, ArrowLeft, Menu, X, Shield } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/accounts', label: 'Accounts', icon: Building2 },
]

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const navContent = (
    <>
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-red-500" />
          <h1 className="text-lg font-bold text-gray-900">Admin</h1>
        </div>
        <p className="text-xs text-gray-400 truncate">{email}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-red-50 text-red-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4.5 h-4.5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
          Back to App
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 flex-col bg-white border-r border-gray-100 h-screen shrink-0">
        {navContent}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center px-4 z-40 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="font-semibold text-gray-900 text-sm">Admin</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-white flex flex-col shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { LayoutDashboard, Building2, LogOut, Menu, X, Users as Users2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users2 },
  { href: '/admin/accounts', label: 'Accounts', icon: Building2 },
]

export default function AdminSidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const navContent = (
    <>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Logo size="sm" />
          <span className="text-xs font-semibold text-white/50 bg-white/10 px-1.5 py-0.5 rounded">Admin</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive(href)
                ? 'border-l-2 border-brand-500 text-brand-400 bg-white/5'
                : 'text-white/65 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-4.5 h-4.5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <p className="text-white text-sm font-medium truncate">{name}</p>
          <p className="text-stone-400 text-xs truncate">{email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 flex-col bg-navy-900 h-screen shrink-0">
        {navContent}
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-navy-900 flex items-center px-4 z-40 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5">
          <Menu className="w-5 h-5 text-white/65" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Logo size="sm" />
          <span className="text-xs font-semibold text-white/50 bg-white/10 px-1.5 py-0.5 rounded">Admin</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-navy-900 flex flex-col shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1"
            >
              <X className="w-5 h-5 text-white/40" />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}

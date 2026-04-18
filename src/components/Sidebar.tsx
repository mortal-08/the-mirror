'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { ThemeSelector } from './ThemeProvider'
import {
  LayoutDashboard,
  Timer,
  History,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/timer', label: 'Timer', icon: Timer },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!session) return null

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <span className="sidebar-logo">The Mirror</span>
        <button className="btn-icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">The Mirror</div>
        <div className="sidebar-tagline">See where your time goes</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: '0.75rem' }}>
            <div className="text-xs text-secondary" style={{ marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Theme
            </div>
            <ThemeSelector />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {session.user?.name}
              </div>
              <div className="text-xs text-secondary">
                {session.user?.email}
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

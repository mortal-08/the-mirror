'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'
import {
  LayoutDashboard,
  Timer,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  Moon,
  Sun,
  Orbit
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/timer', label: 'Timer', icon: Timer },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
    tick()
    const i = setInterval(tick, 30000)
    return () => clearInterval(i)
  }, [])

  if (!session) return null

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header" style={{ display: 'none' }}>
        <span className="sidebar-logo" style={{ fontSize: '1.2rem', marginBottom: 0 }}>The Mirror</span>
        <button className="btn-icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} style={{ transform: mobileOpen ? 'translateX(0)' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.25rem' }}>
          <Orbit size={22} color="var(--accent-primary)" />
          <span className="sidebar-logo">The Mirror</span>
        </div>
        <div className="sidebar-tagline">Time Intelligence Engine</div>

        <nav className="sidebar-nav" style={{ marginTop: '1.5rem' }}>
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
                <span style={{ fontSize: '0.9rem', letterSpacing: '0.03em' }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Mini clock + theme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>{clock}</span>
            <button
              className="btn-icon"
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              style={{ width: 36, height: 36 }}
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          {/* User card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {session.user?.name}
              </div>
              <div className="text-secondary" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block' }} />
                Online
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              style={{ width: 36, height: 36, color: '#ff5577' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

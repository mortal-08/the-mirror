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
  Target
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Overview Terminal', icon: LayoutDashboard },
  { href: '/timer', label: 'Time Node', icon: Timer },
  { href: '/history', label: 'Data Logs', icon: History },
  { href: '/settings', label: 'System Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!session) return null

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(143, 0, 255, 0.2)', background: 'rgba(5, 2, 10, 0.9)' }}>
        <span className="sidebar-logo" style={{ fontSize: '1.2rem', marginBottom: 0 }}>The Mirror</span>
        <button className="btn-icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} style={{ transform: mobileOpen && window.innerWidth <= 900 ? 'translateX(0)' : undefined }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={24} color="var(--accent-secondary)" />
          The Mirror
        </div>
        <div className="sidebar-tagline">Quantum Sync Active</div>

        <nav className="sidebar-nav" style={{ marginTop: '2rem' }}>
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
                <span style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(143, 0, 255, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {session.user?.name}
              </div>
              <div className="text-secondary" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-secondary)', display: 'inline-block', boxShadow: '0 0 5px var(--accent-secondary)' }} />
                Node Connected
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Disconnect Node"
              style={{ background: 'rgba(255, 0, 85, 0.1)', color: '#ff0055', borderColor: 'rgba(255,0,85,0.2)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

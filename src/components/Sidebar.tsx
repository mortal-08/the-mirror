'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, createContext, useContext } from 'react'
import { useTheme } from './ThemeProvider'
import {
  LayoutDashboard, Timer, History, Settings, LogOut,
  BookOpen, Moon, Sun, Orbit, PanelLeftClose, PanelLeft, BarChart3,
  CalendarDays
} from 'lucide-react'

const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: false, setCollapsed: () => {} })
export const useSidebar = () => useContext(SidebarContext)
export { SidebarContext }

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/timer', label: 'Timer', icon: Timer },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/history', label: 'History', icon: History },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/routine', label: 'Routine', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'
  const [clock, setClock] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
    tick()
    const i = setInterval(tick, 30000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('mirror_sidebar_collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])
  useEffect(() => {
    localStorage.setItem('mirror_sidebar_collapsed', String(collapsed))
  }, [collapsed])

  if (!session) return null

  // On mobile, always show full sidebar (never collapsed)
  const isCollapsed = isMobile ? false : collapsed
  const sidebarWidth = isCollapsed ? '72px' : '260px'

  const closeMobile = () => {
    document.querySelector('.sidebar')?.classList.remove('open')
  }

  return (
    <SidebarContext.Provider value={{ collapsed: isCollapsed, setCollapsed }}>
      <aside
        className="sidebar"
        style={{
          width: sidebarWidth,
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease',
          padding: isCollapsed ? '1.5rem 0.75rem' : '1.5rem 1.25rem',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.25rem', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <Image src="/icon-512.svg" alt="The Mirror" width={24} height={24} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span className="sidebar-logo" style={{ fontSize: '1.5rem', marginBottom: 0 }}>The Mirror</span>}
        </div>
        {!isCollapsed && <div className="sidebar-tagline" style={{ marginBottom: '1.5rem' }}>Time Intelligence</div>}

        {/* Collapse toggle - hidden on mobile */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '0.6rem', borderRadius: '10px', marginBottom: '0.75rem',
              background: 'var(--surface)', border: '1px solid var(--surface-border)',
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
              gap: '0.5rem', fontSize: '0.8rem'
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft size={18} /> : <><PanelLeftClose size={18} /> <span>Collapse</span></>}
          </button>
        )}

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, marginTop: '0.5rem' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
                title={isCollapsed ? item.label : undefined}
                style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.85rem' : '0.85rem 1rem' }}
              >
                <Icon size={20} />
                {!isCollapsed && <span style={{ fontSize: '0.9rem', letterSpacing: '0.02em' }}>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: '0.6rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--surface-border)'
          }}>
            {!isCollapsed && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>{clock}</span>
            )}
            <button className="btn-icon" onClick={() => setTheme(isLight ? 'dark' : 'light')} style={{ width: 32, height: 32 }}>
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between',
            background: 'var(--surface)', padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--surface-border)'
          }}>
            {!isCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{session.user?.name}</div>
                <div className="text-secondary" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block' }} />
                  Online
                </div>
              </div>
            )}
            <button className="btn-icon" onClick={() => signOut({ callbackUrl: '/login' })} title="Sign out" style={{ width: 32, height: 32, color: '#ff5577' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </SidebarContext.Provider>
  )
}

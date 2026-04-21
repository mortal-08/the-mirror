'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useSidebar } from '@/components/Sidebar'
import ReminderScheduler from '@/components/ReminderScheduler'
import { Menu, X } from 'lucide-react'

const NotificationPermissionNudge = dynamic(() => import('@/components/NotificationPermissionNudge'), {
  ssr: false,
})

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close sidebar when route changes (fixes the X staying after nav)
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar')
    if (sidebar) sidebar.classList.remove('open')
    setSidebarOpen(false)
  }, [pathname])

  const toggleSidebar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return
    const willOpen = !sidebar.classList.contains('open')
    if (willOpen) {
      sidebar.classList.add('open')
    } else {
      sidebar.classList.remove('open')
    }
    setSidebarOpen(willOpen)
  }

  const closeSidebar = () => {
    document.querySelector('.sidebar')?.classList.remove('open')
    setSidebarOpen(false)
  }

  return (
    <main
      className="main-content"
      style={{
        marginLeft: isMobile ? 0 : (collapsed ? '72px' : '260px'),
        transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: isMobile ? '1rem' : '1.5rem',
      }}
    >
      <ReminderScheduler />
      <NotificationPermissionNudge />

      {/* Hamburger - only on mobile */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          style={{
            display: 'flex',
            width: 40, height: 40, borderRadius: '10px',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)', cursor: 'pointer',
            marginBottom: '0.75rem', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, touchAction: 'manipulation' }}
        />
      )}

      {/* Main Page Content */}
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>

        <footer
          style={{
            marginTop: '4rem',
            paddingBottom: '1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.05em',
          }}
        >
          Mirror &copy; 2026 | Harshit
        </footer>
      </div>
    </main>
  )
}

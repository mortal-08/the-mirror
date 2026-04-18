'use client'

import { useState, useEffect } from 'react'
import { useSidebar } from '@/components/Sidebar'
import { Menu, X } from 'lucide-react'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Sync state with DOM when sidebar class changes externally (e.g. nav link click)
  useEffect(() => {
    if (!isMobile) return
    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return
    const observer = new MutationObserver(() => {
      const isOpen = sidebar.classList.contains('open')
      setMobileOpen(isOpen)
    })
    observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [isMobile])

  const toggleMobile = (e: React.MouseEvent) => {
    e.stopPropagation()
    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return
    const isOpen = sidebar.classList.contains('open')
    if (isOpen) {
      sidebar.classList.remove('open')
      setMobileOpen(false)
    } else {
      sidebar.classList.add('open')
      setMobileOpen(true)
    }
  }

  const closeMobile = () => {
    document.querySelector('.sidebar')?.classList.remove('open')
    setMobileOpen(false)
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
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          className="mobile-hamburger"
          onClick={toggleMobile}
          aria-label="Toggle menu"
          style={{
            display: 'flex',
            width: 40, height: 40, borderRadius: '10px',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)', cursor: 'pointer',
            marginBottom: '0.75rem', touchAction: 'manipulation',
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={closeMobile} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, touchAction: 'manipulation' }} />
      )}

      {children}
    </main>
  )
}

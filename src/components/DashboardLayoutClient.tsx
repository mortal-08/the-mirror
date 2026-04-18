'use client'

import { useState } from 'react'
import { useSidebar } from '@/components/Sidebar'
import { Menu, X } from 'lucide-react'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // Toggle sidebar open class on the sidebar element
  const toggleMobile = () => {
    setMobileOpen(!mobileOpen)
    const sidebar = document.querySelector('.sidebar')
    if (sidebar) {
      sidebar.classList.toggle('open')
    }
  }

  return (
    <main 
      className="main-content" 
      style={{ 
        marginLeft: collapsed ? '72px' : '260px',
        transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: '1.5rem',
      }}
    >
      {/* Mobile hamburger - flows in content, not fixed */}
      <button
        className="mobile-hamburger"
        onClick={toggleMobile}
        aria-label="Toggle menu"
        style={{
          width: 40, height: 40, borderRadius: '10px',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', border: '1px solid var(--surface-border)',
          color: 'var(--text-primary)', cursor: 'pointer',
        }}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay to close sidebar */}
      {mobileOpen && (
        <div onClick={toggleMobile} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 150 }} />
      )}

      {children}
    </main>
  )
}

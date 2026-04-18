'use client'

import { useSidebar } from '@/components/Sidebar'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  
  return (
    <main 
      className="main-content page-shell" 
      style={{ 
        marginLeft: collapsed ? '72px' : '260px',
        transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div className="main-content-inner">
        {children}
      </div>
    </main>
  )
}

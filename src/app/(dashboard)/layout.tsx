import Sidebar from '@/components/Sidebar'
import DashboardLayoutClient from '@/components/DashboardLayoutClient'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="app-layout dashboard-shell">
      <Sidebar />
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </div>
  )
}

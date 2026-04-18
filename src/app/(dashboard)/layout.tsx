import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="app-layout dashboard-shell">
      <Sidebar />
      <main className="main-content page-shell">
        <div className="main-ambient main-ambient-1" aria-hidden="true" />
        <div className="main-ambient main-ambient-2" aria-hidden="true" />
        <div className="main-content-inner">
          {children}
        </div>
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getTimeEntries, getDashboardStats } from '@/actions/timeEntries'
import { getTags } from '@/actions/tags'
import DashboardView from '@/components/DashboardView'
import EntryList from '@/components/EntryList'
import ManualEntryForm from '@/components/ManualEntryForm'

export default async function DashboardPage() {
  const userId = await getUserId()
  if (!userId) redirect('/landing')

  const [categories, entries, stats, tags] = await Promise.all([
    getCategories(),
    getTimeEntries(),
    getDashboardStats(),
    getTags(),
  ])

  const recentEntries = entries.slice(0, 10)

  return (
    <div className="motion-stack">
      <div className="page-header reveal-up" style={{ '--reveal-delay': '60ms' } as React.CSSProperties}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your time at a glance</p>
      </div>

      <div className="reveal-up" style={{ '--reveal-delay': '120ms' } as React.CSSProperties}>
        <DashboardView stats={stats} />
      </div>

      <div className="mt-xl reveal-up" style={{ '--reveal-delay': '180ms' } as React.CSSProperties}>
        <ManualEntryForm categories={categories} tags={tags} />
      </div>

      <div className="glass mt-xl reveal-up" style={{ '--reveal-delay': '240ms' } as React.CSSProperties}>
        <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent Activity</h3>
        <EntryList initialEntries={recentEntries} categories={categories} />
      </div>
    </div>
  )
}

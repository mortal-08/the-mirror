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
  if (!userId) redirect('/login')

  const [categories, entries, stats, tags] = await Promise.all([
    getCategories(),
    getTimeEntries(),
    getDashboardStats(),
    getTags(),
  ])

  const recentEntries = entries.slice(0, 10)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your time at a glance</p>
      </div>

      <DashboardView stats={stats} />

      <div className="mt-xl">
        <ManualEntryForm categories={categories} tags={tags} />
      </div>

      <div className="glass mt-xl">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent Activity</h3>
        <EntryList initialEntries={recentEntries} categories={categories} />
      </div>
    </div>
  )
}

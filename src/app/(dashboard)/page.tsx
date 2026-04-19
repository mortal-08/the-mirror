import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getTimeEntries, getDashboardStats } from '@/actions/timeEntries'
import { getJournalByDate } from '@/actions/journal'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const userId = await getUserId()
  if (!userId) redirect('/landing')

  const today = new Date().toISOString().split('T')[0]

  const [categories, entries, stats, todayJournal] = await Promise.all([
    getCategories(),
    getTimeEntries(),
    getDashboardStats(),
    getJournalByDate(today),
  ])

  const recentEntries = entries.slice(0, 8)

  return (
    <DashboardClient
      stats={stats}
      categories={categories}
      recentEntries={recentEntries}
      todayJournal={todayJournal}
    />
  )
}

import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getTimeEntries, getDashboardStats } from '@/actions/timeEntries'
import { getTags } from '@/actions/tags'
import { getJournalByDate } from '@/actions/journal'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const userId = await getUserId()
  if (!userId) redirect('/landing')

  const today = new Date().toISOString().split('T')[0]

  const [categories, entries, stats, tags, todayJournal] = await Promise.all([
    getCategories(),
    getTimeEntries(),
    getDashboardStats(),
    getTags(),
    getJournalByDate(today),
  ])

  const recentEntries = entries.slice(0, 8)

  return (
    <DashboardClient
      stats={stats}
      categories={categories}
      tags={tags}
      recentEntries={recentEntries}
      todayJournal={todayJournal}
    />
  )
}

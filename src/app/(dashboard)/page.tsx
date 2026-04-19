import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getTimeEntries, getDashboardStats } from '@/actions/timeEntries'
import { getJournalByDate } from '@/actions/journal'
import { getRoutineBlocks } from '@/actions/routines'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const userId = await getUserId()
  if (!userId) redirect('/landing')

  const today = new Date().toISOString().split('T')[0]

  const [categories, entries, stats, todayJournal, routineResult] = await Promise.all([
    getCategories(),
    getTimeEntries(),
    getDashboardStats(),
    getJournalByDate(today),
    getRoutineBlocks(new Date(today + 'T00:00:00')),
  ])

  const todayBlocks = 'error' in routineResult ? [] : routineResult.data
  const recentEntries = entries.slice(0, 8)

  return (
    <DashboardClient
      stats={stats}
      categories={categories}
      recentEntries={recentEntries}
      todayJournal={todayJournal}
      todayBlocks={todayBlocks}
    />
  )
}

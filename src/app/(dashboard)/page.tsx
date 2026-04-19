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

  const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const now = new Date()
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const previousLocal = new Date(todayLocal)
  previousLocal.setDate(previousLocal.getDate() - 1)
  const nextLocal = new Date(todayLocal)
  nextLocal.setDate(nextLocal.getDate() + 1)

  const today = toDateKey(todayLocal)

  const [categories, entries, stats, todayJournal, prevRoutineResult, todayRoutineResult, nextRoutineResult] = await Promise.all([
    getCategories(),
    getTimeEntries(),
    getDashboardStats(),
    getJournalByDate(today),
    getRoutineBlocks(toDateKey(previousLocal)),
    getRoutineBlocks(today),
    getRoutineBlocks(toDateKey(nextLocal)),
  ])

  const routineCandidates = [prevRoutineResult, todayRoutineResult, nextRoutineResult]
  const todayBlocks = routineCandidates.flatMap((result) => ('error' in result ? [] : result.data))
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

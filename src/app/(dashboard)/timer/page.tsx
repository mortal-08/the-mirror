import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getRoutineBlocks } from '@/actions/routines'
import { getTimeEntries } from '@/actions/timeEntries'
import LiveTimer from '@/components/LiveTimer'

export default async function TimerPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const now = new Date()
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const previousLocal = new Date(todayLocal)
  previousLocal.setDate(previousLocal.getDate() - 1)
  const nextLocal = new Date(todayLocal)
  nextLocal.setDate(nextLocal.getDate() + 1)

  const [categories, prevRoutineResult, todayRoutineResult, nextRoutineResult, entries] = await Promise.all([
    getCategories(),
    getRoutineBlocks(toDateKey(previousLocal)),
    getRoutineBlocks(toDateKey(todayLocal)),
    getRoutineBlocks(toDateKey(nextLocal)),
    getTimeEntries(200),
  ])

  const routineCandidates = [prevRoutineResult, todayRoutineResult, nextRoutineResult]
  const todayBlocks = routineCandidates.flatMap((result) => ('error' in result ? [] : result.data))

  return (
    <div className="motion-stack">
      <LiveTimer categories={categories} todayBlocks={todayBlocks} recentEntries={entries} />
    </div>
  )
}

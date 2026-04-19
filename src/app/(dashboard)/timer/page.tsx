import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getRoutineBlocks } from '@/actions/routines'
import { getTimeEntries } from '@/actions/timeEntries'
import LiveTimer from '@/components/LiveTimer'

export default async function TimerPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const [categories, routineResult, entries] = await Promise.all([
    getCategories(),
    getRoutineBlocks(new Date(today + 'T00:00:00')),
    getTimeEntries(200),
  ])

  const todayBlocks = 'error' in routineResult ? [] : routineResult.data

  return (
    <div className="motion-stack">
      <LiveTimer categories={categories} todayBlocks={todayBlocks} recentEntries={entries} />
    </div>
  )
}

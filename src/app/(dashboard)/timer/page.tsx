import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import LiveTimer from '@/components/LiveTimer'

export default async function TimerPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const categories = await getCategories()

  return (
    <div className="motion-stack">
      <div className="page-header reveal-up" style={{ ['--reveal-delay' as string]: '70ms' }}>
        <h1 className="page-title">Timer</h1>
        <p className="page-subtitle">Focus mode & Pomodoro</p>
      </div>

      <div className="reveal-up" style={{ ['--reveal-delay' as string]: '150ms' }}>
        <LiveTimer categories={categories} />
      </div>
    </div>
  )
}

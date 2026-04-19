import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import RoutinePlanner from '@/components/RoutinePlanner'

export default async function RoutinePage() {
  const userId = await getUserId()
  if (!userId) redirect('/landing')

  return (
    <div className="motion-stack">
      <div className="page-header reveal-up" style={{ '--reveal-delay': '70ms' } as React.CSSProperties}>
        <h1 className="page-title">Routine</h1>
        <p className="page-subtitle">Plan your days with precision</p>
      </div>

      <div className="reveal-up" style={{ '--reveal-delay': '120ms' } as React.CSSProperties}>
        <RoutinePlanner />
      </div>
    </div>
  )
}

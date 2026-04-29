import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import ReflectionSection from '@/components/ReflectionSection'

export default async function ReflectionPage() {
  const userId = await getUserId()
  if (!userId) redirect('/landing')

  return (
    <div className="motion-stack">
      <div className="page-header reveal-up" style={{ '--reveal-delay': '70ms' } as React.CSSProperties}>
        <h1 className="page-title">Reflection</h1>
        <p className="page-subtitle">Track what you actually did — see where your time goes</p>
      </div>

      <div className="reveal-up" style={{ '--reveal-delay': '120ms' } as React.CSSProperties}>
        <ReflectionSection />
      </div>
    </div>
  )
}

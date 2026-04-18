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
      <LiveTimer categories={categories} />
    </div>
  )
}

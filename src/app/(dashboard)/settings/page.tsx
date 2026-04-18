import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getGoals } from '@/actions/goals'
import { getTags } from '@/actions/tags'
import SettingsClient from '@/components/SettingsClient'

export default async function SettingsPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const [categories, goals, tags] = await Promise.all([
    getCategories(),
    getGoals(),
    getTags(),
  ])

  return (
    <div className="motion-stack">
      <div className="page-header reveal-up" style={{ ['--reveal-delay' as string]: '70ms' }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Goals, categories & tags</p>
      </div>

      <div className="reveal-up" style={{ ['--reveal-delay' as string]: '150ms' }}>
        <SettingsClient
          initialCategories={categories}
          initialGoals={goals}
          initialTags={tags}
        />
      </div>
    </div>
  )
}

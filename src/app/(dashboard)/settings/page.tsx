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
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Goals, categories & tags</p>
      </div>

      <SettingsClient
        initialCategories={categories}
        initialGoals={goals}
        initialTags={tags}
      />
    </div>
  )
}

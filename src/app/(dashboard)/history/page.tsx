import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { getTimeEntries } from '@/actions/timeEntries'
import EntryList from '@/components/EntryList'
import ExportButton from '@/components/ExportButton'

export default async function HistoryPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const [categories, entries] = await Promise.all([
    getCategories(),
    getTimeEntries(),
  ])

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">{entries.length} entries logged</p>
        </div>
        <ExportButton entries={entries} />
      </div>

      <div className="glass">
        <EntryList initialEntries={entries} categories={categories} />
      </div>
    </div>
  )
}

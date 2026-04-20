import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getImportantDates } from '@/actions/importantDates'
import ImportantDatesClient from '@/components/ImportantDatesClient'

export default async function ImportantDatesPage() {
  const userId = await getUserId()
  if (!userId) redirect('/landing')

  const dates = await getImportantDates()

  return <ImportantDatesClient initialDates={dates} />
}

import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getJournals } from '@/actions/journal'
import JournalClient from '@/components/JournalClient'

export default async function JournalPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const journals = await getJournals(60)

  return <JournalClient journals={journals} />
}

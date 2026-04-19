import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth'
import { getAnalyticsData } from '@/actions/timeEntries'
import { getCategories } from '@/actions/categories'
import AnalyticsClient from '@/components/AnalyticsClient'

import { Suspense } from 'react'

export default async function AnalyticsPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const [data, categories] = await Promise.all([
    getAnalyticsData(365),
    getCategories(),
  ])

  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading analytics...</div>}>
      <AnalyticsClient data={data} categories={categories} />
    </Suspense>
  )
}

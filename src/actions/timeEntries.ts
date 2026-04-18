'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getTimeEntries() {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.timeEntry.findMany({
    where: { userId },
    include: { category: true, tags: true },
    orderBy: { startTime: 'desc' },
    take: 100,
  })
}

export async function getEntriesByDateRange(start: Date, end: Date) {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.timeEntry.findMany({
    where: {
      userId,
      startTime: { gte: start, lte: end },
    },
    include: { category: true, tags: true },
    orderBy: { startTime: 'desc' },
  })
}

export async function getDashboardStats() {
  const userId = await getUserId()
  if (!userId) return { todaySeconds: 0, weekSeconds: 0, dailyGoal: 36000, weeklyGoal: 252000, categoryBreakdown: [] }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const [entries, goals, categories] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId, startTime: { gte: weekStart } },
      include: { category: true },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { userId } }),
  ])

  let todaySeconds = 0
  let weekSeconds = 0
  const catMap: Record<string, { name: string; color: string; seconds: number }> = {}

  entries.forEach((entry) => {
    const dur = entry.durationSeconds || 0
    weekSeconds += dur
    if (entry.startTime >= today) todaySeconds += dur
    if (entry.category) {
      if (!catMap[entry.category.id]) {
        catMap[entry.category.id] = { name: entry.category.name, color: entry.category.color, seconds: 0 }
      }
      catMap[entry.category.id].seconds += dur
    }
  })

  const dailyGoal = goals.find((g) => g.type === 'DAILY')?.targetSeconds || 36000
  const weeklyGoal = goals.find((g) => g.type === 'WEEKLY')?.targetSeconds || 252000

  return {
    todaySeconds,
    weekSeconds,
    dailyGoal,
    weeklyGoal,
    categoryBreakdown: Object.values(catMap).sort((a, b) => b.seconds - a.seconds),
  }
}

export async function createTimeEntry(data: {
  description?: string
  startTime: Date
  endTime?: Date
  durationSeconds?: number
  categoryId?: string
  tagIds?: string[]
}) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const { tagIds, ...rest } = data

  const entry = await prisma.timeEntry.create({
    data: {
      ...rest,
      userId,
      tags: tagIds ? { connect: tagIds.map((id) => ({ id })) } : undefined,
    },
  })
  revalidatePath('/')
  revalidatePath('/history')
  return entry
}

export async function updateTimeEntry(
  id: string,
  data: Partial<{
    description: string
    startTime: Date
    endTime: Date
    durationSeconds: number
    categoryId: string
    tagIds: string[]
  }>
) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const { tagIds, ...rest } = data

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...rest,
      tags: tagIds ? { set: tagIds.map((id) => ({ id })) } : undefined,
    },
  })
  revalidatePath('/')
  revalidatePath('/history')
  return entry
}

export async function deleteTimeEntry(id: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')
  await prisma.timeEntry.delete({ where: { id } })
  revalidatePath('/')
  revalidatePath('/history')
  revalidatePath('/analytics')
}

export async function getAnalyticsData(days: number = 7) {
  const userId = await getUserId()
  if (!userId) return { dailyData: [], categoryTotals: [], totalSeconds: 0 }

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)

  const entries = await prisma.timeEntry.findMany({
    where: { userId, startTime: { gte: start } },
    include: { category: true },
    orderBy: { startTime: 'asc' },
  })

  // Build daily breakdown
  const dailyMap: Record<string, { date: string; totalSeconds: number; categories: Record<string, { name: string; color: string; seconds: number }> }> = {}

  // Pre-fill all days
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().split('T')[0]
    dailyMap[key] = { date: key, totalSeconds: 0, categories: {} }
  }

  let totalSeconds = 0
  const catTotalMap: Record<string, { name: string; color: string; seconds: number }> = {}

  entries.forEach((entry) => {
    const dur = entry.durationSeconds || 0
    totalSeconds += dur
    const dayKey = new Date(entry.startTime).toISOString().split('T')[0]
    if (dailyMap[dayKey]) {
      dailyMap[dayKey].totalSeconds += dur
      if (entry.category) {
        const cid = entry.category.id
        if (!dailyMap[dayKey].categories[cid]) {
          dailyMap[dayKey].categories[cid] = { name: entry.category.name, color: entry.category.color, seconds: 0 }
        }
        dailyMap[dayKey].categories[cid].seconds += dur
      }
    }
    if (entry.category) {
      if (!catTotalMap[entry.category.id]) {
        catTotalMap[entry.category.id] = { name: entry.category.name, color: entry.category.color, seconds: 0 }
      }
      catTotalMap[entry.category.id].seconds += dur
    }
  })

  const dailyData = Object.values(dailyMap).map(d => ({
    date: d.date,
    totalSeconds: d.totalSeconds,
    categories: Object.values(d.categories).sort((a, b) => b.seconds - a.seconds),
  }))

  return {
    dailyData,
    categoryTotals: Object.values(catTotalMap).sort((a, b) => b.seconds - a.seconds),
    totalSeconds,
  }
}

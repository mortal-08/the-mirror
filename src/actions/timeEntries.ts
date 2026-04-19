'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function validateEntryRelations(userId: string, categoryId?: string, tagIds?: string[]) {
  const uniqueTagIds = [...new Set((tagIds || []).filter(Boolean))]

  if (!categoryId) {
    if (uniqueTagIds.length > 0) {
      throw new Error('Select a category to use tags.')
    }
    return uniqueTagIds
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
    select: {
      id: true,
      tags: {
        select: { id: true },
      },
    },
  })

  if (!category) {
    throw new Error('Invalid category selected.')
  }

  if (uniqueTagIds.length > 0) {
    const allowedTagIds = new Set(category.tags.map((tag) => tag.id))
    const hasInvalidTag = uniqueTagIds.some((tagId) => !allowedTagIds.has(tagId))

    if (hasInvalidTag) {
      throw new Error('Selected tags are not linked to the chosen category.')
    }
  }

  return uniqueTagIds
}

export async function getTimeEntries(limit: number = 100) {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.timeEntry.findMany({
    where: { userId },
    include: { category: true, tags: true },
    orderBy: { startTime: 'desc' },
    take: limit,
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
      where: {
        userId,
        startTime: { gte: weekStart },
        category: { is: { isProductive: true } },
      },
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
  const validatedTagIds = await validateEntryRelations(userId, rest.categoryId, tagIds)

  const entry = await prisma.timeEntry.create({
    data: {
      ...rest,
      userId,
      tags: validatedTagIds.length > 0 ? { connect: validatedTagIds.map((id) => ({ id })) } : undefined,
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

  const existingEntry = await prisma.timeEntry.findFirst({
    where: { id, userId },
    select: { id: true, categoryId: true },
  })

  if (!existingEntry) {
    throw new Error('Entry not found.')
  }

  const effectiveCategoryId = rest.categoryId !== undefined ? rest.categoryId : existingEntry.categoryId || undefined
  const validatedTagIds = tagIds ? await validateEntryRelations(userId, effectiveCategoryId || undefined, tagIds) : undefined
  const clearTagsOnCategoryChange = rest.categoryId !== undefined && !tagIds

  const entry = await prisma.timeEntry.update({
    where: { id: existingEntry.id },
    data: {
      ...rest,
      tags: clearTagsOnCategoryChange
        ? { set: [] }
        : validatedTagIds
          ? { set: validatedTagIds.map((tagId) => ({ id: tagId })) }
          : undefined,
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
  if (!userId) return { dailyData: [], categoryTotals: [], totalSeconds: 0, totalProductiveSeconds: 0 }

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)

  const entries = await prisma.timeEntry.findMany({
    where: { userId, startTime: { gte: start } },
    include: { category: true },
    orderBy: { startTime: 'asc' },
  })

  // Build daily breakdown
  const dailyMap: Record<string, { date: string; totalSeconds: number; productiveSeconds: number; categories: Record<string, { name: string; color: string; seconds: number }>; entries: { description: string; seconds: number; category: string; color: string; time: string }[] }> = {}

  // Pre-fill all days
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().split('T')[0]
    dailyMap[key] = { date: key, totalSeconds: 0, productiveSeconds: 0, categories: {}, entries: [] }
  }

  let totalSeconds = 0
  let totalProductiveSeconds = 0
  const catTotalMap: Record<string, { name: string; color: string; seconds: number }> = {}

  entries.forEach((entry) => {
    const dur = entry.durationSeconds || 0
    const isProductive = !!entry.categoryId && entry.category?.isProductive === true
    totalSeconds += dur
    if (isProductive) totalProductiveSeconds += dur
    const dayKey = new Date(entry.startTime).toISOString().split('T')[0]
    if (dailyMap[dayKey]) {
      dailyMap[dayKey].totalSeconds += dur
      if (isProductive) dailyMap[dayKey].productiveSeconds += dur
      const catName = entry.category?.name || 'Uncategorized'
      const catColor = entry.category?.color || '#888888'
      const cid = entry.category?.id || '__uncategorized'
      if (!dailyMap[dayKey].categories[cid]) {
        dailyMap[dayKey].categories[cid] = { name: catName, color: catColor, seconds: 0 }
      }
      dailyMap[dayKey].categories[cid].seconds += dur
      // Add individual entry
      dailyMap[dayKey].entries.push({
        description: entry.description || 'No description',
        seconds: dur,
        category: catName,
        color: catColor,
        time: new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      })
    }
    const catName = entry.category?.name || 'Uncategorized'
    const catColor = entry.category?.color || '#888888'
    const cid = entry.category?.id || '__uncategorized'
    if (!catTotalMap[cid]) {
      catTotalMap[cid] = { name: catName, color: catColor, seconds: 0 }
    }
    catTotalMap[cid].seconds += dur
  })

  const dailyData = Object.values(dailyMap).map(d => ({
    date: d.date,
    totalSeconds: d.totalSeconds,
    productiveSeconds: d.productiveSeconds,
    categories: Object.values(d.categories).sort((a, b) => b.seconds - a.seconds),
    entries: d.entries,
  }))

  return {
    dailyData,
    categoryTotals: Object.values(catTotalMap).sort((a, b) => b.seconds - a.seconds),
    totalSeconds,
    totalProductiveSeconds,
  }
}

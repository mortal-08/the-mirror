'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getImportantDates() {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.importantDate.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  })
}

export async function getUpcomingDates(withinDays: number = 10) {
  const userId = await getUserId()
  if (!userId) return []

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const futureLimit = new Date(today)
  futureLimit.setDate(futureLimit.getDate() + withinDays)

  return await prisma.importantDate.findMany({
    where: {
      userId,
      date: { gte: today, lte: futureLimit },
    },
    orderBy: { date: 'asc' },
  })
}

export async function createImportantDate(data: {
  title: string
  date: string // YYYY-MM-DD
  description?: string
  color?: string
}) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const entry = await prisma.importantDate.create({
    data: {
      userId,
      title: data.title,
      date: new Date(data.date + 'T00:00:00'),
      description: data.description || undefined,
      color: data.color || '#f59e0b',
    },
  })
  revalidatePath('/')
  revalidatePath('/important-dates')
  return entry
}

export async function deleteImportantDate(id: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  await prisma.importantDate.delete({ where: { id } })
  revalidatePath('/')
  revalidatePath('/important-dates')
}

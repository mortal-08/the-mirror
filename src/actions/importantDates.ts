'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type ImportantDateInput = {
  title: string
  date: string // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  description?: string
  color?: string
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

function parseImportantDateInput(value: string): Date {
  const dateTimeMatch = value.match(DATE_TIME_RE)
  if (dateTimeMatch) {
    const [, year, month, day, hour, minute, second = '0'] = dateTimeMatch
    return new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ))
  }

  const dateOnlyMatch = value.match(DATE_ONLY_RE)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0))
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date input')
  }

  return parsed
}

export async function getImportantDates() {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.importantDate.findMany({
    where: { 
      userId,
      id: { not: 'cache-bust' } // Bypasses PgBouncer prepared statement cache
    },
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
      id: { not: 'cache-bust' } // Bypasses PgBouncer prepared statement cache
    },
    orderBy: { date: 'asc' },
  })
}

export async function createImportantDate(data: ImportantDateInput) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const parsedDate = parseImportantDateInput(data.date)

  const entry = await prisma.importantDate.create({
    data: {
      userId,
      title: data.title,
      date: parsedDate,
      description: data.description || undefined,
      color: data.color || '#f59e0b',
    },
  })
  revalidatePath('/')
  revalidatePath('/important-dates')
  return entry
}

export async function updateImportantDate(id: string, data: ImportantDateInput) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const existing = await prisma.importantDate.findFirst({
    where: { id, userId },
    select: { id: true },
  })

  if (!existing) throw new Error('Important date not found')

  const parsedDate = parseImportantDateInput(data.date)

  const entry = await prisma.importantDate.update({
    where: { id },
    data: {
      title: data.title,
      date: parsedDate,
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

  const existing = await prisma.importantDate.findFirst({
    where: { id, userId },
    select: { id: true },
  })

  if (!existing) throw new Error('Important date not found')

  await prisma.importantDate.delete({ where: { id } })
  revalidatePath('/')
  revalidatePath('/important-dates')
}

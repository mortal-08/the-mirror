'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getJournals(limit = 30) {
  const userId = await getUserId()
  if (!userId) return []

  const journals = await prisma.journal.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  })

  return journals.map((j) => ({
    ...j,
    date: j.date.toISOString(),
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  }))
}

export async function getJournalByDate(date: string) {
  const userId = await getUserId()
  if (!userId) return null

  const journal = await prisma.journal.findUnique({
    where: {
      date_userId: {
        date: new Date(date),
        userId,
      },
    },
  })

  if (!journal) return null

  return {
    ...journal,
    date: journal.date.toISOString(),
    createdAt: journal.createdAt.toISOString(),
    updatedAt: journal.updatedAt.toISOString(),
  }
}

export async function upsertJournal(date: string, content: string, mood?: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Not authenticated')

  const dateObj = new Date(date)

  const journal = await prisma.journal.upsert({
    where: {
      date_userId: {
        date: dateObj,
        userId,
      },
    },
    update: { content, mood },
    create: { date: dateObj, content, mood, userId },
  })

  revalidatePath('/')
  revalidatePath('/journal')

  return {
    ...journal,
    date: journal.date.toISOString(),
    createdAt: journal.createdAt.toISOString(),
    updatedAt: journal.updatedAt.toISOString(),
  }
}

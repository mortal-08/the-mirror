'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type ActionResult<T> = { success: true; data: T } | { error: string }

function normalizeDateKey(input: Date | string): string | null {
  if (typeof input === 'string') {
    const raw = input.trim()
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw)
    if (match) return match[1]

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toISOString().slice(0, 10)
  }

  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export async function getReflections(date: Date | string) {
  try {
    const userId = await getUserId()
    if (!userId) return []

    const dateKey = normalizeDateKey(date)
    if (!dateKey) return []

    const startOfDay = new Date(`${dateKey}T00:00:00.000Z`)
    const endOfDay = new Date(`${dateKey}T23:59:59.999Z`)

    const reflections = await prisma.reflection.findMany({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { timeSlot: 'asc' },
    })

    return reflections
  } catch (error) {
    console.error('Get reflections error:', error)
    return []
  }
}

export async function upsertReflection(
  date: Date | string,
  timeSlot: number,
  content: string,
  routineBlockId?: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.reflection.upsert>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const trimmedContent = content.trim()
    if (!trimmedContent) return { error: 'Reflection content is required.' }

    const dateKey = normalizeDateKey(date)
    if (!dateKey) return { error: 'Invalid date provided.' }

    const startOfDay = new Date(`${dateKey}T00:00:00.000Z`)

    const reflection = await prisma.reflection.upsert({
      where: {
        userId_date_timeSlot: {
          userId,
          date: startOfDay,
          timeSlot,
        },
      },
      update: {
        content: trimmedContent,
        routineBlockId: routineBlockId || null,
      },
      create: {
        userId,
        date: startOfDay,
        timeSlot,
        content: trimmedContent,
        routineBlockId: routineBlockId || null,
      },
    })

    revalidatePath('/')
    return { success: true, data: reflection }
  } catch (error) {
    console.error('Upsert reflection error:', error)
    return { error: 'Failed to save reflection.' }
  }
}

export async function deleteReflection(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const existing = await prisma.reflection.findFirst({
      where: { id, userId },
    })

    if (!existing) return { error: 'Reflection not found.' }

    await prisma.reflection.delete({ where: { id } })

    revalidatePath('/')
    return { success: true, data: { id } }
  } catch (error) {
    console.error('Delete reflection error:', error)
    return { error: 'Failed to delete reflection.' }
  }
}

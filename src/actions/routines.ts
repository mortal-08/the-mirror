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

function getDayBounds(date: Date | string): { startOfDay: Date; endOfDay: Date } | null {
  const dateKey = normalizeDateKey(date)
  if (!dateKey) return null

  const startOfDay = new Date(`${dateKey}T00:00:00.000Z`)
  const endOfDay = new Date(`${dateKey}T23:59:59.999Z`)

  return { startOfDay, endOfDay }
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  return (hours * 60) + minutes
}

export async function getRoutineBlocks(date: Date | string): Promise<ActionResult<Awaited<ReturnType<typeof prisma.routineBlock.findMany>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const bounds = getDayBounds(date)
    if (!bounds) return { error: 'Invalid date provided.' }

    const routineBlocks = await prisma.routineBlock.findMany({
      where: {
        userId,
        planDate: {
          gte: bounds.startOfDay,
          lte: bounds.endOfDay,
        },
      },
      orderBy: { startMinutes: 'asc' },
    })

    return { success: true, data: routineBlocks }
  } catch (error) {
    console.error('Get routine blocks error:', error)
    return { error: 'Failed to fetch routine blocks.' }
  }
}

export async function createRoutineBlock(
  task: string,
  planDate: Date | string,
  startTime: string,
  endTime: string,
  templateId?: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.routineBlock.create>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const trimmedTask = task.trim()
    if (!trimmedTask) return { error: 'Task is required.' }

    const bounds = getDayBounds(planDate)
    if (!bounds) return { error: 'Invalid date provided.' }

    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)

    if (startMinutes === null || endMinutes === null) {
      return { error: 'Start and end times must use HH:MM format.' }
    }

    if (endMinutes <= startMinutes) {
      return { error: 'End time must be after start time.' }
    }

    const overlappingBlock = await prisma.routineBlock.findFirst({
      where: {
        userId,
        planDate: {
          gte: bounds.startOfDay,
          lte: bounds.endOfDay,
        },
        startMinutes: { lt: endMinutes },
        endMinutes: { gt: startMinutes },
      },
      select: { id: true },
    })

    if (overlappingBlock) {
      return { error: 'This block overlaps with an existing routine block.' }
    }

    const routineBlock = await prisma.routineBlock.create({
      data: {
        userId,
        planDate: bounds.startOfDay,
        task: trimmedTask,
        startMinutes,
        endMinutes,
        templateId: templateId || null,
      },
    })

    revalidatePath('/')
    return { success: true, data: routineBlock }
  } catch (error) {
    console.error('Create routine block error:', error)
    return { error: 'Failed to create routine block.' }
  }
}

export async function deleteRoutineBlock(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const existingBlock = await prisma.routineBlock.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existingBlock) {
      return { error: 'Routine block not found.' }
    }

    await prisma.routineBlock.delete({ where: { id } })

    revalidatePath('/')
    return { success: true, data: { id } }
  } catch (error) {
    console.error('Delete routine block error:', error)
    return { error: 'Failed to delete routine block.' }
  }
}

export async function updateRoutineBlock(
  id: string,
  data: {
    task?: string
    startTime?: string
    endTime?: string
  }
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.routineBlock.update>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const existing = await prisma.routineBlock.findFirst({
      where: { id, userId },
      select: {
        id: true,
        planDate: true,
        task: true,
        startMinutes: true,
        endMinutes: true,
      },
    })

    if (!existing) {
      return { error: 'Routine block not found.' }
    }

    const nextTask = data.task !== undefined ? data.task.trim() : existing.task
    if (!nextTask) {
      return { error: 'Task is required.' }
    }

    const nextStartMinutes = data.startTime !== undefined ? parseTimeToMinutes(data.startTime) : existing.startMinutes
    const nextEndMinutes = data.endTime !== undefined ? parseTimeToMinutes(data.endTime) : existing.endMinutes

    if (nextStartMinutes === null || nextEndMinutes === null) {
      return { error: 'Start and end times must use HH:MM format.' }
    }

    if (nextEndMinutes <= nextStartMinutes) {
      return { error: 'End time must be after start time.' }
    }

    const overlap = await prisma.routineBlock.findFirst({
      where: {
        userId,
        planDate: existing.planDate,
        id: { not: existing.id },
        startMinutes: { lt: nextEndMinutes },
        endMinutes: { gt: nextStartMinutes },
      },
      select: { id: true },
    })

    if (overlap) {
      return { error: 'This block overlaps with an existing routine block.' }
    }

    // Increment notifyVersion if time changed (invalidates old notification keys)
    const timeChanged =
      (data.startTime !== undefined && nextStartMinutes !== existing.startMinutes) ||
      (data.endTime !== undefined && nextEndMinutes !== existing.endMinutes)

    const updated = await prisma.routineBlock.update({
      where: { id: existing.id },
      data: {
        task: nextTask,
        startMinutes: nextStartMinutes,
        endMinutes: nextEndMinutes,
        ...(timeChanged ? { notifyVersion: { increment: 1 } } : {}),
      },
    })

    revalidatePath('/')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Update routine block error:', error)
    return { error: 'Failed to update routine block.' }
  }
}

export async function reorderRoutineBlocks(
  planDate: Date | string,
  orderedIds: string[]
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.routineBlock.findMany>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    if (orderedIds.length < 2) {
      return { error: 'Need at least 2 blocks to reorder.' }
    }

    const bounds = getDayBounds(planDate)
    if (!bounds) return { error: 'Invalid date provided.' }

    const blocks = await prisma.routineBlock.findMany({
      where: {
        userId,
        planDate: {
          gte: bounds.startOfDay,
          lte: bounds.endOfDay,
        },
      },
      orderBy: { startMinutes: 'asc' },
      select: {
        id: true,
        task: true,
      },
    })

    if (blocks.length !== orderedIds.length) {
      return { error: 'Reorder payload does not match current routine blocks.' }
    }

    const existingSet = new Set(blocks.map((block) => block.id))
    const orderedSet = new Set(orderedIds)

    if (existingSet.size !== orderedSet.size) {
      return { error: 'Reorder payload is invalid.' }
    }

    for (const id of orderedIds) {
      if (!existingSet.has(id)) {
        return { error: 'Reorder payload contains unknown routine blocks.' }
      }
    }

    const taskById = new Map(blocks.map((block) => [block.id, block.task]))
    const reorderedTasks = orderedIds.map((id) => taskById.get(id) || '')

    await prisma.$transaction(
      blocks.map((slotBlock, index) =>
        prisma.routineBlock.update({
          where: { id: slotBlock.id },
          data: { task: reorderedTasks[index] },
        })
      )
    )

    const updatedBlocks = await prisma.routineBlock.findMany({
      where: {
        userId,
        planDate: {
          gte: bounds.startOfDay,
          lte: bounds.endOfDay,
        },
      },
      orderBy: { startMinutes: 'asc' },
    })

    revalidatePath('/')
    return { success: true, data: updatedBlocks }
  } catch (error) {
    console.error('Reorder routine blocks error:', error)
    return { error: 'Failed to reorder routine blocks.' }
  }
}

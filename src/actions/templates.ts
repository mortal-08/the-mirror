'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type ActionResult<T> = { success: true; data: T } | { error: string }

type TemplateBlockInput = {
  task: string
  startMinutes: number
  endMinutes: number
}

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

export async function getRoutineTemplates(): Promise<ActionResult<Awaited<ReturnType<typeof prisma.routineTemplate.findMany>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const templates = await prisma.routineTemplate.findMany({
      where: { userId },
      include: { blocks: { orderBy: { startMinutes: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: templates }
  } catch (error) {
    console.error('Get routine templates error:', error)
    return { error: 'Failed to fetch routine templates.' }
  }
}

export async function createRoutineTemplate(
  name: string,
  days: number[],
  blocks: TemplateBlockInput[]
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.routineTemplate.create>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const trimmedName = name.trim()
    if (!trimmedName) return { error: 'Template name is required.' }

    if (days.length === 0) return { error: 'Select at least one day.' }

    if (blocks.length === 0) return { error: 'Add at least one block to the template.' }

    // Validate blocks
    for (const block of blocks) {
      if (!block.task.trim()) return { error: 'All blocks must have a task.' }
      if (block.endMinutes <= block.startMinutes) return { error: 'End time must be after start time for all blocks.' }
    }

    // Check for overlapping blocks within template
    const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinutes < sorted[i - 1].endMinutes) {
        return { error: 'Template blocks must not overlap.' }
      }
    }

    const template = await prisma.routineTemplate.create({
      data: {
        userId,
        name: trimmedName,
        days,
        blocks: {
          create: blocks.map((b) => ({
            task: b.task.trim(),
            startMinutes: b.startMinutes,
            endMinutes: b.endMinutes,
          })),
        },
      },
      include: { blocks: { orderBy: { startMinutes: 'asc' } } },
    })

    revalidatePath('/')
    return { success: true, data: template }
  } catch (error) {
    console.error('Create routine template error:', error)
    return { error: 'Failed to create routine template.' }
  }
}

export async function updateRoutineTemplate(
  id: string,
  data: {
    name?: string
    days?: number[]
    isActive?: boolean
    blocks?: TemplateBlockInput[]
  }
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.routineTemplate.update>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const existing = await prisma.routineTemplate.findFirst({
      where: { id, userId },
    })

    if (!existing) return { error: 'Template not found.' }

    const updateData: any = {}

    if (data.name !== undefined) {
      const trimmedName = data.name.trim()
      if (!trimmedName) return { error: 'Template name is required.' }
      updateData.name = trimmedName
    }

    if (data.days !== undefined) {
      if (data.days.length === 0) return { error: 'Select at least one day.' }
      updateData.days = data.days
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    // If blocks are being updated, delete old and recreate
    if (data.blocks !== undefined) {
      if (data.blocks.length === 0) return { error: 'Add at least one block.' }

      for (const block of data.blocks) {
        if (!block.task.trim()) return { error: 'All blocks must have a task.' }
        if (block.endMinutes <= block.startMinutes) return { error: 'End time must be after start time for all blocks.' }
      }

      const sorted = [...data.blocks].sort((a, b) => a.startMinutes - b.startMinutes)
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startMinutes < sorted[i - 1].endMinutes) {
          return { error: 'Template blocks must not overlap.' }
        }
      }

      await prisma.routineTemplateBlock.deleteMany({ where: { templateId: id } })
      updateData.blocks = {
        create: data.blocks.map((b) => ({
          task: b.task.trim(),
          startMinutes: b.startMinutes,
          endMinutes: b.endMinutes,
        })),
      }
    }

    const updated = await prisma.routineTemplate.update({
      where: { id },
      data: updateData,
      include: { blocks: { orderBy: { startMinutes: 'asc' } } },
    })

    revalidatePath('/')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Update routine template error:', error)
    return { error: 'Failed to update routine template.' }
  }
}

export async function deleteRoutineTemplate(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const existing = await prisma.routineTemplate.findFirst({
      where: { id, userId },
    })

    if (!existing) return { error: 'Template not found.' }

    await prisma.routineTemplate.delete({ where: { id } })

    revalidatePath('/')
    return { success: true, data: { id } }
  } catch (error) {
    console.error('Delete routine template error:', error)
    return { error: 'Failed to delete routine template.' }
  }
}

/**
 * Apply a specific template's blocks to a given date.
 * Skips blocks that would overlap with existing blocks on that date.
 */
export async function applyTemplateToDate(
  templateId: string,
  date: Date | string
): Promise<ActionResult<{ applied: number; skipped: number }>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const dateKey = normalizeDateKey(date)
    if (!dateKey) return { error: 'Invalid date.' }

    const template = await prisma.routineTemplate.findFirst({
      where: { id: templateId, userId },
      include: { blocks: true },
    })

    if (!template) return { error: 'Template not found.' }

    const startOfDay = new Date(`${dateKey}T00:00:00.000Z`)
    const endOfDay = new Date(`${dateKey}T23:59:59.999Z`)

    // Get existing blocks for that date
    const existingBlocks = await prisma.routineBlock.findMany({
      where: {
        userId,
        planDate: { gte: startOfDay, lte: endOfDay },
      },
      select: { startMinutes: true, endMinutes: true },
    })

    let applied = 0
    let skipped = 0

    for (const templateBlock of template.blocks) {
      // Check overlap with existing blocks
      const overlaps = existingBlocks.some(
        (eb) => templateBlock.startMinutes < eb.endMinutes && templateBlock.endMinutes > eb.startMinutes
      )

      if (overlaps) {
        skipped++
        continue
      }

      await prisma.routineBlock.create({
        data: {
          userId,
          planDate: startOfDay,
          task: templateBlock.task,
          startMinutes: templateBlock.startMinutes,
          endMinutes: templateBlock.endMinutes,
          templateId: template.id,
        },
      })

      // Add to existing blocks list to avoid overlaps within template
      existingBlocks.push({
        startMinutes: templateBlock.startMinutes,
        endMinutes: templateBlock.endMinutes,
      })

      applied++
    }

    revalidatePath('/')
    return { success: true, data: { applied, skipped } }
  } catch (error) {
    console.error('Apply template to date error:', error)
    return { error: 'Failed to apply template.' }
  }
}

/**
 * Auto-apply all active templates matching a date's day-of-week.
 * Only applies if no blocks exist for that date yet.
 */
export async function applyTemplatesForDate(
  date: Date | string
): Promise<ActionResult<{ applied: number; templates: number }>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const dateKey = normalizeDateKey(date)
    if (!dateKey) return { error: 'Invalid date.' }

    const startOfDay = new Date(`${dateKey}T00:00:00.000Z`)
    const endOfDay = new Date(`${dateKey}T23:59:59.999Z`)

    // Check if blocks already exist for this date
    const existingCount = await prisma.routineBlock.count({
      where: {
        userId,
        planDate: { gte: startOfDay, lte: endOfDay },
      },
    })

    if (existingCount > 0) {
      return { success: true, data: { applied: 0, templates: 0 } }
    }

    // Get the day of week for the date (0=Sun, 1=Mon, ..., 6=Sat)
    const dayOfWeek = new Date(`${dateKey}T12:00:00.000Z`).getUTCDay()

    // Find active templates that include this day
    const templates = await prisma.routineTemplate.findMany({
      where: {
        userId,
        isActive: true,
        days: { has: dayOfWeek },
      },
      include: { blocks: { orderBy: { startMinutes: 'asc' } } },
    })

    if (templates.length === 0) {
      return { success: true, data: { applied: 0, templates: 0 } }
    }

    let totalApplied = 0
    const occupiedSlots: { startMinutes: number; endMinutes: number }[] = []

    for (const template of templates) {
      for (const block of template.blocks) {
        const overlaps = occupiedSlots.some(
          (slot) => block.startMinutes < slot.endMinutes && block.endMinutes > slot.startMinutes
        )

        if (overlaps) continue

        await prisma.routineBlock.create({
          data: {
            userId,
            planDate: startOfDay,
            task: block.task,
            startMinutes: block.startMinutes,
            endMinutes: block.endMinutes,
            templateId: template.id,
          },
        })

        occupiedSlots.push({
          startMinutes: block.startMinutes,
          endMinutes: block.endMinutes,
        })

        totalApplied++
      }
    }

    revalidatePath('/')
    return { success: true, data: { applied: totalApplied, templates: templates.length } }
  } catch (error) {
    console.error('Apply templates for date error:', error)
    return { error: 'Failed to auto-apply templates.' }
  }
}

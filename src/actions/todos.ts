'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type ActionResult<T> = { success: true; data: T } | { error: string }

export async function getTodos(date: Date): Promise<ActionResult<Awaited<ReturnType<typeof prisma.todo.findMany>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const requestedDate = new Date(date)
    if (Number.isNaN(requestedDate.getTime())) {
      return { error: 'Invalid date provided.' }
    }

    const startOfDay = new Date(requestedDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(requestedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const todos = await prisma.todo.findMany({
      where: {
        userId,
        targetDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return { success: true, data: todos }
  } catch (error) {
    console.error('Get todos error:', error)
    return { error: 'Failed to fetch todos.' }
  }
}

export async function createTodo(task: string, targetDate: Date): Promise<ActionResult<Awaited<ReturnType<typeof prisma.todo.create>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const trimmedTask = task.trim()
    if (!trimmedTask) {
      return { error: 'Task cannot be empty.' }
    }

    const parsedDate = new Date(targetDate)
    if (Number.isNaN(parsedDate.getTime())) {
      return { error: 'Invalid target date provided.' }
    }

    const todo = await prisma.todo.create({
      data: {
        userId,
        task: trimmedTask,
        targetDate: parsedDate,
      },
    })

    revalidatePath('/')
    return { success: true, data: todo }
  } catch (error) {
    console.error('Create todo error:', error)
    return { error: 'Failed to create todo.' }
  }
}

export async function toggleTodo(id: string, isCompleted: boolean): Promise<ActionResult<Awaited<ReturnType<typeof prisma.todo.update>>>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const existingTodo = await prisma.todo.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingTodo) {
      return { error: 'Todo not found.' }
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: { isCompleted },
    })

    revalidatePath('/')
    return { success: true, data: todo }
  } catch (error) {
    console.error('Toggle todo error:', error)
    return { error: 'Failed to update todo.' }
  }
}

export async function deleteTodo(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Not authenticated.' }

    const existingTodo = await prisma.todo.findFirst({
      where: {
        id,
        userId,
      },
      select: { id: true },
    })

    if (!existingTodo) {
      return { error: 'Todo not found.' }
    }

    await prisma.todo.delete({
      where: { id },
    })

    revalidatePath('/')
    return { success: true, data: { id } }
  } catch (error) {
    console.error('Delete todo error:', error)
    return { error: 'Failed to delete todo.' }
  }
}

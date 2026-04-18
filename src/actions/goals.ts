'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getGoals() {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.goal.findMany({ where: { userId } })
}

export async function upsertGoal(type: string, targetSeconds: number) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const goal = await prisma.goal.upsert({
    where: { type_userId: { type, userId } },
    update: { targetSeconds },
    create: { type, targetSeconds, userId },
  })
  revalidatePath('/')
  revalidatePath('/settings')
  return goal
}

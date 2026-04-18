'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getTags() {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.tag.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createTag(name: string, color?: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')
  const tag = await prisma.tag.create({
    data: { name, color: color || '#8b5cf6', userId },
  })
  revalidatePath('/settings')
  return tag
}

export async function deleteTag(id: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')
  await prisma.tag.delete({ where: { id } })
  revalidatePath('/settings')
}

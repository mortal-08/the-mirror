'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getCategories() {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createCategory(name: string, color?: string, icon?: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')
  const cat = await prisma.category.create({
    data: { name, color: color || '#6366f1', icon: icon || 'folder', userId },
  })
  revalidatePath('/')
  revalidatePath('/settings')
  return cat
}

export async function updateCategory(id: string, data: { name?: string; color?: string; icon?: string }) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')
  const cat = await prisma.category.update({
    where: { id },
    data,
  })
  revalidatePath('/')
  revalidatePath('/settings')
  return cat
}

export async function deleteCategory(id: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')
  await prisma.category.delete({ where: { id } })
  revalidatePath('/')
  revalidatePath('/settings')
}

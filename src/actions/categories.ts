'use server'

import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getCategories() {
  const userId = await getUserId()
  if (!userId) return []
  return await prisma.category.findMany({
    where: { userId },
    include: {
      tags: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createCategory(
  name: string,
  color?: string,
  icon?: string,
  isProductive: boolean = false,
  tagIds: string[] = []
) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const uniqueTagIds = [...new Set(tagIds)]

  if (uniqueTagIds.length > 0) {
    const ownedTags = await prisma.tag.findMany({
      where: {
        userId,
        id: { in: uniqueTagIds },
      },
      select: { id: true },
    })

    if (ownedTags.length !== uniqueTagIds.length) {
      throw new Error('Invalid tags selected.')
    }
  }

  const cat = await prisma.category.create({
    data: {
      name,
      color: color || '#6366f1',
      icon: icon || 'folder',
      isProductive,
      userId,
      tags: uniqueTagIds.length > 0 ? { connect: uniqueTagIds.map((id) => ({ id })) } : undefined,
    },
    include: {
      tags: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  revalidatePath('/')
  revalidatePath('/settings')
  return cat
}

export async function updateCategory(
  id: string,
  data: { name?: string; color?: string; icon?: string; isProductive?: boolean; tagIds?: string[] }
) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const existing = await prisma.category.findFirst({
    where: { id, userId },
    select: { id: true },
  })

  if (!existing) {
    throw new Error('Category not found.')
  }

  const { tagIds, ...rest } = data

  const updateData: {
    name?: string
    color?: string
    icon?: string
    isProductive?: boolean
    tags?: { set: { id: string }[] }
  } = {
    ...rest,
  }

  if (tagIds) {
    const uniqueTagIds = [...new Set(tagIds)]

    if (uniqueTagIds.length > 0) {
      const ownedTags = await prisma.tag.findMany({
        where: {
          userId,
          id: { in: uniqueTagIds },
        },
        select: { id: true },
      })

      if (ownedTags.length !== uniqueTagIds.length) {
        throw new Error('Invalid tags selected.')
      }
    }

    updateData.tags = {
      set: uniqueTagIds.map((tagId) => ({ id: tagId })),
    }
  }

  const cat = await prisma.category.update({
    where: { id },
    data: updateData,
    include: {
      tags: {
        orderBy: { createdAt: 'asc' },
      },
    },
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

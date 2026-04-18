'use server'

import prisma, { testConnection } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function registerUser(name: string, email: string, password: string) {
  try {
    // Quick connectivity check to avoid 10s pool timeout
    const isConnected = await testConnection()
    if (!isConnected) {
      return { error: 'Cannot reach the database right now. If this is a fresh Neon instance, wait a few seconds and try again.' }
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { error: 'An account with this email already exists.' }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    })

    // Create default categories for the new user
    const defaults = [
      { name: 'Work', color: '#6366f1', icon: 'briefcase' },
      { name: 'Study', color: '#8b5cf6', icon: 'book' },
      { name: 'Exercise', color: '#22c55e', icon: 'dumbbell' },
      { name: 'Leisure', color: '#f59e0b', icon: 'gamepad' },
      { name: 'Personal', color: '#06b6d4', icon: 'user' },
    ]

    await prisma.category.createMany({
      data: defaults.map((c) => ({ ...c, userId: user.id })),
    })

    // Create default goals
    await prisma.goal.createMany({
      data: [
        { type: 'DAILY', targetSeconds: 36000, userId: user.id },
        { type: 'WEEKLY', targetSeconds: 252000, userId: user.id },
      ],
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('connection') || message.includes('pool') || message.includes('Timed out') || message.includes('P1001')) {
      return { error: 'Database connection failed. Please retry in a few seconds.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }
}

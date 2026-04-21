import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, p256dh, auth, timezone } = body

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing subscription data' }, { status: 400 })
    }

    // Upsert: if this endpoint already exists, update it
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh,
        auth,
        timezone: timezone || 'UTC',
        userId,
      },
      create: {
        endpoint,
        p256dh,
        auth,
        timezone: timezone || 'UTC',
        userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push Subscribe] Error:', error)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}

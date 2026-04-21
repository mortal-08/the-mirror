import { NextRequest, NextResponse } from 'next/server'
import { checkAndSendNotifications } from '@/lib/push-check'

/**
 * Cron endpoint: checks all users' upcoming events and sends push notifications.
 * Protected by CRON_SECRET header or query param.
 *
 * Can be called by:
 * - The server-side instrumentation interval (automatic)
 * - An external cron service (e.g., Vercel Cron)
 * - Manual: curl "http://localhost:3000/api/cron/notifications?secret=mirror-cron-secret-2024"
 */
export async function GET(request: NextRequest) {
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await checkAndSendNotifications()
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Notifications] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Disable static generation for this route
export const dynamic = 'force-dynamic'

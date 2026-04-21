/**
 * Server-side notification check.
 * Runs periodically (via cron or instrumentation) to find upcoming routine blocks
 * and important dates for all users with push subscriptions, then sends push
 * notifications through the Web Push API.
 */

import prisma from '@/lib/prisma'
import { sendPushToSubscription } from '@/lib/webpush'

// Track which notifications have been sent to avoid duplicates
// In-memory map: key -> timestamp (cleared daily)
const sentNotifications = new Map<string, number>()
const SENT_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

function cleanSentCache() {
  const now = Date.now()
  for (const [key, ts] of sentNotifications) {
    if (now - ts > SENT_TTL_MS) {
      sentNotifications.delete(key)
    }
  }
}

function hasSent(key: string): boolean {
  return sentNotifications.has(key)
}

function markSent(key: string) {
  sentNotifications.set(key, Date.now())
}

/**
 * Convert a UTC Date to a date-key string in the user's timezone.
 */
function toDateKeyInTimezone(date: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
    return parts // e.g., "2026-04-21"
  } catch {
    // Fallback to UTC
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}

/**
 * Get current hours and minutes in a timezone.
 */
function getNowInTimezone(tz: string): { hours: number; minutes: number; totalMinutes: number } {
  try {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
    const [h, m] = timeStr.split(':').map(Number)
    return { hours: h, minutes: m, totalMinutes: h * 60 + m }
  } catch {
    const now = new Date()
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      totalMinutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
    }
  }
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export async function checkAndSendNotifications(): Promise<{
  checked: number
  sent: number
  errors: number
}> {
  cleanSentCache()

  let checked = 0
  let sent = 0
  let errors = 0

  try {
    // Get all push subscriptions grouped by user
    const subscriptions = await prisma.pushSubscription.findMany({
      select: {
        id: true,
        userId: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        timezone: true,
      },
    })

    if (subscriptions.length === 0) return { checked: 0, sent: 0, errors: 0 }

    // Group by user
    const userSubsMap = new Map<string, typeof subscriptions>()
    for (const sub of subscriptions) {
      const arr = userSubsMap.get(sub.userId) || []
      arr.push(sub)
      userSubsMap.set(sub.userId, arr)
    }

    for (const [userId, subs] of userSubsMap) {
      checked++

      // Use the timezone from the first subscription for this user
      const tz = subs[0].timezone || 'UTC'
      const todayKey = toDateKeyInTimezone(new Date(), tz)
      const { totalMinutes: nowMinutes } = getNowInTimezone(tz)

      // ── Check Routine Blocks ──
      try {
        const dayStart = new Date(`${todayKey}T00:00:00.000Z`)
        const dayEnd = new Date(`${todayKey}T23:59:59.999Z`)

        const routineBlocks = await prisma.routineBlock.findMany({
          where: {
            userId,
            planDate: { gte: dayStart, lte: dayEnd },
          },
          select: {
            id: true,
            task: true,
            startMinutes: true,
            endMinutes: true,
          },
        })

        for (const block of routineBlocks) {
          // "At start" notification: within 2 minutes of start time
          const startKey = `push-routine-start:${block.id}:${todayKey}`
          if (
            !hasSent(startKey) &&
            nowMinutes >= block.startMinutes &&
            nowMinutes <= block.startMinutes + 2
          ) {
            const payload = {
              title: '⏰ Routine Started',
              body: `${block.task} — ${formatTime(block.startMinutes)} to ${formatTime(block.endMinutes)}`,
              tag: startKey,
              url: '/routine',
            }

            for (const sub of subs) {
              const ok = await sendPushToSubscription(sub, payload)
              if (ok) sent++
              else errors++

              // Clean up expired subscriptions
              if (!ok) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
              }
            }
            markSent(startKey)
          }

          // "Pre-start" notification: 10 minutes before (configurable per-user would need DB, use 10 as default)
          const LEAD_MINS = 10
          const preKey = `push-routine-pre:${block.id}:${todayKey}`
          const preMinutes = block.startMinutes - LEAD_MINS
          if (
            !hasSent(preKey) &&
            LEAD_MINS > 0 &&
            nowMinutes >= preMinutes &&
            nowMinutes < block.startMinutes
          ) {
            const minsUntil = block.startMinutes - nowMinutes
            const payload = {
              title: `📋 Routine in ${minsUntil} min`,
              body: `${block.task} starts at ${formatTime(block.startMinutes)}.`,
              tag: preKey,
              url: '/routine',
            }

            for (const sub of subs) {
              const ok = await sendPushToSubscription(sub, payload)
              if (ok) sent++
              else errors++

              if (!ok) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
              }
            }
            markSent(preKey)
          }
        }
      } catch (err) {
        console.error(`[PushCheck] Routine check failed for user ${userId}:`, err)
        errors++
      }

      // ── Check Important Dates ──
      try {
        const now = new Date()
        const todayStart = new Date(`${todayKey}T00:00:00.000Z`)
        const todayEnd = new Date(`${todayKey}T23:59:59.999Z`)

        const importantDates = await prisma.importantDate.findMany({
          where: {
            userId,
            date: { gte: todayStart, lte: todayEnd },
          },
          select: {
            id: true,
            title: true,
            date: true,
          },
        })

        for (const item of importantDates) {
          // Morning summary (around 6 AM user time)
          const morningKey = `push-keydate-morning:${item.id}:${todayKey}`
          if (
            !hasSent(morningKey) &&
            nowMinutes >= 360 && // 6:00 AM
            nowMinutes <= 365    // within 5 mins of 6 AM
          ) {
            const hUTC = item.date.getUTCHours()
            const mUTC = item.date.getUTCMinutes()
            const hasTime = !(hUTC === 0 && mUTC === 0)

            const timeLabel = hasTime
              ? ` at ${item.date.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' })}`
              : ''

            const payload = {
              title: '📅 Key Date Today',
              body: `${item.title} is scheduled for today${timeLabel}.`,
              tag: morningKey,
              url: '/important-dates',
            }

            for (const sub of subs) {
              const ok = await sendPushToSubscription(sub, payload)
              if (ok) sent++
              else errors++

              if (!ok) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
              }
            }
            markSent(morningKey)
          }

          // Individual event reminder (10 min before event time)
          const hUTC = item.date.getUTCHours()
          const mUTC = item.date.getUTCMinutes()
          if (hUTC === 0 && mUTC === 0) continue // date-only, no specific time

          const eventMs = item.date.getTime()
          const nowMs = now.getTime()
          const preEventMs = eventMs - 10 * 60 * 1000
          const graceMs = eventMs + 2 * 60 * 1000

          const indivKey = `push-keydate-individual:${item.id}:${todayKey}`
          if (!hasSent(indivKey) && nowMs >= preEventMs && nowMs <= graceMs) {
            const isBeforeEvent = nowMs < eventMs
            const timeStr = item.date.toLocaleTimeString('en-US', {
              timeZone: 'UTC',
              hour: 'numeric',
              minute: '2-digit',
            })

            const payload = {
              title: isBeforeEvent ? `⚡ ${item.title} — soon` : `🔔 ${item.title} — now`,
              body: isBeforeEvent
                ? `${item.title} starts at ${timeStr}.`
                : `${item.title} is starting now.`,
              tag: indivKey,
              url: '/important-dates',
            }

            for (const sub of subs) {
              const ok = await sendPushToSubscription(sub, payload)
              if (ok) sent++
              else errors++

              if (!ok) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
              }
            }
            markSent(indivKey)
          }
        }
      } catch (err) {
        console.error(`[PushCheck] Key dates check failed for user ${userId}:`, err)
        errors++
      }
    }
  } catch (err) {
    console.error('[PushCheck] Fatal error:', err)
    errors++
  }

  return { checked, sent, errors }
}

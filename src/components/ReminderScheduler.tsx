'use client'

import { useEffect, useRef } from 'react'
import { getRoutineBlocks } from '@/actions/routines'
import { getImportantDatesForDate } from '@/actions/importantDates'
import {
  getNotificationPermissionState,
  getReminderNotificationsEnabled,
  hasSentReminder,
  markReminderSent,
  showReminderNotification,
  getRoutineReminderLeadMins,
  getKeyDateReminderHour,
  getRoutineStartEnabled,
  getRoutinePreEnabled,
  getKeyDateSummaryEnabled,
  getKeyDateIndividualEnabled,
  getKeyDateIndividualLeadMins,
  ROUTINE_RELOAD_EVENT,
  registerPushServiceWorker,
  subscribeToPush,
  isPushSubscribed,
} from '@/lib/notifications'

type RoutineReminderBlock = {
  id: string
  task: string
  startMinutes: number
  notifyVersion: number
}

type ImportantDateReminderItem = {
  id: string
  title: string
  date: string | Date
}

const DATA_REFRESH_MS = 1000 * 60 * 1
const TICK_MS = 1000 * 10

const UTC_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toUTCDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromDateKeyToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function startDateFromMinutes(dateKey: string, startMinutes: number): Date {
  const startDate = fromDateKeyToLocalDate(dateKey)
  const hours = Math.floor(startMinutes / 60)
  const minutes = startMinutes % 60
  startDate.setHours(hours, minutes, 0, 0)
  return startDate
}

function endDateFromMinutes(dateKey: string, endMinutes: number): Date {
  const endDate = fromDateKeyToLocalDate(dateKey)
  const hours = Math.floor(endMinutes / 60)
  const minutes = endMinutes % 60
  endDate.setHours(hours, minutes, 0, 0)
  return endDate
}

function extractDateKey(value: string | Date): string {
  if (value instanceof Date) return toUTCDateKey(value)

  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10)
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return toUTCDateKey(parsed)
}

function extractTimeLabel(value: string | Date): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  const hUTC = parsed.getUTCHours()
  const mUTC = parsed.getUTCMinutes()
  if (hUTC === 0 && mUTC === 0) return null

  return UTC_TIME_FORMATTER.format(parsed)
}

export default function ReminderScheduler() {
  const routineBlocksRef = useRef<RoutineReminderBlock[]>([])
  const keyDatesRef = useRef<ImportantDateReminderItem[]>([])
  const lastFetchedAtRef = useRef<number>(0)
  const lastFetchedDateKeyRef = useRef<string>('')
  const tickInFlightRef = useRef(false)

  // Register service worker and auto-subscribe to push on mount
  useEffect(() => {
    const initPush = async () => {
      try {
        // Register the push SW
        await registerPushServiceWorker()

        // Auto-subscribe if reminders are enabled and permission is granted
        if (
          getReminderNotificationsEnabled() &&
          getNotificationPermissionState() === 'granted' &&
          !isPushSubscribed()
        ) {
          await subscribeToPush()
        }
      } catch (err) {
        console.warn('[ReminderScheduler] Push init error:', err)
      }
    }

    void initPush()
  }, [])

  useEffect(() => {
    let active = true

    const fetchReminderData = async (dateKey: string) => {
      const [routineResult, keyDates] = await Promise.all([
        getRoutineBlocks(dateKey),
        getImportantDatesForDate(dateKey),
      ])

      if (!active) return

      if ('error' in routineResult) {
        routineBlocksRef.current = []
      } else {
        routineBlocksRef.current = routineResult.data.map((block) => ({
          id: block.id,
          task: block.task,
          startMinutes: block.startMinutes,
          notifyVersion: (block as any).notifyVersion ?? 1,
        }))
      }

      keyDatesRef.current = keyDates.map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
      }))

      lastFetchedAtRef.current = Date.now()
      lastFetchedDateKeyRef.current = dateKey
    }

    const runTick = async () => {
      if (!active || tickInFlightRef.current) return
      tickInFlightRef.current = true

      try {
        if (!getReminderNotificationsEnabled()) return

        const permission = getNotificationPermissionState()
        if (permission !== 'granted') return

        const now = new Date()
        const nowMs = now.getTime()
        const todayKey = toLocalDateKey(now)

        const needsDataRefresh =
          todayKey !== lastFetchedDateKeyRef.current ||
          nowMs - lastFetchedAtRef.current > DATA_REFRESH_MS

        if (needsDataRefresh) {
          await fetchReminderData(todayKey)
        }

        const leadMins = getRoutineReminderLeadMins()
        const morningHour = getKeyDateReminderHour()
        const routineStartOn = getRoutineStartEnabled()
        const routinePreOn = getRoutinePreEnabled()
        const keyDateSummaryOn = getKeyDateSummaryEnabled()
        const keyDateIndividualOn = getKeyDateIndividualEnabled()
        const keyDateIndivLeadMins = getKeyDateIndividualLeadMins()

        for (const block of routineBlocksRef.current) {
          const startAt = startDateFromMinutes(todayKey, block.startMinutes)
          const startAtMs = startAt.getTime()
          const graceEndAtMs = startAtMs + (1000 * 60 * 30)
          const preStartAtMs = startAtMs - (leadMins * 60 * 1000)

          const preReminderKey = `routine-pre:${block.id}:v${block.notifyVersion}:${todayKey}`
          const startReminderKey = `routine-start:${block.id}:v${block.notifyVersion}:${todayKey}`

          // Pre-start notification (only if toggle is on and leadMins > 0)
          if (
            routinePreOn &&
            leadMins > 0 &&
            nowMs >= preStartAtMs &&
            nowMs < startAtMs &&
            !hasSentReminder(preReminderKey)
          ) {
            const sent = await showReminderNotification(
              `Routine in ${leadMins} minutes`,
              `${block.task} starts at ${startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
              preReminderKey
            )
            if (sent) markReminderSent(preReminderKey)
          }

          // Start notification (only if toggle is on)
          if (
            routineStartOn &&
            nowMs >= startAtMs &&
            nowMs < graceEndAtMs &&
            !hasSentReminder(startReminderKey)
          ) {
            const sent = await showReminderNotification(
              'Routine started',
              `${block.task} is starting now.`,
              startReminderKey
            )
            if (sent) markReminderSent(startReminderKey)
          }
        }

        for (const keyDate of keyDatesRef.current) {
          const keyDateKey = extractDateKey(keyDate.date)
          if (keyDateKey !== todayKey) continue

          // ── Daily summary notification ──
          if (keyDateSummaryOn) {
            const morningReminderAt = fromDateKeyToLocalDate(todayKey)
            morningReminderAt.setHours(morningHour, 0, 0, 0)

            const indicatorKey = `key-date-morning:${keyDate.id}:${todayKey}`
            if (nowMs >= morningReminderAt.getTime() && !hasSentReminder(indicatorKey)) {
              const timeLabel = extractTimeLabel(keyDate.date)
              const body = timeLabel
                ? `${keyDate.title} is scheduled for today at ${timeLabel}.`
                : `${keyDate.title} is scheduled for today.`

              const sent = await showReminderNotification('Key date reminder', body, indicatorKey)
              if (sent) markReminderSent(indicatorKey)
            }
          }

          // ── Individual event reminder (only for dates with a specific time) ──
          if (keyDateIndividualOn) {
            const parsed = new Date(keyDate.date)
            if (Number.isNaN(parsed.getTime())) continue

            const hUTC = parsed.getUTCHours()
            const mUTC = parsed.getUTCMinutes()
            // Skip if no specific time was set (midnight UTC = date-only)
            if (hUTC === 0 && mUTC === 0) continue

            // Convert the UTC event time to a local timestamp on today's date
            const eventLocalMs = parsed.getTime()
            const preEventMs = eventLocalMs - (keyDateIndivLeadMins * 60 * 1000)
            const graceEndMs = eventLocalMs + (1000 * 60 * 30)

            const indivKey = `key-date-individual:${keyDate.id}:${todayKey}`

            if (
              nowMs >= preEventMs &&
              nowMs < graceEndMs &&
              !hasSentReminder(indivKey)
            ) {
              const timeStr = parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const isBeforeEvent = nowMs < eventLocalMs
              const title = isBeforeEvent
                ? `Key date in ${keyDateIndivLeadMins} min`
                : `${keyDate.title} — now`
              const body = isBeforeEvent
                ? `${keyDate.title} starts at ${timeStr}.`
                : `${keyDate.title} is starting now.`

              const sent = await showReminderNotification(title, body, indivKey)
              if (sent) markReminderSent(indivKey)
            }
          }
        }
      } finally {
        tickInFlightRef.current = false
      }
    }

    void runTick()
    
    const onReload = () => {
      lastFetchedAtRef.current = 0 // Force re-fetch next tick
      void runTick()
    }
    
    window.addEventListener(ROUTINE_RELOAD_EVENT, onReload)

    const intervalId = window.setInterval(() => {
      void runTick()
    }, TICK_MS)

    return () => {
      active = false
      window.removeEventListener(ROUTINE_RELOAD_EVENT, onReload)
      window.clearInterval(intervalId)
    }
  }, [])

  return null
}

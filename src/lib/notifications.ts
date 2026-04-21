export const REMINDER_NOTIFICATIONS_ENABLED_KEY = 'mirror:reminder-notifications-enabled'
const SENT_REMINDERS_KEY = 'mirror:sent-reminder-notifications'
export const ROUTINE_LEAD_MINS_KEY = 'mirror:routine-reminder-lead-mins'
export const KEY_DATE_HOUR_KEY = 'mirror:key-date-reminder-hour'
export const ROUTINE_RELOAD_EVENT = 'mirror:routine-reload'
const SENT_REMINDER_TTL_MS = 1000 * 60 * 60 * 24 * 7

// Granular toggle keys
export const ROUTINE_START_ENABLED_KEY = 'mirror:routine-start-enabled'
export const ROUTINE_PRE_ENABLED_KEY = 'mirror:routine-pre-enabled'
export const KEY_DATE_SUMMARY_ENABLED_KEY = 'mirror:key-date-summary-enabled'
export const KEY_DATE_INDIVIDUAL_ENABLED_KEY = 'mirror:key-date-individual-enabled'
export const KEY_DATE_INDIVIDUAL_LEAD_MINS_KEY = 'mirror:key-date-individual-lead-mins'

type SentReminderMap = Record<string, number>

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

function supportsNotifications(): boolean {
  return hasWindow() && 'Notification' in window
}

function readSentReminders(): SentReminderMap {
  if (!hasWindow()) return {}

  try {
    const raw = localStorage.getItem(SENT_REMINDERS_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    const now = Date.now()
    const cleanedEntries = Object.entries(parsed).filter((entry) => {
      const [, value] = entry
      return typeof value === 'number' && now - value <= SENT_REMINDER_TTL_MS
    })

    const cleaned = Object.fromEntries(cleanedEntries) as SentReminderMap

    if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
      localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(cleaned))
    }

    return cleaned
  } catch {
    return {}
  }
}

function writeSentReminders(data: SentReminderMap) {
  if (!hasWindow()) return

  try {
    localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(data))
  } catch {
    // Swallow storage write errors (private mode/storage quota issues).
  }
}

export function getReminderNotificationsEnabled(): boolean {
  if (!hasWindow()) return true

  try {
    const stored = localStorage.getItem(REMINDER_NOTIFICATIONS_ENABLED_KEY)
    if (stored === null) return true
    return stored === 'true'
  } catch {
    return true
  }
}

export function setReminderNotificationsEnabled(enabled: boolean) {
  if (!hasWindow()) return

  try {
    localStorage.setItem(REMINDER_NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // Swallow storage write errors (private mode/storage quota issues).
  }
}

export function getRoutineReminderLeadMins(): number {
  if (!hasWindow()) return 10
  try {
    const stored = localStorage.getItem(ROUTINE_LEAD_MINS_KEY)
    if (stored === null) return 10
    return parseInt(stored, 10)
  } catch {
    return 10
  }
}

export function setRoutineReminderLeadMins(mins: number) {
  if (!hasWindow()) return
  try {
    localStorage.setItem(ROUTINE_LEAD_MINS_KEY, mins.toString())
  } catch {}
}

export function getKeyDateReminderHour(): number {
  if (!hasWindow()) return 6
  try {
    const stored = localStorage.getItem(KEY_DATE_HOUR_KEY)
    if (stored === null) return 6
    return parseInt(stored, 10)
  } catch {
    return 6
  }
}

export function setKeyDateReminderHour(hour: number) {
  if (!hasWindow()) return
  try {
    localStorage.setItem(KEY_DATE_HOUR_KEY, hour.toString())
  } catch {}
}

// --- Granular toggle getters/setters ---

function getBoolSetting(key: string, fallback: boolean): boolean {
  if (!hasWindow()) return fallback
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return fallback
    return stored === 'true'
  } catch {
    return fallback
  }
}

function setBoolSetting(key: string, value: boolean) {
  if (!hasWindow()) return
  try {
    localStorage.setItem(key, value ? 'true' : 'false')
  } catch {}
}

function getIntSetting(key: string, fallback: number): number {
  if (!hasWindow()) return fallback
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return fallback
    return parseInt(stored, 10)
  } catch {
    return fallback
  }
}

function setIntSetting(key: string, value: number) {
  if (!hasWindow()) return
  try {
    localStorage.setItem(key, value.toString())
  } catch {}
}

export function getRoutineStartEnabled(): boolean {
  return getBoolSetting(ROUTINE_START_ENABLED_KEY, true)
}
export function setRoutineStartEnabled(v: boolean) {
  setBoolSetting(ROUTINE_START_ENABLED_KEY, v)
}

export function getRoutinePreEnabled(): boolean {
  return getBoolSetting(ROUTINE_PRE_ENABLED_KEY, true)
}
export function setRoutinePreEnabled(v: boolean) {
  setBoolSetting(ROUTINE_PRE_ENABLED_KEY, v)
}

export function getKeyDateSummaryEnabled(): boolean {
  return getBoolSetting(KEY_DATE_SUMMARY_ENABLED_KEY, true)
}
export function setKeyDateSummaryEnabled(v: boolean) {
  setBoolSetting(KEY_DATE_SUMMARY_ENABLED_KEY, v)
}

export function getKeyDateIndividualEnabled(): boolean {
  return getBoolSetting(KEY_DATE_INDIVIDUAL_ENABLED_KEY, true)
}
export function setKeyDateIndividualEnabled(v: boolean) {
  setBoolSetting(KEY_DATE_INDIVIDUAL_ENABLED_KEY, v)
}

export function getKeyDateIndividualLeadMins(): number {
  return getIntSetting(KEY_DATE_INDIVIDUAL_LEAD_MINS_KEY, 10)
}
export function setKeyDateIndividualLeadMins(mins: number) {
  setIntSetting(KEY_DATE_INDIVIDUAL_LEAD_MINS_KEY, mins)
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!supportsNotifications()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!supportsNotifications()) return 'unsupported'

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }

  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function hasSentReminder(reminderKey: string): boolean {
  const sent = readSentReminders()
  return typeof sent[reminderKey] === 'number'
}

export function markReminderSent(reminderKey: string) {
  const sent = readSentReminders()
  sent[reminderKey] = Date.now()
  writeSentReminders(sent)
}

let activeNotifications: Notification[] = []

export async function showReminderNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (!supportsNotifications()) return false
  if (Notification.permission !== 'granted') return false

  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    requireInteraction: true,
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, options)
        return true
      }
      console.warn('[Notifications] No service worker registration found.')
    }

    const n = new Notification(title, options)
    activeNotifications.push(n)
    n.onclose = () => {
      activeNotifications = activeNotifications.filter((x) => x !== n)
    }
    return true
  } catch (error) {
    console.error('[Notifications] Failed to show notification:', error)
    return false
  }
}

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

// ═══════════════════════════════════════════════
// PUSH SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════

const PUSH_SUBSCRIBED_KEY = 'mirror:push-subscribed'

export function isPushSubscribed(): boolean {
  if (!hasWindow()) return false
  try {
    return localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true'
  } catch {
    return false
  }
}

function setPushSubscribedFlag(subscribed: boolean) {
  if (!hasWindow()) return
  try {
    localStorage.setItem(PUSH_SUBSCRIBED_KEY, subscribed ? 'true' : 'false')
  } catch {}
}

/**
 * Register the push service worker.
 * In dev mode, we register our own push-sw.js.
 * In production, the next-pwa generated SW handles push via worker/index.ts.
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!hasWindow() || !('serviceWorker' in navigator)) return null

  try {
    // Check if a service worker is already registered
    let registration = await navigator.serviceWorker.getRegistration('/')
    if (registration) {
      return registration
    }

    // Register our push service worker
    registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    console.log('[Push] Service worker registered successfully.')
    return registration
  } catch (error) {
    console.error('[Push] Failed to register service worker:', error)
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe the browser to push notifications and store the subscription on the server.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!hasWindow() || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Push notifications not supported in this browser.')
    return false
  }

  try {
    const registration = await registerPushServiceWorker()
    if (!registration) return false

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[Push] VAPID public key not configured.')
        return false
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }

    // Get subscription keys
    const p256dh = subscription.getKey('p256dh')
    const auth = subscription.getKey('auth')

    if (!p256dh || !auth) {
      console.error('[Push] Missing subscription keys.')
      return false
    }

    // Send subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }),
    })

    if (!response.ok) {
      console.error('[Push] Failed to save subscription on server.')
      return false
    }

    setPushSubscribedFlag(true)
    console.log('[Push] Successfully subscribed to push notifications.')
    return true
  } catch (error) {
    console.error('[Push] Subscription error:', error)
    return false
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!hasWindow() || !('serviceWorker' in navigator)) return false

  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    if (!registration) return true

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      setPushSubscribedFlag(false)
      return true
    }

    // Unsubscribe from browser
    await subscription.unsubscribe()

    // Remove from server
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {})

    setPushSubscribedFlag(false)
    console.log('[Push] Successfully unsubscribed from push notifications.')
    return true
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error)
    return false
  }
}

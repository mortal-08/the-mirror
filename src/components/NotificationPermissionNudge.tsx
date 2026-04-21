'use client'

import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import {
  getNotificationPermissionState,
  getReminderNotificationsEnabled,
  requestNotificationPermission,
} from '@/lib/notifications'

const DISMISS_KEY = 'mirror:notifications-nudge-dismissed'

function getIsDismissedInitially(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

function setDismissed(value: boolean) {
  if (typeof window === 'undefined') return

  try {
    if (value) window.localStorage.setItem(DISMISS_KEY, 'true')
    else window.localStorage.removeItem(DISMISS_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export default function NotificationPermissionNudge() {
  const { toast } = useToast()
  const [dismissed, setDismissedState] = useState<boolean>(() => getIsDismissedInitially())
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermissionState())
  const [isRequesting, setIsRequesting] = useState(false)

  const remindersEnabled = getReminderNotificationsEnabled()

  if (!remindersEnabled || dismissed || permission === 'granted') return null

  const isUnsupported = permission === 'unsupported'
  const isDenied = permission === 'denied'

  const handleDismiss = () => {
    setDismissedState(true)
    setDismissed(true)
  }

  const handleEnable = async () => {
    setIsRequesting(true)
    const nextPermission = await requestNotificationPermission()
    setPermission(nextPermission)
    setIsRequesting(false)

    if (nextPermission === 'granted') {
      setDismissed(false)
      toast('Device notifications enabled.', 'success')
      return
    }

    if (nextPermission === 'denied') {
      toast('Notification permission was denied. You can re-enable it from browser settings.', 'error')
      return
    }

    toast('Notification permission was not granted yet.', 'info')
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        width: 'min(360px, calc(100vw - 2rem))',
        zIndex: 400,
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: '14px',
        padding: '0.9rem',
        boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-primary)',
            color: 'var(--text-inverse)',
            flexShrink: 0,
          }}
        >
          <Bell size={14} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Enable reminder notifications
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {isUnsupported
              ? 'Notifications are unavailable here. Use localhost or HTTPS (or install the PWA) to receive device reminders.'
              : isDenied
                ? 'Notifications are blocked in this browser. Re-enable site notifications in browser settings.'
                : 'Turn on notifications to receive routine and key-date alerts on this device.'}
          </div>

          {!isUnsupported && !isDenied && (
            <button
              type="button"
              onClick={handleEnable}
              disabled={isRequesting}
              style={{
                marginTop: '0.65rem',
                border: 'none',
                borderRadius: '10px',
                padding: '0.45rem 0.8rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: 'var(--accent-primary)',
                color: 'var(--text-inverse)',
                cursor: isRequesting ? 'not-allowed' : 'pointer',
                opacity: isRequesting ? 0.75 : 1,
              }}
            >
              {isRequesting ? 'Requesting...' : 'Enable notifications'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            width: 24,
            height: 24,
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-label="Dismiss notification prompt"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

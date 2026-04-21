import webpush from 'web-push'

let initialized = false

function ensureInitialized() {
  if (initialized) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID keys not configured — push notifications will not work.')
    return
  }

  webpush.setVapidDetails('mailto:mirror@localhost', publicKey, privateKey)
  initialized = true
}

export { webpush }

export type PushPayload = {
  title: string
  body: string
  tag?: string
  icon?: string
  url?: string
}

export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  ensureInitialized()

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 } // 1 hour TTL
    )
    return true
  } catch (error: any) {
    // 404 or 410 means subscription is expired/invalid
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      console.warn('[WebPush] Subscription expired:', subscription.endpoint.slice(0, 60))
      return false
    }
    console.error('[WebPush] Failed to send:', error?.message || error)
    return false
  }
}

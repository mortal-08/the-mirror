import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!

webpush.setVapidDetails(
  'mailto:mirror@localhost',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

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

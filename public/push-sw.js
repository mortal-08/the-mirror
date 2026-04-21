// Push Notification Service Worker
// This service worker handles push events and shows notifications
// even when the app/tab is closed.

self.addEventListener('push', function (event) {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: 'Mirror Reminder',
      body: event.data.text(),
    }
  }

  const title = payload.title || 'Mirror Reminder'
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'mirror-push',
    requireInteraction: true,
    data: {
      url: payload.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})

// Activate immediately
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

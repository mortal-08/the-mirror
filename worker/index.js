// Custom worker code bundled into the production service worker by @ducanh2912/next-pwa
// This handles push events when using the PWA in production (built) mode.

self.addEventListener('push', function (event) {
  if (!event.data) return

  var payload
  try {
    payload = event.data.json()
  } catch (e) {
    payload = {
      title: 'Mirror Reminder',
      body: event.data.text(),
    }
  }

  var title = payload.title || 'Mirror Reminder'
  var options = {
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

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  var urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})

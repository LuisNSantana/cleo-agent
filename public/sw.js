// Minimal service worker for PWA installability and future push support
// Cache shell can be added later if needed; for now, keep it simple.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Placeholder for push events (to be implemented in notifications task)
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {}
    const title = data.title || 'Cleo'
    const options = {
      body: data.body || 'Nueva notificación',
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      data: data.data || {},
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (e) {
    // ignore
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.some((client) => {
        if ('focus' in client) client.focus()
        return false
      })
      if (!hadWindow && self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

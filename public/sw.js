const CACHE_NAME = 'mi-dia-shell-v3'
const APP_SHELL = ['/offline.html', '/offline-en.html', '/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg', '/icon-maskable.svg']
const STATIC_PATHS = new Set(['/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg', '/icon-maskable.svg'])

function isCacheableAsset(url) {
  return url.pathname.startsWith('/_next/static/') || STATIC_PATHS.has(url.pathname)
}

function getOfflineFallback(url) {
  return caches.match(url.pathname.startsWith('/en') ? '/offline-en.html' : '/offline.html')
}

function getNavigationCacheKey(requestUrl) {
  return new Request(`${requestUrl.origin}${requestUrl.pathname}`)
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((cacheName) => cacheName.startsWith('mi-dia-') && cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('push', (event) => {
  const payload = event.data?.json() || { title: 'Mi Día', body: 'Tienes un recordatorio pendiente.' }
  event.waitUntil(self.registration.showNotification(payload.title || 'Mi Día', {
    body: payload.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: { taskId: payload.taskId, locale: payload.locale === 'en' ? 'en' : 'es' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    const existing = windowClients.find((client) => 'focus' in client)
    const locale = event.notification.data?.locale || existing?.url.match(/\/(en|es)(?:\/|$)/)?.[1] || 'es'
    const taskId = event.notification.data?.taskId
    const taskPath = `/${locale}/tasks${taskId ? `?task_id=${encodeURIComponent(taskId)}` : ''}`
    if (existing && 'navigate' in existing) return existing.navigate(taskPath).then(() => existing.focus())
    return clients.openWindow(taskPath)
  }))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return
  if (event.request.mode === 'navigate') {
    const cacheKey = getNavigationCacheKey(requestUrl)
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy)))
      }
      return response
    }).catch(() => caches.match(cacheKey).then((cached) => cached || getOfflineFallback(requestUrl))))
    return
  }
  if (!isCacheableAsset(requestUrl)) return
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      return response
    }))
  )
})
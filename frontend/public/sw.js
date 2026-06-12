/* LifeCare+ — service worker for medicine reminder notifications */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'MED_REMINDER') return;
  const { title, body, tag } = data;
  event.waitUntil(
    self.registration.showNotification(title || 'Medicine reminder', {
      body: body || 'Time to take your medicine',
      icon: '/lifecare-icon.svg',
      badge: '/lifecare-icon.svg',
      tag: tag || 'med-reminder',
      requireInteraction: true,
    })
  );
});

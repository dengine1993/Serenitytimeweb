// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  let data = {
    title: 'Восход',
    body: 'У вас новое уведомление',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {}
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Error parsing push data', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ],
    requireInteraction: false,
    tag: 'notification-' + Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/app') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/app';
        return clients.openWindow(url);
      }
    })
  );
});

// Re-subscribe via app: ask the running client to re-fetch VAPID key
// and call pushManager.subscribe with a real key. SW cannot fetch a
// dynamic key reliably, so we delegate to the page.
self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      clientList.forEach(function(client) {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    })
  );
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data.json();
    const { title, body, url } = data;

    const options = {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url || '/league' }
    };

    event.waitUntil(self.registration.showNotification(title || 'Quiz Arena', options));
  } catch (err) {
    console.error('Push event error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/league', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

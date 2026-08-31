// Service Worker — notificaciones push de Epikom Hub

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: "Epikom Hub", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Epikom Hub", {
      body: payload.body ?? "",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: payload.tag ?? "epikom-hub",
      data: { url: payload.url ?? "/" },
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Si el Hub ya está abierto, enfocarlo
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

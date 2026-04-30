// Epikom Hub service worker — Web Push handler.
// Registrado por el cliente cuando el usuario activa notificaciones.

self.addEventListener("install", (event) => {
  // Activar inmediatamente sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Epikom Hub", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Epikom Hub";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "epikom-hub",
    data: { url: payload.url || "/dashboard" },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una pestaña abierta del hub, enfócala y navega
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});

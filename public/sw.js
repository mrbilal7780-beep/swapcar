// Service worker TORQUE : affiche les notifications et ouvre la bonne page au clic.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "TORQUE", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      // Si l'app est ouverte et visible, la cloche intégrée suffit : pas de doublon.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((c) => c.visibilityState === "visible" && c.focused)) return;

      await self.registration.showNotification(data.title || "TORQUE", {
        body: data.body || "",
        icon: data.icon || "/torque-icon-192.png",
        badge: "/torque-badge-96.png",
        tag: data.tag || undefined,
        renotify: !!data.tag,
        data: { url: data.url || "/" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try { await client.navigate(url); } catch (e) { /* ignore */ }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

// Loaded into the generated service worker (see workbox.importScripts in vite.config.ts).
// Tapping a reminder focuses the open app, or opens it if it isn't running.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => "focus" in client);
      return open ? open.focus() : self.clients.openWindow("/");
    }),
  );
});

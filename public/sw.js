const CACHE_NAME = "clarionot-static-v2";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/android-chrome-192x192.png",
  "/icons/android-chrome-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Sadece aynı origin
  if (url.origin !== self.location.origin) return;

  // Next.js chunklarını ASLA cache'leme
  if (url.pathname.startsWith("/_next/")) return;

  // Sayfa gezintilerini (HTML) cache'leme
  if (req.mode === "navigate") return;

  // Diğer GET'lerde cache-first
  if (req.method === "GET") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        });
      })
    );
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "ClarioNot";
  const options = {
    body: data.body || "Unutulan bir kayıt tekrar işine yarayabilir.",
    icon: "/icons/android-chrome-192x192.png",
    badge: "/icons/android-chrome-192x192.png",
    tag: data.tag || "clarionot-reminder",
    data: {
      url: data.url || "/dashboard?view=forgotten",
      itemId: data.itemId || null,
      kind: data.kind || "forgotten_item",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard?view=forgotten";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

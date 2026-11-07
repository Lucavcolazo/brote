// Brote service worker: notificaciones push y caché de las fotos del feed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ---------- fotos del feed ----------
// Cada foto tiene una ruta única que nunca cambia, pero la URL firmada trae un token nuevo en
// cada carga. Guardamos la foto por su ruta (sin el token), así se baja una sola vez por celu.
const PHOTO_CACHE = "brote-photos-v1";
const PHOTO_PATH = "/storage/v1/object/sign/meal-photos/";
const PHOTO_LIMIT = 150; // ~3 semanas de fotos de los dos; las más viejas se van solas

async function trimPhotos() {
  const cache = await caches.open(PHOTO_CACHE);
  const keys = await cache.keys();
  for (const req of keys.slice(0, Math.max(0, keys.length - PHOTO_LIMIT))) await cache.delete(req);
}

async function photo(request) {
  const url = new URL(request.url);
  const key = url.origin + url.pathname;
  const cache = await caches.open(PHOTO_CACHE);
  const hit = await cache.match(key);
  if (hit) return hit;
  // Pedido CORS para poder ver el estado y no guardar errores (Supabase Storage manda CORS).
  const res = await fetch(request.url, { mode: "cors", credentials: "omit" });
  if (res.ok) {
    await cache.put(key, res.clone());
    trimPhotos();
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.includes(PHOTO_PATH)) return;
  event.respondWith(photo(req).catch(() => fetch(req)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "Brote", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          client.postMessage({ type: "open", url });
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

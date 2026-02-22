/* eslint-disable no-restricted-globals */

// ===============================
// Polsek PWA Service Worker
// Fix: jangan cache manifest & icons (biar ikon PWA tidak fallback "W")
// + FIX PUSH: paksa notifikasi muncul + logging + vibrate + requireInteraction
// ===============================

// 🔁 Naikkan versi cache setiap ada perubahan agar cache lama bersih
// ✅ DIUBAH: v6 -> v7
const CACHE_NAME = 'polsek-pwa-cache-v7';

// Daftar file awal untuk dicache (app shell)
const urlsToCache = [
  '/',
  '/index.html',

  // UI assets opsional (kalau dipakai di halaman)
  '/Lambang_Polri.png',

  // ❗ Tidak wajib precache ikon PWA, tapi boleh.
  // Namun fetch handler di bawah tetap memaksa ikon PWA ambil dari network.
  '/pwa-192.png',
  '/pwa-512.png',
];

// Helper: cek bypass cache untuk file “identitas PWA”
function shouldBypassCache(url) {
  const path = url.pathname;

  return (
    path === '/manifest.json' ||
    path === '/favicon.ico' ||
    path === '/pwa-192.png' ||
    path === '/pwa-512.png' ||
    path === '/logo192.png' || // kalau masih ada, biar aman
    path === '/logo512.png' || // kalau masih ada, biar aman
    path.startsWith('/icons/') // kalau kamu pakai folder icons
  );
}

// ---- Install: cache file statis awal ----
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

// ---- Activate: bersihkan cache lama ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n === CACHE_NAME ? null : caches.delete(n))))
    )
  );
  self.clients.claim();
});

// ---- Fetch ----
// - manifest & icons: ALWAYS network (biar selalu fresh, tidak fallback "W")
// - file lain: cache-first (punya kamu sebelumnya)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // hanya GET & same-origin
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // ✅ Bypass cache untuk manifest & icons
  if (shouldBypassCache(url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  // ✅ Cache-first untuk sisanya
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;

        // hindari cache API
        if (!req.url.includes('/api/')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});

// ---- Push: tampilkan notifikasi ----
// ✅ DIUBAH: tambah logging + parsing aman + requireInteraction + vibrate
self.addEventListener('push', (event) => {
  // log agar bisa dicek di DevTools (Service Worker console)
  try {
    console.log('[SW] PUSH EVENT RECEIVED');
  } catch (_) {}

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // kalau payload bukan JSON, coba ambil text
    try {
      const txt = event.data ? event.data.text() : '';
      data = { title: 'Notifikasi', body: txt || 'Ada pembaruan baru.', url: '/' };
    } catch (_) {
      data = {};
    }
  }

  const title = data.title || 'Notifikasi Baru';
  const options = {
    body: data.body || 'Ada pembaruan baru.',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',

    // ✅ bikin notif “lebih terasa”
    requireInteraction: true, // notif tidak langsung hilang
    vibrate: [200, 100, 200], // getar (kalau device support)
    silent: false,

    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---- Klik notifikasi: buka/fokus tab target ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target = new URL(url, self.location.origin).href;

      // ✅ kalau ada tab yang URL-nya “dimulai” target (biar cocok SPA / querystring)
      const hit = all.find((c) => c.url === target || c.url.startsWith(target));
      if (hit) return hit.focus();

      return clients.openWindow(target);
    })()
  );
});
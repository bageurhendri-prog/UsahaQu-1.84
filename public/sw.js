/**
 * UsahaQu v1.83 - PWA Service Worker (Update Resilience & Data Protection)
 * 
 * Strategi Caching: Stale-While-Revalidate untuk file app (HTML, CSS, JS, SVG, Fonts).
 * 
 * KEAMANAN DATA MUTLAK (UPDATE PROTECTION):
 * - Saat Service Worker versi baru diinstal atau diperbarui, proses aktivasi
 *   HANYA membersihkan cache aset lama (CacheStorage).
 * - SAMA SEKALI TIDAK PERNAH menghapus / mereset IndexedDB (UsahaQu_v183_LocalDB,
 *   pos_catalog, pos_transactions) maupun LocalStorage (data transaksi & lisensi).
 */

const CACHE_NAME = 'usahaqu-v183-cache-v1';

// File shell utama aplikasi yang di-precache
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/usahaku.html',
  '/js/posCore.js',
  '/js/indexedDbManager.js',
  '/js/backupRestore.js',
  '/js/licenseEngine.js'
];

// 1. Install Event: Pre-cache static shell & skipWaiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[UsahaQu SW] Pre-caching Core App Shell...');
      try {
        await cache.addAll(APP_SHELL_ASSETS);
      } catch (err) {
        console.warn('[UsahaQu SW] Pre-caching partial fail (will cache on demand):', err);
      }
    })
  );
  // Langsung aktif tanpa menunggu tab lama ditutup
  self.skipWaiting();
});

// 2. Activate Event: Clean old caches ONLY. NEVER TOUCH IndexedDB / LocalStorage!
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((existingCache) => {
          if (existingCache !== CACHE_NAME && existingCache.startsWith('usahaqu-')) {
            console.log('[UsahaQu SW] Membersihkan cache aset versi lama:', existingCache);
            return caches.delete(existingCache);
          }
          return null;
        })
      );
    }).then(() => {
      console.log('[UsahaQu SW] Update Selesai. Seluruh data IndexedDB & Transaksi Lokal TETAP AMAN 100%.');
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event: Stale-While-Revalidate untuk App Assets, Bypass untuk /api/*
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache endpoint backend TriPay / Serverless API (/api/*)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Hanya tangani metode GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Cek versi cache terlebih dahulu
      const cachedResponse = await cache.match(event.request);

      // 2. Lakukan fetch ke jaringan secara paralel di latar belakang (revalidate)
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Simpan respons jaringan baru ke cache jika respons valid (200)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch((err) => {
          // Offline / jaringan terputus
          return null;
        });

      // 3. Jika cache tersedia, kembalikan langsung (Stale-While-Revalidate)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika belum ada di cache, tunggu respon jaringan
      const networkResponse = await fetchPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // Fallback jika offline total dan mencari HTML
      if (event.request.mode === 'navigate') {
        const fallback = await cache.match('/index.html');
        if (fallback) return fallback;
      }

      return new Response('Offline: Data sedang dimuat dari IndexedDB lokal.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
      });
    })
  );
});

// 4. Message Event: Mendukung trigger SKIP_WAITING dari UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

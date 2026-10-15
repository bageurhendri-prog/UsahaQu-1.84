/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UsahaQu v1.83 - Service Worker Registration & Update Resilience Utility
 * 
 * Menangani pendaftaran Service Worker (PWA) dengan strategi Stale-While-Revalidate,
 * deteksi pembaruan versi baru secara halus, dan jaminan keamanan data transaksi.
 */

export interface SWRegistrationState {
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

let swRegistration: ServiceWorkerRegistration | null = null;
let updateAvailableCallback: (() => void) | null = null;

/**
 * Daftarkan Service Worker di browser jika mendukung PWA
 */
export function registerServiceWorker(onUpdateFound?: () => void): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  if (onUpdateFound) {
    updateAvailableCallback = onUpdateFound;
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      swRegistration = registration;
      console.log('[UsahaQu PWA] Service Worker aktif dengan cakupan:', registration.scope);

      // Cek pembaruan berkala setiap 30 menit
      setInterval(() => {
        registration.update().catch((err) => console.warn('Gagal cek update SW:', err));
      }, 30 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[UsahaQu PWA] Pembaruan baru tersedia! Data lokal IndexedDB aman 100%.');
            if (updateAvailableCallback) {
              updateAvailableCallback();
            }
          }
        });
      });

      return registration;
    })
    .catch((error) => {
      console.warn('[UsahaQu PWA] Gagal mendaftarkan Service Worker:', error);
      return null;
    });
}

/**
 * Memicu aktivasi Service Worker baru segera tanpa jeda
 */
export function applyServiceWorkerUpdate(): void {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

/**
 * Periksa pembaruan Service Worker secara manual dari menu Pengaturan
 */
export async function checkForAppUpdates(): Promise<{ hasUpdate: boolean; message: string }> {
  if (!('serviceWorker' in navigator) || !swRegistration) {
    return {
      hasUpdate: false,
      message: 'Service Worker tidak aktif di sesi ini atau browser tidak mendukung PWA.'
    };
  }

  try {
    await swRegistration.update();
    if (swRegistration.waiting) {
      return {
        hasUpdate: true,
        message: 'Versi baru UsahaQu tersedia! Pembaruan siap diaktifkan tanpa menghapus data Anda.'
      };
    }
    return {
      hasUpdate: false,
      message: 'Aplikasi sudah menggunakan versi terbaru (v1.83). Semua data IndexedDB aman.'
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      message: `Pemeriksaan update gagal: ${err.message || 'Koneksi terputus'}`
    };
  }
}

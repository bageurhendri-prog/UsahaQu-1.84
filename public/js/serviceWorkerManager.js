/**
 * UsahaQu v1.83 - Service Worker Registration (Vanilla JS)
 */

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[UsahaQu] Service Worker terdaftar:', reg.scope);
        })
        .catch((err) => {
          console.warn('[UsahaQu] SW registration fail:', err);
        });
    });
  }
}

/**
 * UsahaQu v1.83 - Modul Backup & Restore Manual (JSON) & Testing Simulator
 * Vanilla JavaScript ES6 Module untuk Standalone & Web Worker / POS Core
 * 
 * Fitur:
 * 1. exportDataToJSON(autoDownload): Mengambil seluruh data IndexedDB & Lisensi ke file .json
 * 2. importDataFromJSON(fileOrData): Memulihkan seluruh data ke IndexedDB tanpa merusak struktur
 * 3. simulateExpireTrial(): Memajukan trial_ends_at ke masa lalu (uji auto-downgrade ke free_lifetime)
 * 4. simulatePaymentSuccess(): Mengubah lisensi lokal langsung ke 'pro_active' (uji pembukaan modul)
 * 5. resetTrialSimulation(): Reset ke trial 10 hari baru
 */

import { openDatabase, getAllItems, bulkAddItems, clearStore, STORES, DB_NAME, DB_VERSION } from './indexedDbManager.js';
import { getLicense, saveLicense, LICENSE_STORAGE_KEY } from './licenseEngine.js';

/**
 * 1. exportDataToJSON()
 * Mengambil seluruh isi IndexedDB (Master Data, Transaksi, Lisensi) dan mengunduhnya sebagai file .json
 */
export async function exportDataToJSON(autoDownload = true) {
  const license = getLicense();
  await openDatabase();

  const allStoreNames = Object.values(STORES);
  const storesData = {};
  const storesSummary = {};
  let totalRecords = 0;

  for (const storeName of allStoreNames) {
    try {
      const items = await getAllItems(storeName);
      storesData[storeName] = items;
      storesSummary[storeName] = items.length;
      totalRecords += items.length;
    } catch (err) {
      console.warn(`[Backup] Gagal membaca ${storeName}:`, err);
      storesData[storeName] = [];
      storesSummary[storeName] = 0;
    }
  }

  // Ambil data konfigurasi LocalStorage penting
  const localStorageKeys = [
    'usahaqu_device_id',
    'usahaqu_type',
    'bq_theme',
    'bq_profile',
    'bq_permissions',
    'bq_branches'
  ];
  const localStorageData = {};
  for (const key of localStorageKeys) {
    const val = localStorage.getItem(key);
    if (val !== null) localStorageData[key] = val;
  }

  const payload = {
    app: 'UsahaQu v1.83 - Master Ecosystem',
    app_version: '1.83',
    export_timestamp: new Date().toISOString(),
    device_id: license.device_id,
    license,
    local_storage: localStorageData,
    db_name: DB_NAME,
    db_version: DB_VERSION,
    total_records: totalRecords,
    stores_summary: storesSummary,
    data: storesData
  };

  if (autoDownload && typeof window !== 'undefined') {
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `usahaqu_backup_${dateFormatted}.json`;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }

  return payload;
}

/**
 * 2. importDataFromJSON()
 * Membaca file JSON cadangan dan memulihkan seluruh tabel IndexedDB tanpa merusak struktur database.
 */
export async function importDataFromJSON(fileOrData) {
  let parsedPayload;

  if (fileOrData instanceof File) {
    const text = await fileOrData.text();
    parsedPayload = JSON.parse(text);
  } else if (typeof fileOrData === 'string') {
    parsedPayload = JSON.parse(fileOrData);
  } else {
    parsedPayload = fileOrData;
  }

  if (!parsedPayload || (!parsedPayload.data && !parsedPayload.pos_catalog && !parsedPayload.queues)) {
    throw new Error('Format berkas JSON cadangan tidak valid atau tidak dikenali.');
  }

  const dataContainer = parsedPayload.data || parsedPayload;
  const storesRestored = {};
  let totalRestored = 0;

  await openDatabase();
  const allStoreNames = Object.values(STORES);

  for (const storeName of allStoreNames) {
    const items = dataContainer[storeName];
    if (Array.isArray(items) && items.length > 0) {
      try {
        await clearStore(storeName);
        await bulkAddItems(storeName, items);
        storesRestored[storeName] = items.length;
        totalRestored += items.length;
      } catch (err) {
        console.error(`[Restore] Gagal memulihkan tabel ${storeName}:`, err);
      }
    }
  }

  // Restore lisensi jika tersedia
  let licenseRestored = false;
  if (parsedPayload.license && typeof parsedPayload.license === 'object') {
    saveLicense(parsedPayload.license);
    licenseRestored = true;
  }

  // Restore preferensi local storage
  if (parsedPayload.local_storage && typeof parsedPayload.local_storage === 'object') {
    for (const [k, v] of Object.entries(parsedPayload.local_storage)) {
      if (typeof v === 'string') localStorage.setItem(k, v);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('usahaqu:license-updated', { 
      detail: { source: 'backup_restore', timestamp: new Date().toISOString() } 
    }));
    window.dispatchEvent(new CustomEvent('usahaqu:data-restored', { 
      detail: { totalRestored, storesRestored } 
    }));
  }

  return {
    success: true,
    message: `Berhasil memulihkan ${totalRestored} data ke dalam IndexedDB tanpa merusak struktur database!`,
    totalRestored,
    storesRestored,
    licenseRestored,
    timestamp: new Date().toISOString()
  };
}

/**
 * 3. Simulator Uji Coba Status Lisensi
 */

/**
 * simulateExpireTrial():
 * Memajukan tanggal trial_ends_at ke masa lalu untuk menguji fungsi auto-downgrade ke 'free_lifetime'.
 */
export function simulateExpireTrial() {
  const license = getLicense();
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 hari lalu

  license.is_paid = false;
  license.trial_ends_at = pastDate.toISOString();
  license.status = 'free_lifetime';
  license.paid_expires_at = null;
  license.last_validated_at = new Date().toISOString();

  saveLicense(license);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('usahaqu:license-updated', {
      detail: { 
        action: 'simulate_expire_trial', 
        status: 'free_lifetime',
        primary_module: license.selected_primary_module,
        license 
      }
    }));
  }

  return license;
}

/**
 * simulatePaymentSuccess():
 * Mengubah lisensi lokal langsung ke 'paid_plan' / 'pro_active' untuk menguji pembukaan seluruh modul.
 */
export function simulatePaymentSuccess(packageName = 'Paket Ultimate All Modul', durationMonths = 12) {
  const license = getLicense();
  const now = new Date();
  const expireDate = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

  license.is_paid = true;
  license.status = 'pro_active';
  license.paid_tier = 'corporate';
  license.paid_expires_at = expireDate.toISOString();
  license.license_key = `SIM-TRIPAY-${Date.now().toString(36).toUpperCase()}`;
  license.last_validated_at = now.toISOString();

  saveLicense(license);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('usahaqu:license-updated', {
      detail: { 
        action: 'simulate_payment_success', 
        packageName, 
        status: 'pro_active', 
        license 
      }
    }));
  }

  return license;
}

/**
 * resetTrialSimulation():
 * Mengembalikan masa uji coba ke 10 hari baru.
 */
export function resetTrialSimulation() {
  const license = getLicense();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  license.is_paid = false;
  license.status = 'trial';
  license.registered_at = now.toISOString();
  license.trial_ends_at = trialEnd.toISOString();
  license.paid_expires_at = null;
  license.license_key = null;
  license.last_validated_at = now.toISOString();

  saveLicense(license);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('usahaqu:license-updated', {
      detail: { action: 'reset_trial', status: 'trial', license }
    }));
  }

  return license;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UsahaQu v1.83 - Modul Backup & Restore Manual (JSON) & Testing Simulator
 * 1. exportDataToJSON(): Mengambil seluruh isi IndexedDB (19 Master Data + POS Core)
 *    beserta metadata lisensi & preferensi ke dalam berkas .json terformat.
 * 2. importDataFromJSON(file): Membaca berkas JSON dan memulihkan seluruh tabel
 *    IndexedDB tanpa merusak struktur database.
 * 3. Simulator Uji Coba Status Lisensi:
 *    - simulateExpireTrial(): Memajukan trial_ends_at ke masa lalu (uji auto-downgrade).
 *    - simulatePaymentSuccess(): Mengubah lisensi ke 'pro_active' / 'paid_plan'.
 */

import { 
  openDatabase, 
  getAllItems, 
  bulkAddItems, 
  clearStore, 
  STORES, 
  DB_NAME, 
  DB_VERSION, 
  StoreName 
} from '../db/indexedDbManager';
import { 
  getLicense, 
  saveLicense, 
  LicenseMetadata, 
  LICENSE_STORAGE_KEY,
  TRIAL_DURATION_DAYS
} from '../engine/licenseEngine';
import { APP_VERSION } from '../utils/licenseManager';

export interface BackupPayload {
  app: string;
  app_version: string;
  export_timestamp: string;
  device_id: string;
  license: LicenseMetadata;
  local_storage: Record<string, string>;
  db_name: string;
  db_version: number;
  total_records: number;
  stores_summary: Record<string, number>;
  data: Record<string, any[]>;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  totalRestored: number;
  storesRestored: Record<string, number>;
  licenseRestored: boolean;
  timestamp: string;
}

/**
 * 1. Mengambil seluruh isi IndexedDB (Master Data, Transaksi, Lisensi)
 *    dan mengunduhnya sebagai file .json terformat.
 */
export async function exportDataToJSON(autoDownload: boolean = true): Promise<BackupPayload> {
  const license = getLicense();
  const db = await openDatabase();
  
  const allStoreNames = Object.values(STORES) as StoreName[];
  const storesData: Record<string, any[]> = {};
  const storesSummary: Record<string, number> = {};
  let totalRecords = 0;

  // Baca seluruh 19 master data + 2 POS store
  for (const storeName of allStoreNames) {
    try {
      const items = await getAllItems(storeName);
      storesData[storeName] = items;
      storesSummary[storeName] = items.length;
      totalRecords += items.length;
    } catch (err) {
      console.warn(`Gagal membaca store ${storeName}:`, err);
      storesData[storeName] = [];
      storesSummary[storeName] = 0;
    }
  }

  // Backup data konfigurasi LocalStorage penting
  const localStorageKeys = [
    'usahaqu_device_id',
    'usahaqu_type',
    'bq_theme',
    'bq_profile',
    'bq_permissions',
    'bq_branches'
  ];
  const localStorageData: Record<string, string> = {};
  for (const key of localStorageKeys) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      localStorageData[key] = val;
    }
  }

  const payload: BackupPayload = {
    app: 'UsahaQu v1.83 - Master Ecosystem',
    app_version: APP_VERSION,
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
 * 2. Membaca file JSON cadangan dan memulihkan seluruh tabel IndexedDB
 *    tanpa merusak struktur database.
 */
export async function importDataFromJSON(
  fileOrData: File | string | BackupPayload
): Promise<RestoreResult> {
  let parsedPayload: any;

  if (fileOrData instanceof File) {
    const text = await fileOrData.text();
    parsedPayload = JSON.parse(text);
  } else if (typeof fileOrData === 'string') {
    parsedPayload = JSON.parse(fileOrData);
  } else {
    parsedPayload = fileOrData;
  }

  // Validasi format file cadangan
  if (!parsedPayload || (!parsedPayload.data && !parsedPayload.queues && !parsedPayload.pos_catalog)) {
    throw new Error('Format berkas JSON cadangan tidak valid atau tidak dikenali.');
  }

  const dataContainer = parsedPayload.data || parsedPayload;
  const storesRestored: Record<string, number> = {};
  let totalRestored = 0;

  // Pastikan koneksi IndexedDB siap
  await openDatabase();

  const allStoreNames = Object.values(STORES) as string[];

  // Pulihkan tabel-tabel IndexedDB
  for (const storeName of allStoreNames) {
    const items = dataContainer[storeName];
    if (Array.isArray(items) && items.length > 0) {
      try {
        await clearStore(storeName as StoreName);
        await bulkAddItems(storeName as StoreName, items);
        storesRestored[storeName] = items.length;
        totalRestored += items.length;
      } catch (err) {
        console.error(`Gagal memulihkan tabel ${storeName}:`, err);
      }
    }
  }

  // Dukungan kompatibilitas backward cadangan versi v1.60/v1.70 (format flat)
  if (dataContainer.spareparts && Array.isArray(dataContainer.spareparts)) {
    await bulkAddItems(STORES.BENGKEL_SPAREPARTS, dataContainer.spareparts);
    storesRestored[STORES.BENGKEL_SPAREPARTS] = (storesRestored[STORES.BENGKEL_SPAREPARTS] || 0) + dataContainer.spareparts.length;
    totalRestored += dataContainer.spareparts.length;
  }

  // Pulihkan Metadata Lisensi jika ada di berkas cadangan
  let licenseRestored = false;
  if (parsedPayload.license && typeof parsedPayload.license === 'object') {
    try {
      saveLicense(parsedPayload.license);
      licenseRestored = true;
    } catch (e) {
      console.warn('Gagal memulihkan lisensi:', e);
    }
  }

  // Pulihkan preferensi LocalStorage
  if (parsedPayload.local_storage && typeof parsedPayload.local_storage === 'object') {
    for (const [k, v] of Object.entries(parsedPayload.local_storage)) {
      if (typeof v === 'string') {
        localStorage.setItem(k, v);
      }
    }
  }

  // Kirim event notifikasi pembaruan data & lisensi
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
 * 3. Simulator Uji Coba Status Lisensi (Development & QA Tool)
 */

/**
 * simulateExpireTrial():
 * Memajukan tanggal trial_ends_at ke masa lalu (-2 hari)
 * untuk menguji fungsi auto-downgrade ke 'free_lifetime'.
 */
export function simulateExpireTrial(): LicenseMetadata {
  const license = getLicense();
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 hari yang lalu
  
  license.is_paid = false;
  license.trial_ends_at = pastDate.toISOString();
  license.status = 'free_lifetime';
  license.paid_expires_at = null;
  license.last_validated_at = new Date().toISOString();

  saveLicense(license);

  // Trigger update event global
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
 * Mengubah lisensi lokal langsung ke 'paid_plan' / 'pro_active' (+1 Tahun)
 * untuk menguji pembukaan seluruh modul ekosistem & fitur premium.
 */
export function simulatePaymentSuccess(
  packageName: string = 'Paket Ultimate All Modul',
  durationMonths: number = 12
): LicenseMetadata {
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

  // Trigger update event global
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
 * Mengembalikan status lisensi ke masa uji coba 10 hari yang baru.
 */
export function resetTrialSimulation(): LicenseMetadata {
  const license = getLicense();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

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

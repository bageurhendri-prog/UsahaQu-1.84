import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Palette, 
  Database, 
  UploadCloud, 
  RotateCcw, 
  Check, 
  CheckCircle2, 
  Download, 
  AlertTriangle, 
  Sparkles,
  ShieldAlert,
  Info,
  Key,
  Copy,
  Mail,
  Crown,
  Laptop,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Trash2,
  RefreshCw,
  Layers,
  FileCheck,
  X,
  Users,
  Building2
} from 'lucide-react';
import { 
  ServiceQueue, 
  Sparepart, 
  Transaction, 
  CustomerVehicle, 
  WorkshopProfile, 
  RolePermissionConfig, 
  BranchItem,
  UserSession,
  DamagedGood,
  ProcurementRecord,
  MarketingCampaign,
  PromoVoucher,
  ExpenseItem,
  SubscriptionState
} from '../../types';
import { 
  getOrCreateDeviceId, 
  APP_VERSION, 
  checkAndMigrateAppData
} from '../../utils/licenseManager';
import { STORES } from '../../db/indexedDbManager';
import { getLicense, getTrialDaysRemaining } from '../../engine/licenseEngine';

interface SettingViewProps {
  initialTab?: string;
  onBack: () => void;
  queues: ServiceQueue[];
  spareparts: Sparepart[];
  transactions: Transaction[];
  customers: CustomerVehicle[];
  damagedGoods?: DamagedGood[];
  procurements?: ProcurementRecord[];
  campaigns?: MarketingCampaign[];
  vouchers?: PromoVoucher[];
  expenses?: ExpenseItem[];
  profile: WorkshopProfile;
  permissions: RolePermissionConfig[];
  branches: BranchItem[];
  onRestoreData: (backupData: any) => void;
  onResetData: (mode: 'daily' | 'factory' | 'clean_slate') => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
  subscription?: SubscriptionState;
  onReloadDemoData?: () => void;
  onNavigateToDevices?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPermissions?: () => void;
  onNavigateToBranches?: () => void;
}

export const SettingView: React.FC<SettingViewProps> = ({
  initialTab = 'setting-tema',
  onBack,
  queues,
  spareparts,
  transactions,
  customers,
  damagedGoods = [],
  procurements = [],
  campaigns = [],
  vouchers = [],
  expenses = [],
  profile,
  permissions,
  branches,
  onRestoreData,
  onResetData,
  userSession,
  onLogout,
  subscription,
  onReloadDemoData,
  onNavigateToDevices,
  onNavigateToProfile,
  onNavigateToPermissions,
  onNavigateToBranches
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // 1. Theme State
  const [selectedTheme, setSelectedTheme] = useState<'emerald' | 'teal' | 'forest' | 'lime'>(() => {
    return (localStorage.getItem('bq_theme') as any) || 'emerald';
  });
  const [themeSaved, setThemeSaved] = useState(false);

  // 2. Backup Options State
  const [backupOptions, setBackupOptions] = useState({
    queues: true,
    spareparts: true,
    transactions: true,
    customers: true,
    damagedGoods: true,
    procurements: true,
    campaigns: true,
    vouchers: true,
    expenses: true,
    profile: true,
    permissions: true,
    branches: true
  });
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  // 3. Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // 4. Reset State (Clean slate vs demo vs daily)
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [resetModalMode, setResetModalMode] = useState<'daily' | 'factory' | 'clean_slate' | null>(null);
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  // Device identification & Update State
  const deviceId = subscription?.deviceId || getOrCreateDeviceId();
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{ checked: boolean; msg: string } | null>(null);

  // Theme Choices
  const THEMES = [
    {
      id: 'emerald',
      name: 'Hijau Emerald (Standar Bengkel Qu)',
      desc: 'Warna resmi hijau bersih yang sejuk dan profesional',
      color: '#008952',
      badge: 'Aktif'
    },
    {
      id: 'teal',
      name: 'Teal Mint Modern',
      desc: 'Nuansa biru-kehijauan cerah ala aplikasi fintech modern',
      color: '#0d9488',
      badge: 'Pilihan'
    },
    {
      id: 'forest',
      name: 'Hijau Forest Solid',
      desc: 'Warna hijau daun pekat dengan kontras tinggi',
      color: '#15803d',
      badge: 'Pilihan'
    },
    {
      id: 'lime',
      name: 'Lime Racing Otomotif',
      desc: 'Warna hijau sporty terinspirasi arena balap motor',
      color: '#65a30d',
      badge: 'Sporty'
    }
  ];

  const handleApplyTheme = (themeId: any) => {
    setSelectedTheme(themeId);
    localStorage.setItem('bq_theme', themeId);
    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 2000);
  };

  const handleDownloadBackup = () => {
    const backupPayload: any = {
      app: 'Bengkel Qu POS',
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      deviceId,
      subscription,
      summary: {
        queuesCount: queues.length,
        sparepartsCount: spareparts.length,
        transactionsCount: transactions.length,
        customersCount: customers.length,
        damagedGoodsCount: damagedGoods.length,
        procurementsCount: procurements.length
      },
      data: {}
    };

    if (backupOptions.queues) backupPayload.data.queues = queues;
    if (backupOptions.spareparts) backupPayload.data.spareparts = spareparts;
    if (backupOptions.transactions) backupPayload.data.transactions = transactions;
    if (backupOptions.customers) backupPayload.data.customers = customers;
    if (backupOptions.damagedGoods) backupPayload.data.damagedGoods = damagedGoods;
    if (backupOptions.procurements) backupPayload.data.procurements = procurements;
    if (backupOptions.campaigns) backupPayload.data.campaigns = campaigns;
    if (backupOptions.vouchers) backupPayload.data.vouchers = vouchers;
    if (backupOptions.expenses) backupPayload.data.expenses = expenses;
    if (backupOptions.profile) backupPayload.data.profile = profile;
    if (backupOptions.permissions) backupPayload.data.permissions = permissions;
    if (backupOptions.branches) backupPayload.data.branches = branches;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `bengkelqu_backup_${dateFormatted}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupDownloaded(true);
    setTimeout(() => setBackupDownloaded(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data && !parsed.queues) {
          throw new Error('Format berkas tidak sesuai dengan skema data cadangan Bengkel Qu.');
        }
        setRestorePreview(parsed.data || parsed);
      } catch (err: any) {
        setRestoreError(err.message || 'Gagal membaca berkas JSON.');
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!restorePreview) return;
    onRestoreData(restorePreview);
    setRestoreSuccess(true);
    setTimeout(() => {
      setRestoreSuccess(false);
      setRestoreFile(null);
      setRestorePreview(null);
    }, 2500);
  };

  const handleExecuteReset = () => {
    const cleanWord = resetConfirmationText.trim().toUpperCase();
    if (cleanWord !== 'RESET' && cleanWord !== 'HAPUS') return;

    if (resetModalMode) {
      onResetData(resetModalMode);
      if (resetModalMode === 'clean_slate') {
        setResetSuccessNotice('Semua data operasional berhasil dihapus bersih total tanpa tersisa!');
      } else if (resetModalMode === 'factory') {
        setResetSuccessNotice('Data sampel / demo pabrik berhasil dimuat ulang!');
      } else {
        setResetSuccessNotice('Antrian & transaksi shift hari ini berhasil dibersihkan!');
      }

      setResetModalMode(null);
      setResetConfirmationText('');
      setTimeout(() => setResetSuccessNotice(null), 3500);
    }
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopiedDeviceId(true);
    setTimeout(() => setCopiedDeviceId(false), 2000);
  };

  const handleRunMigrationCheck = () => {
    const info = checkAndMigrateAppData();
    setMigrationStatus({
      checked: true,
      msg: `Pengecekan versi ${info.currentVersion} berhasil. Skema data tersinkronisasi 100% aman dan kompatibel!`
    });
    setTimeout(() => setMigrationStatus(null), 3500);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col">
      {/* Top Header */}
      <div 
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        className="bg-[#008952] text-white px-5 pb-5 shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Kembali"
              className="w-10 h-10 rounded-full bg-white/15 active:bg-white/30 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Setting Bengkel Qu</h1>
              <p className="text-xs text-emerald-100 font-medium">
                Profil, Hak Akses, Cabang, Multi-HP, Tema, Backup & Restore
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Horizontal (Scrollable for compact touch) */}
        <div className="flex items-center gap-1.5 mt-4 bg-emerald-800/50 p-1 rounded-xl text-xs overflow-x-auto scrollbar-none">
          {onNavigateToProfile && (
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="flex-1 min-w-[65px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap text-emerald-100 hover:text-white bg-white/15 hover:bg-white/25 active:scale-95"
            >
              Profil
            </button>
          )}
          {onNavigateToPermissions && (
            <button
              type="button"
              onClick={onNavigateToPermissions}
              className="flex-1 min-w-[75px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap text-emerald-100 hover:text-white bg-white/15 hover:bg-white/25 active:scale-95"
            >
              Hak Akses
            </button>
          )}
          {onNavigateToBranches && (
            <button
              type="button"
              onClick={onNavigateToBranches}
              className="flex-1 min-w-[65px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap text-emerald-100 hover:text-white bg-white/15 hover:bg-white/25 active:scale-95"
            >
              Cabang
            </button>
          )}
          {onNavigateToDevices && (
            <button
              type="button"
              onClick={onNavigateToDevices}
              className="flex-1 min-w-[80px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap text-emerald-100 hover:text-white bg-white/15 hover:bg-white/25 active:scale-95"
            >
              Tautkan HP
            </button>
          )}
          <button
            onClick={() => setActiveTab('setting-tema')}
            className={`flex-1 min-w-[60px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap ${
              activeTab === 'setting-tema' ? 'bg-white text-[#008952] shadow-xs' : 'text-emerald-100'
            }`}
          >
            Tema
          </button>
          <button
            onClick={() => setActiveTab('setting-backup')}
            className={`flex-1 min-w-[65px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap ${
              activeTab === 'setting-backup' ? 'bg-white text-[#008952] shadow-xs' : 'text-emerald-100'
            }`}
          >
            Backup
          </button>
          <button
            onClick={() => setActiveTab('setting-restore')}
            className={`flex-1 min-w-[65px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap ${
              activeTab === 'setting-restore' ? 'bg-white text-[#008952] shadow-xs' : 'text-emerald-100'
            }`}
          >
            Restore
          </button>
          <button
            onClick={() => setActiveTab('setting-reset')}
            className={`flex-1 min-w-[60px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap ${
              activeTab === 'setting-reset' ? 'bg-white text-rose-600 shadow-xs' : 'text-emerald-100'
            }`}
          >
            Reset
          </button>
          <button
            onClick={() => setActiveTab('setting-update')}
            className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer whitespace-nowrap ${
              activeTab === 'setting-update' ? 'bg-white text-[#008952] shadow-xs' : 'text-emerald-100'
            }`}
          >
            Info App
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        
        {/* ================= TAB 1: TEMA ================= */}
        {activeTab === 'setting-tema' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-[#008952]" />
                <h3 className="font-bold text-slate-900 text-sm">Pilihan Tema Warna</h3>
              </div>
              <p className="text-xs text-slate-500">
                Pilih palet nuansa warna antarmuka untuk seluruh dashboard dan tombol Bengkel Qu.
              </p>
            </div>

            {themeSaved && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-[#008952] rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Tema berhasil diterapkan dan disimpan!</span>
              </div>
            )}

            <div className="space-y-2.5">
              {THEMES.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleApplyTheme(t.id)}
                  className={`bg-white rounded-2xl p-4 shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
                    selectedTheme === t.id
                      ? 'border-[#008952] ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-100 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl shadow-sm flex items-center justify-center text-white font-black"
                      style={{ backgroundColor: t.color }}
                    >
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{t.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {selectedTheme === t.id ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#008952] border border-emerald-200">
                        Dipakai
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Pilih</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: BACKUP ================= */}
        {activeTab === 'setting-backup' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-[#008952]" />
                <h3 className="font-bold text-slate-900 text-sm">Pencadangan Data (Backup .JSON)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Unduh berkas cadangan komprehensif berisi seluruh riwayat antrian, katalog sparepart, transaksi kasir, pelanggan, barang rusak, pengadaan, dan pengaturan.
              </p>
            </div>

            {backupDownloaded && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-[#008952] rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Berkas cadangan berhasil diunduh ke perangkat Anda!</span>
              </div>
            )}

            {/* Checklist Modul yang Dicadangkan */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-800">Pilih Data yang Disertakan:</span>
                <span className="text-[10px] text-slate-400">Centang sesuai kebutuhan</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'queues', label: `Antrian Servis (${queues.length})` },
                  { key: 'spareparts', label: `Katalog Part (${spareparts.length})` },
                  { key: 'transactions', label: `Transaksi Kasir (${transactions.length})` },
                  { key: 'customers', label: `Data CRM Pelanggan (${customers.length})` },
                  { key: 'damagedGoods', label: `Barang Rusak (${damagedGoods.length})` },
                  { key: 'procurements', label: `Pengadaan Suku Cadang (${procurements.length})` },
                  { key: 'expenses', label: `Kas Kecil Operasional (${expenses.length})` },
                  { key: 'profile', label: 'Profil & Identitas Bengkel' },
                  { key: 'permissions', label: 'Matriks Otorisasi Hak Akses' },
                  { key: 'branches', label: 'Data Cabang Bengkel' }
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(backupOptions as any)[item.key]}
                      onChange={(e) =>
                        setBackupOptions({
                          ...backupOptions,
                          [item.key]: e.target.checked
                        })
                      }
                      className="rounded text-[#008952] focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full bg-[#008952] hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor & Unduh Berkas Cadangan (.JSON)</span>
            </button>
          </div>
        )}

        {/* ================= TAB 3: RESTORE ================= */}
        {activeTab === 'setting-restore' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <UploadCloud className="w-4 h-4 text-[#008952]" />
                <h3 className="font-bold text-slate-900 text-sm">Pemulihan Data (Restore .JSON)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pulihkan data bengkel dari berkas JSON hasil ekspor cadangan sebelumnya. Data baru akan otomatis menggantikan atau menyinkronkan data aktif.
              </p>
            </div>

            {restoreSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-[#008952] rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Seluruh data cadangan berhasil dipulihkan dan disinkronkan!</span>
              </div>
            )}

            {restoreError && (
              <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{restoreError}</span>
              </div>
            )}

            {/* Upload Area */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border-2 border-dashed border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-[#008952] rounded-full flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Pilih Berkas Cadangan Bengkel Qu (.JSON)
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Format berkas: bengkelqu_backup_*.json
                </span>
              </div>

              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-[#008952] hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>

            {/* Preview Restore */}
            {restorePreview && (
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-300 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#008952]">
                  <FileCheck className="w-4 h-4" />
                  <span className="font-bold text-xs">Pratinjau Data yang Ditemukan</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Antrian Servis</span>
                    <span className="font-bold text-slate-800">{restorePreview.queues?.length || 0} Tiket</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Suku Cadang / Stok</span>
                    <span className="font-bold text-slate-800">{restorePreview.spareparts?.length || 0} Item</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Transaksi Kasir</span>
                    <span className="font-bold text-slate-800">{restorePreview.transactions?.length || 0} Nota</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Pelanggan CRM</span>
                    <span className="font-bold text-slate-800">{restorePreview.customers?.length || 0} Unit</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  className="w-full bg-[#008952] hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan Pemulihan Sekarang</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: RESET (PASTIKAN HAPUS BERSIH TIDAK TERSISA) ================= */}
        {activeTab === 'setting-reset' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Pusat Reset & Penghapusan Data</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pilih opsi di bawah untuk mengosongkan seluruh data operasional tanpa tersisa, atau memuat ulang data demo/sampel untuk pelatihan tim bengkel.
              </p>
            </div>

            {resetSuccessNotice && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-[#008952] rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{resetSuccessNotice}</span>
              </div>
            )}

            {/* OPSI UTAMA 1: HAPUS BERSIH TOTAL (TIDAK TERSISA SAMA SEKALI) */}
            <div className="bg-rose-50/50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-xs">
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Bersih Total (Kosongkan Data - Tidak Ada Tersisa)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Menghapus seluruh antrian servis, riwayat kasir, suku cadang, pelanggan CRM, log barang rusak, dan kas kecil menjadi <strong>0 data (kosong total)</strong>. Cocok untuk bengkel baru yang siap mulai operasional nyata dari awal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalMode('clean_slate')}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs active:scale-95 shadow-md shadow-rose-700/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Bersih Total (0 Data Tersisa)</span>
              </button>
            </div>

            {/* OPSI 2: Muat Ulang Data Sampel / Demo Pabrik */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#008952] font-bold text-xs">
                    <RefreshCw className="w-4 h-4" />
                    <span>Muat Ulang Data Sampel / Demo Pabrik</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mengisi kembali data contoh motor matic, katalog oli & sparepart, serta transaksi kasir untuk latihan/simulasi tim kasir dan mekanik.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalMode('factory')}
                className="bg-emerald-50 hover:bg-emerald-100 text-[#008952] border border-emerald-300 font-bold px-3 py-2 rounded-xl text-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Data Demo Pabrik</span>
              </button>
            </div>

            {/* OPSI 3: Bersihkan Shift Hari Ini Saja */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Bersihkan Shift & Transaksi Selesai Hari Ini</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Menghapus antrian yang selesai dan riwayat transaksi hari ini tanpa menghapus katalog barang dan data pelanggan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalMode('daily')}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-2 rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
              >
                Bersihkan Shift Hari Ini Saja
              </button>
            </div>

            {/* Info Akun Google */}
            {userSession && (
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">Akun Google Terhubung</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {userSession.role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{userSession.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{userSession.email}</span>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Keluar / Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: STATUS FULL VERSION ================= */}
        {activeTab === 'setting-aktivasi' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#008952] flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Bengkel Qu Full Version</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Seluruh modul operasional, kasir POS, antrian servis, inventaris, CRM pelanggan, marketing, manajemen cabang & multi-HP aktif penuh tanpa batasan kuota.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Status Aplikasi:</span>
                  <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                    Permanen Aktif
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-900">
                  <span>Device ID Perangkat:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[11px]">{deviceId}</span>
                    <button
                      type="button"
                      onClick={handleCopyDeviceId}
                      className="text-[#008952] hover:underline text-[10px] font-bold cursor-pointer"
                    >
                      {copiedDeviceId ? 'Tersalin' : 'Salin'}
                    </button>
                  </div>
                </div>
              </div>

              {onNavigateToDevices && (
                <button
                  type="button"
                  onClick={onNavigateToDevices}
                  className="w-full bg-[#008952] hover:bg-emerald-700 active:scale-95 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Kelola Tautkan HP & Sinkronisasi</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 6: UPDATE APP (AUTO-ADAPT TANPA UNINSTALL) ================= */}
        {activeTab === 'setting-update' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#008952]" />
                <h3 className="font-bold text-slate-900 text-sm">Pembaruan Aplikasi & Sinkronisasi Skema</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aplikasi Bengkel Qu dirancang untuk dapat <strong>ditimpa pembaruan langsung</strong> tanpa perlu melakukan uninstall terlebih dahulu. Data lama Anda (antrian, stok, kasir, pelanggan) otomatis menyesuaikan.
              </p>
            </div>

            {migrationStatus && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-[#008952] rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{migrationStatus.msg}</span>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Versi Terpasang Saat Ini</span>
                <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                  v{APP_VERSION}-pro
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Status Kompatibilitas Data</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Kompatibel 100%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Mekanisme Update</span>
                <span className="font-semibold text-slate-800">
                  Langsung Timpa (Zero Data Loss)
                </span>
              </div>
            </div>

            {/* Arsitektur Data Lokal IndexedDB & License Engine Card */}
            {(() => {
              const lic = getLicense();
              const trialRemaining = getTrialDaysRemaining();
              return (
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#008952]" />
                      <span>Database Lokal IndexedDB (v1.83)</span>
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                      {Object.keys(STORES).length} Stores Aktif
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Database offline-first dengan <strong>5 Master Data Global</strong>, <strong>14 Master Data Spesifik Modul</strong>, dan <strong>2 Store POS Core</strong> (Katalog & Transaksi Lokal Kasir).
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Status Lisensi Lokal</span>
                    <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                      lic.status === 'trial' 
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : lic.status === 'pro_active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-blue-50 text-blue-800 border-blue-300'
                    }`}>
                      {lic.status === 'trial' 
                        ? `Trial 10 Hari (Sisa ${trialRemaining} hari)`
                        : lic.status === 'pro_active'
                        ? 'Pro Aktif (Full Ekosistem)'
                        : `Free Lifetime (${lic.selected_primary_module.toUpperCase()})`}
                    </span>
                  </div>

                  <a 
                    href="/usahaku.html" 
                    className="mt-3 w-full py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <span>⚡ Buka Antarmuka Kasir POS Core (usahaku.html) &rarr;</span>
                  </a>
                </div>
              );
            })()}

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <Check className="w-4 h-4 text-[#008952]" />
                <span>Keamanan Data Saat Update</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Saat developer merilis pembaruan antarmuka atau fitur baru, Anda cukup merefresh atau menimpa aplikasi. Algoritma auto-migrasi akan memeriksa dan menambahkan kolom baru secara otomatis tanpa mereset atau menghapus transaksi riil yang sudah ada.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunMigrationCheck}
              className="w-full bg-[#008952] hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sinkronkan & Sesuaikan Skema Data Sekarang</span>
            </button>
          </div>
        )}

      </div>

      {/* Confirmation Modal for Reset */}
      {resetModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 p-5 space-y-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              resetModalMode === 'clean_slate' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-[#008952]'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {resetModalMode === 'clean_slate'
                  ? 'Konfirmasi Hapus Bersih Total (0 Tersisa)'
                  : resetModalMode === 'factory'
                  ? 'Konfirmasi Muat Ulang Data Sampel Pabrik'
                  : 'Konfirmasi Bersihkan Shift Hari Ini'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {resetModalMode === 'clean_slate'
                  ? 'PERINGATAN: Seluruh antrian, barang, pelanggan, dan transaksi akan dikosongkan total tanpa ada data yang tersisa.'
                  : 'Data akan dimuat ulang ke kondisi standar.'}
              </p>
              <p className="text-xs font-bold text-slate-700 mt-2">
                Ketik kata <span className="font-black text-rose-600">HAPUS</span> atau <span className="font-black text-rose-600">RESET</span> di bawah untuk melanjutkan:
              </p>
            </div>

            <input
              type="text"
              value={resetConfirmationText}
              onChange={(e) => setResetConfirmationText(e.target.value)}
              placeholder="Ketik HAPUS atau RESET"
              className="w-full text-center bg-slate-50 border border-slate-300 rounded-xl py-2 font-mono text-sm uppercase font-bold tracking-widest text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setResetModalMode(null);
                  setResetConfirmationText('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  resetConfirmationText.trim().toUpperCase() !== 'RESET' &&
                  resetConfirmationText.trim().toUpperCase() !== 'HAPUS'
                }
                onClick={handleExecuteReset}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Ya, Eksekusi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

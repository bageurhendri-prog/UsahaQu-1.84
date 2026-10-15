/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UsahaQu v1.83 - Upgrade to Premium Modal
 * Modal interaktif saat pengguna mengeklik modul atau fitur terkunci (Locked Features).
 * Menampilkan ringkasan keunggulan paket Premium, integrasi pembayaran TriPay,
 * dan input serial key aktivasi lisensi.
 */

import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  QrCode, 
  CreditCard, 
  Key, 
  Smartphone, 
  Check, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  getLicense, 
  activateLicenseKey, 
  simulateTrialExpiryForTesting, 
  resetTrialForTesting,
  LicenseMetadata
} from '../../engine/licenseEngine';

interface UpgradeToPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  lockedItemTitle?: string;
  lockedItemDescription?: string;
  onUpgradeSuccess?: (license: LicenseMetadata) => void;
}

export const UpgradeToPremiumModal: React.FC<UpgradeToPremiumModalProps> = ({
  isOpen,
  onClose,
  lockedItemTitle = 'Fitur / Modul Terkunci',
  lockedItemDescription = 'Fitur ini merupakan bagian dari paket UsahaQu Premium.',
  onUpgradeSuccess
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly' | 'lifetime'>('yearly');
  const [serialKey, setSerialKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);
  const [showTriPayCheckout, setShowTriPayCheckout] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  if (!isOpen) return null;

  const currentLicense = getLicense();

  const handleActivateKey = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setKeySuccess(null);

    const result = activateLicenseKey(
      serialKey, 
      selectedPlan === 'lifetime' ? 'corporate' : selectedPlan === 'yearly' ? 'core' : 'basic', 
      selectedPlan === 'lifetime' ? 120 : selectedPlan === 'yearly' ? 12 : 1
    );

    if (result.success && result.license) {
      setKeySuccess(result.message);
      if (onUpgradeSuccess) onUpgradeSuccess(result.license);
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setKeyError(result.message);
    }
  };

  const handleSimulateTriPayPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      // Generate a mock serial key from TriPay callback
      const generatedSerial = 'UQ-TRIPAY-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
      const res = activateLicenseKey(
        generatedSerial, 
        selectedPlan === 'lifetime' ? 'corporate' : selectedPlan === 'yearly' ? 'core' : 'basic',
        selectedPlan === 'lifetime' ? 120 : selectedPlan === 'yearly' ? 12 : 1
      );
      setIsProcessingPayment(false);
      setShowTriPayCheckout(false);
      if (res.success && res.license) {
        setKeySuccess('Pembayaran via TriPay Berhasil Diverifikasi! Lisensi Pro Aktif.');
        if (onUpgradeSuccess) onUpgradeSuccess(res.license);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 text-white p-5 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-100 shadow-md border border-white/20">
                <Crown className="w-6 h-6 text-amber-200 fill-amber-300" />
              </div>
              <div>
                <span className="text-[10px] bg-white/25 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  Upgrade Ke Premium
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight mt-1">
                  Buka Akses Penuh UsahaQu
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Locked reason banner */}
          <div className="mt-3.5 bg-black/25 backdrop-blur-md rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-amber-100 border border-white/10">
            <Lock className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <strong className="text-white block truncate">{lockedItemTitle}</strong>
              <p className="text-[11px] text-amber-100/90 leading-tight truncate">{lockedItemDescription}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Keunggulan Paket Premium */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              Keunggulan Paket Premium
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">5 Ekosistem Bebas</strong>
                  <span className="text-[11px] text-slate-500">Bengkel, Kedai, Klinik, Ritel & Titip</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">WhatsApp Gateway</strong>
                  <span className="text-[11px] text-slate-500">Kirim nota otomatis ke pelanggan</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Ekspor Laporan Excel</strong>
                  <span className="text-[11px] text-slate-500">Unduh rekap buku kas & omset</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Multi-Cabang & HP</strong>
                  <span className="text-[11px] text-slate-500">Tautkan HP staf tanpa batas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Options */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              Pilih Paket Berlangganan
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedPlan === 'monthly'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-500 block">Bulanan</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 block mt-0.5">Rp 49.000</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">/ 30 Hari</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('yearly')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  selectedPlan === 'yearly'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg">
                  HEMAT 40%
                </span>
                <span className="text-[10px] font-bold text-emerald-700 block">1 Tahun</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 block mt-0.5">Rp 349.000</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">/ 12 Bulan</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('lifetime')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedPlan === 'lifetime'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-500 block">Lifetime</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 block mt-0.5">Rp 899.000</span>
                <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">Bayar 1x</span>
              </button>
            </div>
          </div>

          {/* TriPay Payment Button / Gateway Section */}
          <div className="pt-1">
            {!showTriPayCheckout ? (
              <button
                type="button"
                onClick={() => setShowTriPayCheckout(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Upgrade Sekarang via TriPay Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-black text-slate-900">Pembayaran Resmi TriPay Indonesia</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowTriPayCheckout(false)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    Batal
                  </button>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Paket Dipilih:</span>
                    <strong className="text-slate-900 uppercase">{selectedPlan}</strong>
                  </div>
                  <div className="flex justify-between font-black text-sm text-emerald-700 pt-1 border-t border-slate-100">
                    <span>Total Tagihan:</span>
                    <span>{selectedPlan === 'lifetime' ? 'Rp 899.000' : selectedPlan === 'yearly' ? 'Rp 349.000' : 'Rp 49.000'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    Mendukung QRIS (Gopay/OVO/Dana/BCA Mobile), Virtual Account (BCA, BRI, Mandiri, BNI), & Gerai Retail.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateTriPayPayment}
                  disabled={isProcessingPayment}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menghubungkan ke TriPay Gateway...</span>
                    </>
                  ) : (
                    <>
                      <span>Bayar Instan QRIS / VA (Konfirmasi Otomatis)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Aktivasi via Serial Key */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>Sudah Memiliki Serial Key Aktivasi?</span>
            </h4>
            <form onSubmit={handleActivateKey} className="flex gap-2">
              <input
                type="text"
                value={serialKey}
                onChange={(e) => setSerialKey(e.target.value)}
                placeholder="Contoh: UQ-PRO-8899-2026"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                Aktivasi
              </button>
            </form>

            {keyError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1.5">{keyError}</p>
            )}
            {keySuccess && (
              <p className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{keySuccess}</span>
              </p>
            )}
          </div>

          {/* Quick Developer Testing Controls (Simulasi Status) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Tes Mode:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const updated = simulateTrialExpiryForTesting();
                  if (onUpgradeSuccess) onUpgradeSuccess(updated);
                  alert("Status berhasil dialihkan ke 'free_lifetime'. Modul selain modul utama sekarang dalam status Terkunci (Gembok).");
                }}
                className="underline hover:text-slate-700 cursor-pointer"
              >
                Simulasikan Free Lifetime
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  const updated = resetTrialForTesting();
                  if (onUpgradeSuccess) onUpgradeSuccess(updated);
                  alert("Status berhasil direset ke Trial 10 Hari (Semua Modul Terbuka).");
                }}
                className="underline hover:text-slate-700 cursor-pointer"
              >
                Reset Trial 10 Hari
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Modul Utama Anda: <strong className="text-slate-800">{currentLicense.selected_primary_module.toUpperCase()}</strong> (Gratis Selamanya)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

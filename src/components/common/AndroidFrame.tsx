import React, { useState } from 'react';
import { Smartphone, Monitor, ShieldCheck } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  bottomBar?: React.ReactNode;
  onHomePress?: () => void;
  onBackPress?: () => void;
  canGoBack?: boolean;
  activeModuleName?: string;
  onOpenMasterSwitcher?: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  bottomBar,
  onHomePress,
  onBackPress,
  canGoBack,
  activeModuleName = 'BengkelQu - Otomotif & Servis',
  onOpenMasterSwitcher
}) => {
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isSafeAreaEnabled, setIsSafeAreaEnabled] = useState<boolean>(true);

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-800 flex flex-col items-center justify-start p-0 md:py-6 md:px-4">
      {/* Top control bar outside phone frame (for preview customization) */}
      <div className="w-full max-w-5xl mb-3 hidden md:flex items-center justify-between px-4 py-2 bg-white shadow-xs rounded-2xl border border-slate-200 text-slate-600 text-xs">
        <div className="flex items-center gap-3">
          <div 
            onClick={onOpenMasterSwitcher} 
            className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title="Klik untuk Buka UsahaQu Master Switcher"
          >
            UQ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight">UsahaQu v1.83</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                {activeModuleName}
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200 hidden sm:inline-flex items-center gap-1 shadow-2xs">
            VIP FAMILY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Safe Area Mode Status & Toggle */}
          <button
            onClick={() => setIsSafeAreaEnabled(!isSafeAreaEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              isSafeAreaEnabled
                ? 'bg-emerald-50 text-[#008952] border border-emerald-200 shadow-xs'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            title="Aktifkan/Nonaktifkan Proteksi Safe Area Status Bar & Navigation Bar"
          >
            <ShieldCheck className="w-4 h-4 text-[#008952]" />
            <span>Safe Area: {isSafeAreaEnabled ? 'Aktif' : 'Nonaktif'}</span>
          </button>

          {/* Frame mode toggle */}
          <button
            onClick={() => setIsMobileMode(!isMobileMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            {isMobileMode ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span>Mode Lebar</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mode HP (412px)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          isMobileMode
            ? 'max-w-[425px] h-[100dvh] md:h-[750px] md:max-h-[88vh] rounded-none md:rounded-[40px] shadow-none md:shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-0 md:border-2 md:border-slate-300/80 overflow-hidden bg-white my-auto'
            : 'max-w-6xl xl:max-w-7xl h-[100dvh] md:h-[820px] md:max-h-[92vh] rounded-none md:rounded-2xl shadow-none md:shadow-xl border-0 md:border md:border-slate-200 bg-white overflow-hidden my-auto'
        }`}
      >
        {/* Application Viewport Container */}
        <div className="relative flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* Mobile Top Header Module Switcher */}
          {onOpenMasterSwitcher && (
            <div className="md:hidden bg-slate-950 text-white px-3.5 py-1.5 flex items-center justify-between text-[11px] shrink-0 z-30 border-b border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={onOpenMasterSwitcher}
                className="flex items-center gap-2 font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                title="Buka UsahaQu Module Switcher"
              >
                <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">UQ</span>
                <span className="font-extrabold tracking-tight text-white">{activeModuleName.split(' - ')[0]}</span>
                <span className="text-[10px] text-emerald-300 bg-emerald-950 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                  Ganti ▾
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenMasterSwitcher}
                className="text-[10px] font-bold text-slate-300 hover:text-white px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
              >
                5 Modul
              </button>
            </div>
          )}

          {/* Scrollable Viewport - Terisolasi agar konten tidak pernah menembus status bar maupun navigation bar */}
          <div className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-slate-50 scrollbar-none ${bottomBar ? 'pb-6' : ''}`}>
            {children}
          </div>

          {/* Navigasi Menu Cepat Bawah - Terkunci Permanen di Bawah */}
          {bottomBar && (
            <div className="shrink-0 w-full z-40 bg-white sticky bottom-0">
              {bottomBar}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

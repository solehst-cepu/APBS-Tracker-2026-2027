import React from 'react';
import { ViewTab } from '../types/apbs';
import {
  PlusCircle,
  FileSpreadsheet,
  LayoutDashboard,
  Receipt,
  FileText,
  School,
  Database,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useApbs } from '../context/ApbsContext';
import { formatRupiah } from '../utils/formatters';

interface HeaderProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenRecordModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenRecordModal,
}) => {
  const {
    totalActual,
    progressPercent,
    isSheetsConnected,
    isSyncing,
    setIsSheetsModalOpen,
  } = useApbs();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand Wordmark & Entity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  APBS 2026 GA Tracker
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">· Lazuardi GCS Cinere</span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Tahun Ajaran 2026-2027 · Realisasi Anggaran General Affairs
              </p>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onTabChange('spreadsheet')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'spreadsheet'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Data APBS</span>
            </button>
            <button
              onClick={() => onTabChange('transactions')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'transactions'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Transaksi Penggunaan</span>
            </button>
            <button
              onClick={() => onTabChange('reports')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'reports'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Laporan & Ekspor</span>
            </button>
          </nav>

          {/* Zone 3: Google Sheets Sync Status, Quick Stats & Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              title="Pengaturan Database Google Sheets"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                isSheetsConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : isSheetsConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Database className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden xl:inline">
                {isSyncing
                  ? 'Sinkronisasi...'
                  : isSheetsConnected
                  ? 'Google Sheets Aktif'
                  : 'Hubungkan Sheets'}
              </span>
              <span className="xl:hidden">Sheets</span>
            </button>

            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs text-slate-500">Terpakai: {progressPercent.toFixed(1)}%</span>
              <span className="text-xs font-mono font-semibold text-slate-800 tabular-nums">
                {formatRupiah(totalActual)}
              </span>
            </div>

            <button
              onClick={onOpenRecordModal}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Catat Penggunaan Dana</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              currentTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('spreadsheet')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              currentTab === 'spreadsheet' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Data APBS
          </button>
          <button
            onClick={() => onTabChange('transactions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              currentTab === 'transactions' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Transaksi
          </button>
          <button
            onClick={() => onTabChange('reports')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              currentTab === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Laporan
          </button>
        </div>
      </div>
    </header>
  );
};

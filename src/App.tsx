import React, { useState } from 'react';
import { ApbsProvider, useApbs } from './context/ApbsContext';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ApbsGridView } from './components/ApbsGridView';
import { TransactionView } from './components/TransactionView';
import { ReportsView } from './components/ReportsView';
import { RecordExpenseModal } from './components/RecordExpenseModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GoogleSheetsConfirmModal } from './components/GoogleSheetsConfirmModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { ViewTab } from './types/apbs';
import { CheckCircle2, X, FileSpreadsheet, ExternalLink } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedItemIdForModal, setSelectedItemIdForModal] = useState<string | undefined>(undefined);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined);
  const [dismissedAuthBanner, setDismissedAuthBanner] = useState(false);

  const {
    needsAuth,
    isLoggingIn,
    handleGoogleLogin,
    isSheetsConnected,
    spreadsheetInfo,
    syncNotice,
    clearSyncNotice,
    setIsSheetsModalOpen,
  } = useApbs();

  const handleOpenRecordModal = (itemId?: string) => {
    setSelectedItemIdForModal(itemId);
    setIsRecordModalOpen(true);
  };

  const handleSelectCategoryFilter = (category: string) => {
    setSelectedCategoryFilter(category);
    setCurrentTab('spreadsheet');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'spreadsheet') setSelectedCategoryFilter(undefined);
        }}
        onOpenRecordModal={() => handleOpenRecordModal()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Google Sheets Sync Notice Toast */}
        {syncNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{syncNotice}</span>
              {spreadsheetInfo && (
                <a
                  href={spreadsheetInfo.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline ml-1"
                >
                  <span>Buka Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              onClick={clearSyncNotice}
              className="p-1 text-emerald-600 hover:text-emerald-800 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Google Sheets Auto-Connect Banner (shown when signed out / needsAuth) */}
        {needsAuth && !dismissedAuthBanner && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Sambungkan Database Google Sheets APBS 2026 GA
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Masuk dengan Google untuk membuat atau menyambungkan otomatis file spreadsheet{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    APBS_GA_2026_2027_Lazuardi_Database
                  </span>{' '}
                  di Google Drive Anda.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <GoogleSignInButton
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                label={isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
              />
              <button
                onClick={() => setDismissedAuthBanner(true)}
                title="Sembunyikan sementara"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setCurrentTab}
            onOpenRecordModal={handleOpenRecordModal}
            onSelectCategoryFilter={handleSelectCategoryFilter}
          />
        )}

        {currentTab === 'spreadsheet' && (
          <ApbsGridView
            onOpenRecordModal={handleOpenRecordModal}
            selectedCategoryFilter={selectedCategoryFilter}
            onClearCategoryFilter={() => setSelectedCategoryFilter(undefined)}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionView onOpenRecordModal={handleOpenRecordModal} />
        )}

        {currentTab === 'reports' && <ReportsView />}
      </main>

      {/* Modal for Recording Expense */}
      <RecordExpenseModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        preselectedItemId={selectedItemIdForModal}
      />

      {/* Google Sheets Database Manager & Confirmation Modals */}
      <GoogleSheetsModal />
      <GoogleSheetsConfirmModal />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Lazuardi Global Compassionate School</span>
            <span>·</span>
            <span>APBS Tim General Affairs (GA) TA 2026-2027</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              {isSheetsConnected
                ? `Google Sheets: ${spreadsheetInfo?.title}`
                : 'Hubungkan Database Google Sheets'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ApbsProvider>
      <AppContent />
    </ApbsProvider>
  );
}

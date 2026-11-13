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
import { LoginGate } from './components/LoginGate';
import { AuthErrorAlert } from './components/AuthErrorAlert';
import { isAllowedSchoolEmail } from './services/googleAuth';
import { ViewTab } from './types/apbs';
import { CheckCircle2, X, ExternalLink } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedItemIdForModal, setSelectedItemIdForModal] = useState<string | undefined>(undefined);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined);

  const {
    googleUser,
    needsAuth,
    isLoggingIn,
    handleGoogleLoginRedirect,
    isSheetsConnected,
    spreadsheetInfo,
    syncError,
    authErrorInfo,
    clearSyncError,
    syncNotice,
    clearSyncNotice,
    setIsSheetsModalOpen,
  } = useApbs();

  if (needsAuth || !googleUser || !isAllowedSchoolEmail(googleUser.email)) {
    return <LoginGate />;
  }

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
        {/* Google Auth / Sheets Error Alert (always visible on main screen) */}
        <AuthErrorAlert
          syncError={syncError}
          authErrorInfo={authErrorInfo}
          onDismiss={clearSyncError}
          onTryRedirect={handleGoogleLoginRedirect}
          isLoggingIn={isLoggingIn}
        />

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

import React, { useState } from 'react';
import { useApbs } from '../context/ApbsContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AuthErrorAlert } from './AuthErrorAlert';
import { DB_SPREADSHEET_TITLE } from '../services/googleSheetsDb';
import { isRunningInIframe } from '../services/googleAuth';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Link2,
  CheckCircle2,
  LogOut,
  Plus,
  Loader2,
  Database,
} from 'lucide-react';

export const GoogleSheetsModal: React.FC = () => {
  const {
    isSheetsModalOpen,
    setIsSheetsModalOpen,
    googleUser,
    needsAuth,
    isLoggingIn,
    isSheetsConnected,
    spreadsheetInfo,
    isSyncing,
    lastSyncedAt,
    syncError,
    authErrorInfo,
    clearSyncError,
    handleGoogleLogin,
    handleGoogleLoginRedirect,
    handleGoogleLogout,
    requestCreateSheetsDb,
    requestPushAllToSheets,
    requestPullFromSheets,
    linkSpreadsheetByUrlOrId,
    items,
    transactions,
  } = useApbs();

  const [manualLinkInput, setManualLinkInput] = useState('');

  if (!isSheetsModalOpen) return null;

  const handleManualLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLinkInput.trim()) return;
    await linkSpreadsheetByUrlOrId(manualLinkInput);
    setManualLinkInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Database Google Sheets APBS 2026 GA
              </h3>
              <p className="text-xs text-slate-500">
                Koneksi otomatis ke spreadsheet Google Drive untuk penyimpanan & pelacakan real-time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSheetsModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-xs">
          {/* Error Banner */}
          <AuthErrorAlert
            syncError={syncError}
            authErrorInfo={authErrorInfo}
            onDismiss={clearSyncError}
            onTryRedirect={handleGoogleLoginRedirect}
            isLoggingIn={isLoggingIn}
          />

          {/* Section 1: Authentication */}
          {needsAuth ? (
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-sm font-bold text-slate-900">
                  Hubungkan Akun Google Anda
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masuk dengan akun Google untuk membuat atau menyambungkan otomatis file database{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {DB_SPREADSHEET_TITLE}
                  </span>{' '}
                  di Google Drive Anda.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 pt-1">
                <GoogleSignInButton
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
                />
                {!isRunningInIframe() && (
                  <button
                    type="button"
                    onClick={handleGoogleLoginRedirect}
                    disabled={isLoggingIn}
                    className="text-[11px] font-medium text-slate-500 hover:text-emerald-700 underline underline-offset-2"
                  >
                    Pop-up terblokir? Masuk dengan mode Redirect
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Struktur database otomatis: Tab <span className="font-mono">Ringkasan_Dashboard</span>,{' '}
                <span className="font-mono">APBS_Master</span> ({items.length} baris #APBS), &{' '}
                <span className="font-mono">Transaksi_Pengeluaran</span>
              </div>
            </div>
          ) : (
            <>
              {/* Connected Google User Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {googleUser?.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'User'}
                      className="w-9 h-9 rounded-full border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                      {(googleUser?.email?.[0] || 'G').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      {googleUser?.displayName || 'Akun Google'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {googleUser?.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 bg-white border border-slate-200 hover:border-rose-200 rounded-lg transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan</span>
                </button>
              </div>

              {/* Section 2: Spreadsheet Database Status */}
              {isSyncing && !spreadsheetInfo ? (
                <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-center gap-3 text-emerald-800">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">
                    Mencari & menyambungkan database APBS di Google Drive...
                  </span>
                </div>
              ) : isSheetsConnected && spreadsheetInfo ? (
                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-emerald-950 text-sm">
                          {spreadsheetInfo.title}
                        </div>
                        <div className="text-[11px] text-emerald-800 mt-0.5">
                          Terkoneksi otomatis · {spreadsheetInfo.sheets.length} tab aktif (
                          {spreadsheetInfo.sheets.map((s) => s.title).join(', ')})
                        </div>
                      </div>
                    </div>

                    <a
                      href={spreadsheetInfo.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded-lg font-semibold text-xs shrink-0 transition-colors"
                    >
                      <span>Buka Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/70 text-[11px] text-emerald-800">
                    <span className="font-mono">
                      ID: {spreadsheetInfo.spreadsheetId.slice(0, 22)}...
                    </span>
                    {lastSyncedAt && (
                      <span>
                        Sinkron terakhir:{' '}
                        <strong>
                          {new Date(lastSyncedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Sync Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSheetsModalOpen(false);
                        requestPullFromSheets();
                      }}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-emerald-300 rounded-lg font-semibold transition-colors disabled:opacity-60"
                    >
                      <DownloadCloud className="w-4 h-4 text-emerald-700" />
                      <span>Muat Ulang dari Sheets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSheetsModalOpen(false);
                        requestPushAllToSheets();
                      }}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
                    >
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4" />
                      )}
                      <span>Sinkronkan Semua ke Sheets</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                  <div className="font-semibold text-amber-950">
                    Spreadsheet database belum terhubung
                  </div>
                  <p className="text-amber-800 text-xs">
                    Klik tombol di bawah untuk membuat database Google Sheets baru dengan 3 tab
                    otomatis ({items.length} pos #APBS & {transactions.length} transaksi).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSheetsModalOpen(false);
                      requestCreateSheetsDb();
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Database Google Sheets Sekarang</span>
                  </button>
                </div>
              )}

              {/* Section 3: Manual Link Existing Sheet */}
              <form
                onSubmit={handleManualLinkSubmit}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <span>Tautkan Spreadsheet Google Sheets Tertentu (Opsional)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Masukkan URL atau Spreadsheet ID yang dibuat oleh aplikasi ini jika ingin beralih
                  ke file database lain.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualLinkInput}
                    onChange={(e) => setManualLinkInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing || !manualLinkInput.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Hubungkan</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => setIsSheetsModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

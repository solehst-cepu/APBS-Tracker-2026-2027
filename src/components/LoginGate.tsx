import React from 'react';
import { useApbs } from '../context/ApbsContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AuthErrorAlert } from './AuthErrorAlert';
import { ALLOWED_EMAIL_DOMAIN, isRunningInIframe } from '../services/googleAuth';
import { School, ShieldCheck, FileSpreadsheet, Loader2 } from 'lucide-react';

export const LoginGate: React.FC = () => {
  const {
    isCheckingAuth,
    isLoggingIn,
    handleGoogleLogin,
    handleGoogleLoginRedirect,
    syncError,
    authErrorInfo,
    clearSyncError,
  } = useApbs();

  const inIframe = isRunningInIframe();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Lazuardi Global Compassionate School · Cinere
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                APBS 2026 GA Tracker
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Sistem Pengelolaan & Realisasi Anggaran General Affairs TA 2026–2027
              </p>
            </div>
          </div>

          {/* School Domain Rule Box */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-1">
              <div className="font-bold">Aturan Akses Akun Sekolah</div>
              <p className="text-emerald-900 leading-relaxed">
                Aplikasi ini hanya dapat digunakan oleh staf yang masuk menggunakan akun Google
                resmi sekolah dengan domain{' '}
                <code className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-emerald-800">
                  @{ALLOWED_EMAIL_DOMAIN}
                </code>
                .
              </p>
            </div>
          </div>

          {/* Auth Error Diagnostics */}
          <AuthErrorAlert
            syncError={syncError}
            authErrorInfo={authErrorInfo}
            onDismiss={clearSyncError}
            onTryRedirect={handleGoogleLoginRedirect}
            isLoggingIn={isLoggingIn}
          />

          {/* Sign-In Action */}
          {isCheckingAuth ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2.5 text-slate-600">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">Memeriksa sesi akun sekolah...</span>
            </div>
          ) : (
            <div className="space-y-3 flex flex-col items-center">
              <GoogleSignInButton
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                label={
                  isLoggingIn
                    ? 'Memverifikasi akun sekolah...'
                    : `Masuk dengan @${ALLOWED_EMAIL_DOMAIN}`
                }
              />

              {!inIframe && (
                <button
                  type="button"
                  onClick={handleGoogleLoginRedirect}
                  disabled={isLoggingIn}
                  className="text-xs font-medium text-slate-500 hover:text-emerald-700 underline underline-offset-2 disabled:opacity-50"
                >
                  Pop-up terblokir? Masuk dengan mode Redirect
                </button>
              )}
            </div>
          )}

          {/* Auto Sheets Sync Note */}
          <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500">
            <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Setelah berhasil masuk, database Google Sheets{' '}
              <span className="font-mono font-medium text-slate-700">
                APBS_GA_2026_2027_Lazuardi_Database
              </span>{' '}
              akan tersambung otomatis ke Google Drive akun sekolah Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        Divisi General Affairs (GA) · Lazuardi Global Compassionate School Cinere
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { ParsedAuthError, isRunningInIframe } from '../services/googleAuth';
import {
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  X,
  ArrowRightCircle,
} from 'lucide-react';

interface AuthErrorAlertProps {
  syncError: string | null;
  authErrorInfo: ParsedAuthError | null;
  onDismiss: () => void;
  onTryRedirect?: () => void;
  isLoggingIn?: boolean;
}

export const AuthErrorAlert: React.FC<AuthErrorAlertProps> = ({
  syncError,
  authErrorInfo,
  onDismiss,
  onTryRedirect,
  isLoggingIn,
}) => {
  const [copied, setCopied] = useState(false);

  if (!syncError) return null;

  const inIframe = isRunningInIframe();
  const hostname = authErrorInfo?.currentHostname || '';
  const projectId = authErrorInfo?.projectId || '';
  const firebaseAuthSettingsUrl = projectId
    ? `https://console.firebase.google.com/project/${projectId}/authentication/settings`
    : 'https://console.firebase.google.com/';

  const handleCopyHostname = async () => {
    if (!hostname) return;
    try {
      await navigator.clipboard.writeText(hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 shadow-2xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-rose-950">
              {authErrorInfo?.isUnauthorizedDomain
                ? 'Domain Deployment Belum Terdaftar di Firebase Auth'
                : authErrorInfo?.isPopupBlocked
                  ? 'Jendela Pop-up Login Diblokir Browser'
                  : 'Koneksi Google Auth / Sheets Gagal'}
            </div>
            <p className="text-rose-800 leading-relaxed">{syncError}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          title="Tutup pesan"
          className="p-1 text-rose-500 hover:text-rose-800 rounded hover:bg-rose-100 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {authErrorInfo?.isUnauthorizedDomain && hostname && (
        <div className="p-3 bg-white/90 border border-rose-200 rounded-lg space-y-2.5">
          <div className="text-[11px] text-slate-700 leading-relaxed">
            <strong>Cara Memperbaiki di Vercel:</strong> Tambahkan domain aplikasi Anda ke{' '}
            <span className="font-semibold">
              Firebase Console → Authentication → Settings → Authorized domains
            </span>
            , lalu klik login ulang.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-md font-mono text-[11px] font-semibold text-slate-900 select-all">
              {hostname}
            </code>
            <button
              type="button"
              onClick={handleCopyHostname}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md font-semibold text-[11px] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Domain</span>
                </>
              )}
            </button>
            <a
              href={firebaseAuthSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold text-[11px] transition-colors"
            >
              <span>Buka Firebase Authorized Domains</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {!inIframe && onTryRedirect && (authErrorInfo?.isPopupBlocked || authErrorInfo?.code) && !authErrorInfo?.isUnauthorizedDomain && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={onTryRedirect}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-[11px] transition-colors disabled:opacity-60"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" />
            <span>Login dengan Mode Redirect (Alternatif Vercel)</span>
          </button>
        </div>
      )}
    </div>
  );
};

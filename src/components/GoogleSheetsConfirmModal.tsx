import React, { useState } from 'react';
import { useApbs } from '../context/ApbsContext';
import { FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';

export const GoogleSheetsConfirmModal: React.FC = () => {
  const { pendingSheetConfirm, closePendingSheetConfirm } = useApbs();
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!pendingSheetConfirm) return null;

  const handleConfirm = async () => {
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      await pendingSheetConfirm.onConfirm();
      closePendingSheetConfirm();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal memperbarui Google Sheets. Silakan periksa koneksi atau login ulang.'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleLocalOnly = () => {
    if (pendingSheetConfirm.onLocalOnly) {
      pendingSheetConfirm.onLocalOnly();
    }
    closePendingSheetConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                pendingSheetConfirm.isDestructive
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {pendingSheetConfirm.isDestructive ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {pendingSheetConfirm.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfirmasi Perubahan Database Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePendingSheetConfirm}
            disabled={isExecuting}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description & Details */}
        <div className="mt-4 space-y-4 text-xs">
          <p className="text-slate-700 leading-relaxed">
            {pendingSheetConfirm.description}
          </p>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            {pendingSheetConfirm.details.map((d, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1.5 last:pb-0 border-b last:border-b-0 border-slate-200/70"
              >
                <span className="text-slate-500 font-medium">{d.label}:</span>
                <span className="font-semibold text-slate-900 font-mono text-[11px] sm:text-right break-all">
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={closePendingSheetConfirm}
            disabled={isExecuting}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Batal
          </button>

          {pendingSheetConfirm.localOnlyLabel && pendingSheetConfirm.onLocalOnly && (
            <button
              type="button"
              onClick={handleLocalOnly}
              disabled={isExecuting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {pendingSheetConfirm.localOnlyLabel}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExecuting}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 ${
              pendingSheetConfirm.isDestructive
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:opacity-60`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyinkronkan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{pendingSheetConfirm.confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

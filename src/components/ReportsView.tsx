import React, { useRef, useState } from 'react';
import { useApbs } from '../context/ApbsContext';
import { formatRupiah, formatPercent, formatDateIndo, MONTH_NAMES } from '../utils/formatters';
import {
  Printer,
  Download,
  Upload,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Building,
  Database,
  ExternalLink
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    items,
    totalBudget,
    totalActual,
    remainingBudget,
    progressPercent,
    categorySummaries,
    unitSummaries,
    monthlyStats,
    resetToDefault,
    exportDataJson,
    importDataJson,
    filterOnlyOperational,
    isSheetsConnected,
    spreadsheetInfo,
    setIsSheetsModalOpen,
  } = useApbs();

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV of full APBS Matrix
  const handleExportMatrixCSV = () => {
    const headers = [
      'No',
      'Kode APBS',
      'Mata Anggaran',
      'Kategori',
      'Subkategori',
      'Unit',
      ...MONTH_NAMES.map((m) => `Pagu ${m}`),
      ...MONTH_NAMES.map((m) => `Realisasi ${m}`),
      'Total Pagu',
      'Total Realisasi',
      'Sisa Saldo',
      '% Penyerapan',
      'Catatan',
    ];

    const rows = items.map((it, idx) => [
      idx + 1,
      `"${it.code}"`,
      `"${it.name.replace(/"/g, '""')}"`,
      `"${it.category}"`,
      `"${it.subcategory}"`,
      `"${it.unit}"`,
      ...it.monthlyBudget,
      ...it.monthlyActual,
      it.totalBudget,
      it.totalActual,
      it.totalBudget - it.totalActual,
      `${(it.totalBudget > 0 ? (it.totalActual / it.totalBudget) * 100 : 0).toFixed(2)}%`,
      `"${(it.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APBS_GA_Lazuardi_2026_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJson(content);
      if (success) {
        setImportStatus('Data berhasil diimpor dan diperbarui!');
        setTimeout(() => setImportStatus(null), 4000);
      } else {
        setImportStatus('Gagal membaca file JSON. Format tidak sesuai.');
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Laporan Realisasi & Manajemen Data APBS GA
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan pertanggungjawaban serapan anggaran resmi, ekspor lembar kerja, dan pencadangan data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <button
            onClick={handleExportMatrixCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.csv)</span>
          </button>
        </div>
      </div>

      {/* Backup, Google Sheets and Restore Utilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Google Sheets Database Card */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900">Database Google Sheets</h4>
            </div>
            <p className="text-xs text-slate-500">
              {isSheetsConnected && spreadsheetInfo
                ? `Terhubung ke "${spreadsheetInfo.title}". Seluruh transaksi tersinkron ke Google Drive.`
                : 'Hubungkan ke Google Sheets untuk menyimpan & menyinkronkan database APBS secara otomatis.'}
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="py-1.5 px-3 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-center w-full"
            >
              {isSheetsConnected ? 'Kelola Koneksi Sheets' : 'Hubungkan Google Sheets'}
            </button>
            {isSheetsConnected && spreadsheetInfo && (
              <a
                href={spreadsheetInfo.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-center w-full inline-flex items-center justify-center gap-1"
              >
                <span>Buka Spreadsheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Backup Card */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Download className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900">Cadangkan Data (Backup JSON)</h4>
            </div>
            <p className="text-xs text-slate-500">
              Unduh salinan seluruh perubahan nilai APBS dan riwayat transaksi untuk arsip atau transfer antar komputer.
            </p>
          </div>
          <button
            onClick={exportDataJson}
            className="mt-3 py-1.5 px-3 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-center w-full"
          >
            Unduh Berkas Backup (.json)
          </button>
        </div>

        {/* Restore Card */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Upload className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900">Pulihkan Data (Restore JSON)</h4>
            </div>
            <p className="text-xs text-slate-500">
              Unggah berkas backup JSON yang sebelumnya diunduh untuk memulihkan seluruh data transaksi dan anggaran.
            </p>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 py-1.5 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center w-full"
            >
              Pilih Berkas JSON
            </button>
          </div>
        </div>

        {/* Reset to Original Sheet Card */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-slate-900">Kembalikan ke Nilai Awal Sheet</h4>
            </div>
            <p className="text-xs text-slate-500">
              Mengembalikan seluruh nilai APBS ke data master awal tahun ajaran 2026-2027 dari berkas sheet sumber.
            </p>
          </div>
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="mt-3 py-1.5 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center w-full"
          >
            Reset ke Data Awal
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Formal Printable Document Preview */}
      <div className="p-8 bg-white rounded-2xl border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="text-center pb-6 border-b-2 border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1">
            YAYASAN LAZUARDI HAYATI · KAMPUS CINERE
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            LAPORAN REALISASI & PENYERAPAN DANA APBS
          </h1>
          <h2 className="text-sm font-semibold text-slate-700 mt-1">
            UNIT GENERAL AFFAIRS (GA) & OPERASIONAL SEKOLAH
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahun Ajaran 2026-2027 · Periode Berjalan per {formatDateIndo(new Date().toISOString().slice(0, 10))}
          </p>
        </div>

        {/* Executive Summary Stats */}
        <div className="grid grid-cols-4 gap-4 py-6 border-b border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Pagu Disetujui:</span>
            <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(totalBudget)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Total Realisasi Pengeluaran:</span>
            <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
              {formatRupiah(totalActual)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Sisa Anggaran Tersedia:</span>
            <span
              className={`text-base font-bold font-mono tabular-nums ${
                remainingBudget < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatRupiah(remainingBudget)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Tingkat Penyerapan Dana:</span>
            <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
              {formatPercent(progressPercent)}
            </span>
          </div>
        </div>

        {/* Table 1: Rekapitulasi per Kategori APBS */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            1. Rekapitulasi Penggunaan Dana per Kategori Utama
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 border-r border-slate-200 w-10 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-200">Kategori Anggaran</th>
                <th className="py-2 px-3 border-r border-slate-200 text-center">Item</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Pagu Anggaran (Rp)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Realisasi (Rp)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Sisa Saldo (Rp)</th>
                <th className="py-2 px-3 text-center">% Serap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {categorySummaries.map((cat, idx) => (
                <tr key={cat.category} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500 font-sans">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-sans font-semibold text-slate-900 border-r border-slate-200">
                    {cat.category}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-600">
                    {cat.itemCount}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-slate-200 tabular-nums font-medium text-slate-800">
                    {formatRupiah(cat.totalBudget)}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-slate-200 tabular-nums font-bold text-emerald-700">
                    {formatRupiah(cat.totalActual)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right border-r border-slate-200 tabular-nums font-medium ${
                      cat.remaining < 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {formatRupiah(cat.remaining)}
                  </td>
                  <td className="py-2 px-3 text-center tabular-nums font-semibold text-slate-700">
                    {formatPercent(cat.percentUsed)}
                  </td>
                </tr>
              ))}
              {/* Grand Total Row */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td colSpan={3} className="py-2.5 px-3 text-center font-sans border-r border-slate-200">
                  TOTAL APBS GA
                </td>
                <td className="py-2.5 px-3 text-right border-r border-slate-200 tabular-nums text-slate-900">
                  {formatRupiah(totalBudget)}
                </td>
                <td className="py-2.5 px-3 text-right border-r border-slate-200 tabular-nums text-emerald-800">
                  {formatRupiah(totalActual)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right border-r border-slate-200 tabular-nums ${
                    remainingBudget < 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatRupiah(remainingBudget)}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-slate-900">
                  {formatPercent(progressPercent)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: Rekapitulasi per Bulan (Juli s/d Juni) */}
        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            2. Rekapitulasi Alokasi & Realisasi Dana per Bulan
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 border-r border-slate-200">Bulan</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Rencana Anggaran (Rp)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Realisasi Aktual (Rp)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Selisih Bulanan (Rp)</th>
                <th className="py-2 px-3 text-center">% Serap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {monthlyStats.map((m) => (
                <tr key={m.monthName} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-800 border-r border-slate-200">
                    {m.monthName} 2026/27
                  </td>
                  <td className="py-1.5 px-3 text-right border-r border-slate-200 tabular-nums text-slate-700">
                    {formatRupiah(m.budget)}
                  </td>
                  <td className="py-1.5 px-3 text-right border-r border-slate-200 tabular-nums font-semibold text-emerald-700">
                    {m.actual > 0 ? formatRupiah(m.actual) : '-'}
                  </td>
                  <td className="py-1.5 px-3 text-right border-r border-slate-200 tabular-nums text-slate-700">
                    {formatRupiah(m.balance)}
                  </td>
                  <td className="py-1.5 px-3 text-center tabular-nums text-slate-600">
                    {m.actual > 0 ? formatPercent(m.percent) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Formal Sign-off Section */}
        <div className="mt-12 pt-6 grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-16">Dibuat Oleh,</p>
            <p className="font-bold text-slate-900 underline">Soleh / Tim General Affairs</p>
            <p className="text-slate-500 text-[11px]">Koordinator GA Lazuardi</p>
          </div>
          <div>
            <p className="text-slate-500 mb-16">Diverifikasi Oleh,</p>
            <p className="font-bold text-slate-900 underline">Finance & Accounting</p>
            <p className="text-slate-500 text-[11px]">Bagian Keuangan Yayasan</p>
          </div>
          <div>
            <p className="text-slate-500 mb-16">Mengetahui & Menyetujui,</p>
            <p className="font-bold text-slate-900 underline">Direktur Operasional / Yayasan</p>
            <p className="text-slate-500 text-[11px]">Yayasan Lazuardi Hayati</p>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">Reset ke Data Awal Sheet?</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Tindakan ini akan memulihkan data seluruh mata anggaran ke lembar kerja asli APBS TA 2026-2027 dan menghapus perubahan kustom yang tersimpan.
            </p>
            {isSheetsConnected && spreadsheetInfo && (
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                <strong>Perhatian Google Sheets:</strong> Anda dapat memilih apakah hanya me-reset cache lokal atau juga menimpa database{' '}
                <span className="font-mono font-semibold">{spreadsheetInfo.title}</span>.
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  resetToDefault(false);
                  setResetConfirmOpen(false);
                }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg"
              >
                {isSheetsConnected ? 'Reset Lokal Saja' : 'Ya, Reset Sekarang'}
              </button>
              {isSheetsConnected && (
                <button
                  onClick={() => {
                    resetToDefault(true);
                    setResetConfirmOpen(false);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
                >
                  Reset & Timpa Google Sheets
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

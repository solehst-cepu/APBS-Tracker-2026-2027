import React, { useState } from 'react';
import {
  ApbsBudgetItem,
  ExpenseTransaction,
  TEMPLATE_ENTITIES,
} from '../types/apbs';
import {
  buildDocumentFromTransactions,
  exportPengajuanDanaToPdf,
  formatDateFullDayIndo,
  formatDateShortEn,
  PengajuanDanaDocumentData,
} from '../utils/pengajuanDanaPdf';
import { formatRupiah } from '../utils/formatters';
import { X, Download, Printer, FileText, CheckSquare, Square, Layers } from 'lucide-react';

interface PengajuanDanaPreviewModalProps {
  transaction: ExpenseTransaction | null;
  allTransactions: ExpenseTransaction[];
  items: ApbsBudgetItem[];
  onClose: () => void;
  overrideDocData?: PengajuanDanaDocumentData | null;
}

export const PengajuanDanaPreviewModal: React.FC<PengajuanDanaPreviewModalProps> = ({
  transaction,
  allTransactions,
  items,
  onClose,
  overrideDocData,
}) => {
  const [groupByRef, setGroupByRef] = useState<boolean>(true);

  if (!transaction && !overrideDocData) return null;

  const docData: PengajuanDanaDocumentData =
    overrideDocData ||
    buildDocumentFromTransactions(transaction!, allTransactions, items, groupByRef);

  const refNo = docData.referenceNo;
  const siblingCount = transaction
    ? allTransactions.filter(
        (t) =>
          (t.formMeta?.referenceNo && t.formMeta.referenceNo === refNo) ||
          (t.invoiceNo && t.invoiceNo === refNo)
      ).length
    : docData.lines.length;

  const hutangYayasan =
    docData.saldoDiterima > 0 && docData.totalAmount > docData.saldoDiterima
      ? docData.totalAmount - docData.saldoDiterima
      : 0;
  const sisaDikembalikan =
    docData.saldoDiterima > 0 && docData.saldoDiterima > docData.totalAmount
      ? docData.saldoDiterima - docData.totalAmount
      : 0;

  const minVisualRows = Math.max(5, docData.lines.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto print:static print:bg-white print:p-0">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 my-4 overflow-hidden print:shadow-none print:border-0 print:max-w-none print:my-0">
        {/* Toolbar (hidden on print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">
                Pratinjau Lembaran Pengajuan / Laporan Dana (APBS)
              </h3>
              <p className="text-[11px] text-slate-300">
                No. Referensi: <span className="font-mono font-semibold text-white">{docData.referenceNo}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {transaction && siblingCount > 1 && (
              <button
                type="button"
                onClick={() => setGroupByRef((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {groupByRef
                    ? `Gabung ${siblingCount} Baris (1 Ref)`
                    : 'Hanya 1 Baris Ini'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => exportPengajuanDanaToPdf(docData)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF (.pdf)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-900 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Body (Faithful to Tamplate_pengajuan_dana_2026) */}
        <div className="p-4 sm:p-6 overflow-x-auto bg-slate-100/70 print:p-0 print:bg-white">
          <div className="min-w-[960px] bg-white border border-slate-300 shadow-xs p-5 text-[11px] text-slate-900 space-y-3 print:border-slate-400 print:shadow-none">
            {/* Title Bar */}
            <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between rounded-t-md">
              <div className="font-bold tracking-wide text-xs">
                LAZUARDI GLOBAL COMPASSIONATE SCHOOL · FORMULIR PENGAJUAN / LAPORAN DANA
              </div>
              <div className="text-[10px] font-mono text-emerald-300">
                APBS GENERAL AFFAIRS TA 2026–2027
              </div>
            </div>

            {/* Top Meta Grid */}
            <div className="grid grid-cols-12 gap-2.5">
              {/* Left: Jenis Formulir & Ref No */}
              <div className="col-span-5 border border-slate-300 rounded">
                <div className="grid grid-cols-2 border-b border-slate-200 p-2 gap-2 bg-slate-50/70">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {docData.formType === 'Pengajuan Dana Kegiatan' ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Pengajuan Dana Kegiatan</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    {docData.formType === 'Klaim/Laporan Pengeluaran' ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Klaim/Laporan Pengeluaran</span>
                  </div>
                </div>
                <div className="p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">No. Referensi Laporan:</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {docData.referenceNo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Tanggal Dokumen:</span>
                    <span className="font-semibold">
                      {formatDateFullDayIndo(docData.submissionDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle: Petunjuk & Status APBS */}
              <div className="col-span-4 border border-slate-300 rounded flex flex-col justify-between">
                <div className="px-2.5 py-1 bg-slate-100 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider text-slate-700">
                  Petunjuk Pengisian & Status APBS
                </div>
                <div className="p-2 text-[10px] text-slate-600 leading-snug">
                  Nominal anggaran mengacu pada <strong>Kode Rek. APBS</strong> pada file APBS Unit.
                  Untuk Laporan Pengeluaran, lengkapi kolom Saldo Diterima &amp; Sisa Dana Dikembalikan.
                </div>
                <div className="px-2.5 py-1.5 border-t border-slate-200 bg-emerald-50/60 flex items-center gap-2 font-bold text-emerald-900">
                  {docData.isApbs ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>APBS: {docData.isApbs ? 'TRUE (Terhubung Pagu APBS)' : 'FALSE (Non-APBS)'}</span>
                </div>
              </div>

              {/* Right: Unit / Entitas Checklist */}
              <div className="col-span-3 border border-slate-300 rounded">
                <div className="px-2.5 py-1 bg-slate-100 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider text-slate-700">
                  Unit / Entitas / Panitia
                </div>
                <div className="p-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  {TEMPLATE_ENTITIES.map((ent) => {
                    const checked = docData.checkedEntities.some(
                      (c) => c.toLowerCase() === ent.toLowerCase()
                    );
                    return (
                      <div key={ent} className="flex items-center gap-1">
                        {checked ? (
                          <CheckSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className={checked ? 'font-bold text-slate-900' : 'text-slate-600'}>
                          {ent}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Identity & Metode Pencairan Row */}
            <div className="border border-slate-300 rounded grid grid-cols-12">
              <div className="col-span-2 bg-slate-50 border-r border-slate-300 p-2.5 space-y-1.5">
                <div className="font-bold text-[10px] uppercase tracking-wider text-slate-600">
                  Metode Pencairan
                </div>
                {(['Tunai', 'Transfer', 'Lainnya'] as const).map((m) => (
                  <div key={m} className="flex items-center gap-1.5">
                    {docData.disbursementMethod === m ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span
                      className={
                        docData.disbursementMethod === m
                          ? 'font-bold text-slate-900'
                          : 'text-slate-600'
                      }
                    >
                      {m}
                    </span>
                  </div>
                ))}
              </div>

              <div className="col-span-10 divide-y divide-slate-200">
                <div className="grid grid-cols-4 divide-x divide-slate-200">
                  <div className="p-2">
                    <div className="text-[10px] text-slate-500">Nama Pemohon / PJ</div>
                    <div className="font-bold text-slate-900 mt-0.5">{docData.requesterName}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[10px] text-slate-500">Tanggal Pengajuan</div>
                    <div className="font-semibold mt-0.5">
                      {formatDateShortEn(docData.submissionDate)}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-[10px] text-slate-500">Tgl Pelaksanaan</div>
                    <div className="font-semibold mt-0.5">
                      {formatDateShortEn(docData.executionDate)}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-[10px] text-slate-500">Department / Unit</div>
                    <div className="font-bold text-slate-900 mt-0.5">{docData.department}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-200">
                  <div className="p-2">
                    <div className="text-[10px] text-slate-500">Kepala Unit</div>
                    <div className="font-bold text-slate-900 mt-0.5">{docData.unitHead}</div>
                  </div>
                  <div className="col-span-3 p-2">
                    <div className="text-[10px] text-slate-500">Tujuan Permintaan Dana / Laporan</div>
                    <div className="font-semibold text-slate-900 mt-0.5">{docData.purpose}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Rincian & APBS Balance Tables */}
            <div className="grid grid-cols-12 gap-2.5 items-start">
              {/* Left 9 cols: Rincian Table */}
              <div className="col-span-9 border border-slate-300 rounded overflow-hidden">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-emerald-600 text-white text-[10px] uppercase">
                      <th className="py-2 px-2 border-r border-emerald-500 text-center w-20">Tanggal</th>
                      <th className="py-2 px-2 border-r border-emerald-500 text-center w-20">
                        Kode Rek. APBS
                      </th>
                      <th className="py-2 px-2 border-r border-emerald-500 text-left">Deskripsi</th>
                      <th className="py-2 px-1.5 border-r border-emerald-500 text-center w-10">Qty</th>
                      <th className="py-2 px-2 border-r border-emerald-500 text-right w-24">@ Rp</th>
                      <th className="py-2 px-2 border-r border-emerald-500 text-center w-20">
                        Pencairan
                      </th>
                      <th className="py-2 px-2 border-r border-emerald-500 text-left">
                        Keterangan Pencairan Dana Kegiatan
                      </th>
                      <th className="py-2 px-2 text-right w-28">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.from({ length: minVisualRows }).map((_, idx) => {
                      const line = docData.lines[idx];
                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="py-2 px-2 border-r border-slate-200 text-center whitespace-nowrap">
                            {line ? formatDateShortEn(line.date) : '\u00A0'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-bold text-emerald-800">
                            {line ? `#${line.apbsCode}` : ''}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-semibold text-slate-900">
                            {line ? line.description : ''}
                          </td>
                          <td className="py-2 px-1.5 border-r border-slate-200 text-center font-mono">
                            {line ? line.qty : ''}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-right font-mono tabular-nums">
                            {line ? formatRupiah(line.unitPrice) : ''}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center">
                            {line ? line.disbursementMethod : ''}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-slate-700">
                            {line ? line.notes : ''}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {line ? formatRupiah(line.amount) : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                      <td colSpan={7} className="py-2 px-3 text-right uppercase text-[10px] tracking-wider">
                        Total Pengajuan / Pengeluaran
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-700 text-xs tabular-nums">
                        {formatRupiah(docData.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Right 3 cols: APBS Saldo Control Table */}
              <div className="col-span-3 border border-slate-300 rounded overflow-hidden">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-emerald-600 text-white text-[10px] uppercase">
                      <th className="py-2 px-1.5 border-r border-emerald-500 text-center">Kode APBS</th>
                      <th className="py-2 px-1.5 border-r border-emerald-500 text-right">Saldo Awal</th>
                      <th className="py-2 px-1.5 text-right">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.from({ length: minVisualRows }).map((_, idx) => {
                      const line = docData.lines[idx];
                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="py-2 px-1.5 border-r border-slate-200 text-center font-mono font-bold text-emerald-800">
                            {line ? `#${line.apbsCode}` : '\u00A0'}
                          </td>
                          <td className="py-2 px-1.5 border-r border-slate-200 text-right font-mono tabular-nums">
                            {line ? formatRupiah(line.saldoAwal) : ''}
                          </td>
                          <td className="py-2 px-1.5 text-right font-mono font-semibold tabular-nums">
                            {line ? formatRupiah(line.saldoAkhir) : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: PJ / Cek APBS + 4 Approvals + Over/(Under) Budget & Saldo Diterima */}
            <div className="grid grid-cols-12 gap-2.5 items-stretch">
              {/* Left 9 cols: PJ, Cek APBS, 4 Signature Boxes */}
              <div className="col-span-9 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="border border-slate-300 rounded p-2">
                    <div className="font-bold text-[10px] uppercase text-slate-600">
                      PJ (Penanggung Jawab)
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span>
                        Nama: <strong>{docData.requesterName}</strong>
                      </span>
                      <span className="text-slate-600">
                        Tgl: <strong>{formatDateShortEn(docData.submissionDate)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="border border-slate-300 rounded p-2">
                    <div className="font-bold text-[10px] uppercase text-slate-600">Cek APBS :</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                      <span>Tgl : .........................</span>
                      <span>Nama : ....................................</span>
                    </div>
                  </div>
                </div>

                {/* 4 Persetujuan Boxes */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { title: 'Persetujuan Kep. Unit', name: docData.approvers.kepUnit },
                    { title: 'Persetujuan Dep. Keuangan', name: docData.approvers.depKeuangan },
                    { title: 'Persetujuan Deputy GM', name: docData.approvers.deputyGm },
                    { title: 'Persetujuan Direktorat', name: docData.approvers.direktorat },
                  ].map((app) => (
                    <div
                      key={app.title}
                      className="border border-slate-300 rounded flex flex-col justify-between h-28"
                    >
                      <div className="bg-slate-100 border-b border-slate-200 px-2 py-1 text-center font-bold text-[10px]">
                        {app.title}
                      </div>
                      <div className="px-2 pt-1 text-[10px] text-slate-500">Tgl: ...................</div>
                      <div className="px-2 pb-2 text-center">
                        <div className="border-b border-slate-300 mb-1 mx-2" />
                        <div className="font-bold text-slate-900 text-[11px]">{app.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 3 cols: Over/(Under) Budget & Saldo Diterima */}
              <div className="col-span-3 space-y-2.5 flex flex-col justify-between">
                <div className="border border-slate-300 rounded overflow-hidden">
                  <div className="bg-slate-100 border-b border-slate-200 px-2.5 py-1 font-bold text-[10px] text-center uppercase">
                    Over / (Under) Budget
                  </div>
                  <div className="p-2 space-y-1 text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Anggaran</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatRupiah(docData.totalBudgetAnggaran)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Realisasi / Pengajuan</span>
                      <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatRupiah(docData.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1">
                      <span className="text-slate-600">Penyerapan Anggaran</span>
                      <span className="font-mono font-bold tabular-nums">
                        {docData.penyerapanPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">Dana Tersisa</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          docData.danaTersisa < 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatRupiah(docData.danaTersisa)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-300 rounded overflow-hidden">
                  <div className="bg-slate-100 border-b border-slate-200 px-2.5 py-1 font-bold text-[10px] text-center uppercase">
                    Saldo Diterima (Laporan)
                  </div>
                  <div className="p-2 space-y-1 text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Saldo Diterima</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatRupiah(docData.saldoDiterima)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Hutang ke Yayasan</span>
                      <span className="font-mono tabular-nums">{formatRupiah(hutangYayasan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Sisa Dikembalikan ({docData.sisaDikembalikanMethod})
                      </span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatRupiah(sisaDikembalikan)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApbs } from '../context/ApbsContext';
import { ExpenseTransaction } from '../types/apbs';
import { formatRupiah, formatDateIndo, MONTH_NAMES } from '../utils/formatters';
import { PengajuanDanaPreviewModal } from './PengajuanDanaPreviewModal';
import {
  buildDocumentFromTransactions,
  exportPengajuanDanaToPdf,
} from '../utils/pengajuanDanaPdf';
import {
  Search,
  PlusCircle,
  Trash2,
  Download,
  Receipt,
  Printer,
  X,
  FileDown,
} from 'lucide-react';

interface TransactionViewProps {
  onOpenRecordModal: (itemId?: string) => void;
  onEditTransaction?: (tx: ExpenseTransaction) => void;
}

export const TransactionView: React.FC<TransactionViewProps> = ({
  onOpenRecordModal,
  onEditTransaction,
}) => {
  const { items, transactions, categories, units, deleteTransaction, isSheetsConnected, spreadsheetInfo } = useApbs();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<ExpenseTransaction | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedMonth !== 'all' && tx.monthIndex !== parseInt(selectedMonth, 10)) {
        return false;
      }
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
        return false;
      }
      if (selectedUnit !== 'all' && tx.unit !== selectedUnit) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qClean = q.replace(/^#/, '').trim();
        const matchCode = (tx.itemId || '').toLowerCase().includes(qClean);
        const matchName = tx.itemName.toLowerCase().includes(q);
        const matchDesc = (tx.description || '').toLowerCase().includes(q);
        const matchPic = (tx.pic || '').toLowerCase().includes(q);
        const matchInv = (tx.invoiceNo || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDesc && !matchPic && !matchInv) return false;
      }
      return true;
    });
  }, [transactions, selectedMonth, selectedCategory, selectedUnit, searchQuery]);

  // Aggregate stats
  const totalAmountFiltered = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const avgAmount = filteredTransactions.length > 0
    ? totalAmountFiltered / filteredTransactions.length
    : 0;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Kode #APBS', 'Tanggal', 'No Bukti', 'Mata Anggaran', 'Kategori', 'Unit', 'Nominal (Rp)', 'PIC', 'Metode Bayar', 'Keterangan'];
    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      `"#${tx.itemId}"`,
      tx.date,
      `"${tx.invoiceNo || '-'}"`,
      `"${tx.itemName}"`,
      `"${tx.category}"`,
      `"${tx.unit}"`,
      tx.amount,
      `"${tx.pic}"`,
      `"${tx.paymentMethod || 'Kas GA'}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Riwayat_Pengeluaran_APBS_GA_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async (id: string, syncSheets = true) => {
    await deleteTransaction(id, syncSheets);
    setDeletingId(null);
  };

  const deletingTx = transactions.find((t) => t.id === deletingId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Riwayat & Pencatatan Penggunaan Dana APBS GA
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap pengeluaran dana langsung memperbarui realisasi APBS, sisa saldo, dan dashboard secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => onOpenRecordModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Transactions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Total Pengeluaran Terfilter</span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            {formatRupiah(totalAmountFiltered)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Dari {filteredTransactions.length} transaksi</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Rata-rata per Transaksi</span>
          <div className="text-xl font-bold font-mono text-slate-800 mt-1 tabular-nums">
            {formatRupiah(avgAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Pengeluaran rata-rata item GA</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Total Riwayat Tercatat</span>
          <div className="text-xl font-bold font-mono text-slate-800 mt-1 tabular-nums">
            {transactions.length} Transaksi
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Tersimpan di sistem browser</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi, no. bukti, uraian, PIC..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Month, Category, Unit Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Bulan</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m} 2026/27
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Unit Filter */}
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Unit</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {(searchQuery || selectedMonth !== 'all' || selectedCategory !== 'all' || selectedUnit !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMonth('all');
                  setSelectedCategory('all');
                  setSelectedUnit('all');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Tidak ada transaksi yang cocok</p>
            <p className="text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter bulan/kategori.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-2 text-center w-20">#APBS</th>
                  <th className="py-3 px-3">No. Bukti / Nota</th>
                  <th className="py-3 px-3">Mata Anggaran</th>
                  <th className="py-3 px-3">Kategori & Unit</th>
                  <th className="py-3 px-3">Keterangan / Uraian</th>
                  <th className="py-3 px-3">PIC / Pemohon</th>
                  <th className="py-3 px-3">Metode Bayar</th>
                  <th className="py-3 px-3 text-right">Nominal</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium">
                      {formatDateIndo(tx.date)}
                    </td>

                    {/* #APBS Code */}
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        #{tx.itemId}
                      </span>
                    </td>

                    {/* Invoice */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {tx.invoiceNo || '-'}
                    </td>

                    {/* Item Name */}
                    <td className="py-3 px-3 font-semibold text-slate-900 min-w-[180px]">
                      {tx.itemName}
                    </td>

                    {/* Category & Unit */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-800">{tx.category}</div>
                      <div className="text-[10px] text-slate-400">{tx.unit}</div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3 text-slate-600 max-w-[240px]">
                      <div className="line-clamp-2" title={tx.description}>
                        {tx.description || '-'}
                      </div>
                    </td>

                    {/* PIC */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                      {tx.pic}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {tx.paymentMethod || 'Kas GA'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-700 tabular-nums">
                      {formatRupiah(tx.amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedTxForReceipt(tx)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                          title="Pratinjau & Cetak Lembaran Pengajuan Dana"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            const docData = buildDocumentFromTransactions(
                              tx,
                              transactions,
                              items,
                              true
                            );
                            exportPengajuanDanaToPdf(docData);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                          title="Export Lembaran Pengajuan Dana ke PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => setDeletingId(tx.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Hapus Catatan Pengeluaran?</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Transaksi <span className="font-mono font-semibold">#{deletingTx.itemId}</span> ({deletingTx.itemName}) sebesar{' '}
              <span className="font-mono font-bold text-rose-700">{formatRupiah(deletingTx.amount)}</span> akan dihapus dan saldo pagu APBS akan dikembalikan otomatis.
            </p>
            {isSheetsConnected && spreadsheetInfo && (
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                <strong>Sinkronisasi Google Sheets:</strong> Baris transaksi ini juga akan dihapus dari spreadsheet{' '}
                <span className="font-mono font-semibold">{spreadsheetInfo.title}</span>.
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              {isSheetsConnected && (
                <button
                  onClick={() => confirmDelete(deletingId, false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Hapus Lokal Saja
                </button>
              )}
              <button
                onClick={() => confirmDelete(deletingId, true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
              >
                {isSheetsConnected ? 'Ya, Hapus & Update Sheets' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lembaran Pengajuan Dana Preview & PDF Export Modal */}
      <PengajuanDanaPreviewModal
        transaction={selectedTxForReceipt}
        allTransactions={transactions}
        items={items}
        onClose={() => setSelectedTxForReceipt(null)}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { useApbs } from '../context/ApbsContext';
import { formatRupiah, formatShortRupiah, formatPercent, formatDateIndo, MONTH_NAMES } from '../utils/formatters';
import {
  TrendingUp,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Layers,
  Building2,
  Calendar,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter
} from 'lucide-react';
import { ViewTab } from '../types/apbs';

interface DashboardViewProps {
  onNavigateTab: (tab: ViewTab) => void;
  onOpenRecordModal: (preselectedItemId?: string) => void;
  onSelectCategoryFilter: (category: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenRecordModal,
  onSelectCategoryFilter,
}) => {
  const {
    totalBudget,
    totalActual,
    remainingBudget,
    progressPercent,
    monthlyStats,
    categorySummaries,
    unitSummaries,
    overBudgetItems,
    nearLimitItems,
    transactions,
    filterOnlyOperational,
    setFilterOnlyOperational,
  } = useApbs();

  const [activeMonthHover, setActiveMonthHover] = useState<number | null>(null);

  // Month with highest spending
  const maxMonthlyBudget = Math.max(...monthlyStats.map((m) => Math.max(m.budget, m.actual)), 1);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Scope Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
              Aktif Real-Time
            </span>
            <span className="text-sm font-semibold text-slate-800">
              Dashboard Pelacakan APBS Tim General Affairs (GA)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kampus Lazuardi Global Compassionate School · Periode TA 2026-2027 (Juli 2026 – Juni 2027)
          </p>
        </div>

        {/* Operational Filter Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Cakupan:
          </span>
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterOnlyOperational(true)}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                filterOnlyOperational
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              APBS Operasional GA (Rp 3,17 M)
            </button>
            <button
              onClick={() => setFilterOnlyOperational(false)}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                !filterOnlyOperational
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua + Usulan Sarpras
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pagu Anggaran */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pagu Anggaran Disetujui</span>
              <span className="p-2 bg-slate-50 rounded-lg text-slate-600">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {formatRupiah(totalBudget)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Alokasi 12 Bulan TA 2026/2027</span>
            <span className="font-semibold text-slate-700">100%</span>
          </div>
        </div>

        {/* Card 2: Total Realisasi Penggunaan */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Realisasi Penggunaan Dana</span>
              <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                {formatRupiah(totalActual)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Tingkat Penyerapan</span>
              <span className="font-semibold font-mono text-emerald-700 tabular-nums">
                {formatPercent(progressPercent)}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent > 100
                    ? 'bg-rose-500'
                    : progressPercent > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Sisa Anggaran */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Sisa Saldo Anggaran</span>
              <span
                className={`p-2 rounded-lg ${
                  remainingBudget < 0 ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  remainingBudget < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {formatRupiah(remainingBudget)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sisa Pagu Tersedia</span>
            <span className="font-semibold text-slate-700">
              {formatPercent(totalBudget > 0 ? (remainingBudget / totalBudget) * 100 : 0)}
            </span>
          </div>
        </div>

        {/* Card 4: Transaksi & Pengawasan */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Transaksi Tercatat</span>
              <span className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Receipt className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {transactions.length}
              </span>
              <span className="text-xs text-slate-500">transaksi dana</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status Anggaran:</span>
            {overBudgetItems.length > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overBudgetItems.length} Over Budget
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Semua Terkendali
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Overbudget & Limit Alert Warnings if any */}
      {overBudgetItems.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-900">
                  Perhatian: Ada {overBudgetItems.length} Pos Pengeluaran yang Melebihi Anggaran (Over Budget)
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Realisasi dana pada item berikut telah melampaui pagu yang dialokasikan di APBS:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {overBudgetItems.slice(0, 4).map((it) => (
                    <span
                      key={it.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-rose-200 rounded text-xs text-rose-800"
                    >
                      <span className="font-mono text-slate-700 font-bold text-[10px] bg-rose-100/60 px-1 rounded">
                        #{it.code}
                      </span>
                      <span className="font-medium">{it.name}</span>
                      <span className="font-mono text-rose-600 font-semibold">
                        +{formatRupiah(it.totalActual - it.totalBudget)}
                      </span>
                    </span>
                  ))}
                  {overBudgetItems.length > 4 && (
                    <span className="text-xs text-rose-700 self-center">
                      +{overBudgetItems.length - 4} item lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('spreadsheet')}
              className="text-xs font-semibold text-rose-800 hover:text-rose-950 underline shrink-0"
            >
              Lihat di Data APBS
            </button>
          </div>
        </div>
      )}

      {/* Section 2: Progress Bulanan (Juli 2026 - Juni 2027) */}
      <div className="p-6 bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Progres & Rencana Penggunaan Dana Bulanan
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan Rencana Anggaran (Pagu) vs Realisasi Penggunaan Dana per bulan TA 2026/2027
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-200 inline-block" />
              <span className="text-slate-600">Rencana Anggaran</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              <span className="text-slate-600">Realisasi Dana</span>
            </div>
          </div>
        </div>

        {/* 12-Month Bar Chart */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3 items-end pt-8 pb-3 min-h-[220px]">
          {monthlyStats.map((stat, idx) => {
            const budgetHeight = Math.max(8, (stat.budget / maxMonthlyBudget) * 160);
            const actualHeight = Math.max(
              stat.actual > 0 ? 8 : 0,
              (stat.actual / maxMonthlyBudget) * 160
            );
            const isOver = stat.actual > stat.budget && stat.budget > 0;
            const isHovered = activeMonthHover === idx;

            return (
              <div
                key={stat.monthName}
                className="flex flex-col items-center group relative cursor-pointer"
                onMouseEnter={() => setActiveMonthHover(idx)}
                onMouseLeave={() => setActiveMonthHover(null)}
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-24 z-20 w-44 p-2 bg-slate-900 text-white rounded-lg shadow-lg text-xs pointer-events-none">
                    <p className="font-bold text-slate-100">{stat.monthName} 2026/27</p>
                    <div className="mt-1 space-y-0.5 text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Anggaran:</span>
                        <span className="font-mono">{formatShortRupiah(stat.budget)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Realisasi:</span>
                        <span className="font-mono">{formatShortRupiah(stat.actual)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-700">
                        <span>Sisa:</span>
                        <span className="font-mono">{formatShortRupiah(stat.balance)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bars */}
                <div className="w-full flex items-end justify-center gap-1 h-[160px]">
                  {/* Budget Bar */}
                  <div
                    className="w-3 sm:w-4 bg-slate-200 group-hover:bg-slate-300 rounded-t-sm transition-all"
                    style={{ height: `${budgetHeight}px` }}
                  />
                  {/* Actual Bar */}
                  <div
                    className={`w-3 sm:w-4 rounded-t-sm transition-all ${
                      isOver
                        ? 'bg-rose-500'
                        : stat.actual > 0
                        ? 'bg-emerald-500 group-hover:bg-emerald-600'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${actualHeight}px` }}
                  />
                </div>

                {/* Month Label */}
                <span className="text-[11px] font-medium text-slate-600 mt-2 truncate w-full text-center">
                  {stat.monthName.slice(0, 3)}
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {stat.actual > 0 ? `${stat.percent.toFixed(0)}%` : '-'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Dua Kolom - Kategori Utama & Unit Kerja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Breakdown per Kategori Utama */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Serapan per Kategori APBS</h3>
              </div>
              <span className="text-xs text-slate-500">{categorySummaries.length} Kategori</span>
            </div>

            <div className="space-y-4">
              {categorySummaries.map((cat) => {
                const isOver = cat.totalActual > cat.totalBudget && cat.totalBudget > 0;
                return (
                  <div
                    key={cat.category}
                    className="group p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{cat.category}</span>
                        <span className="text-[11px] text-slate-500">({cat.itemCount} item)</span>
                      </div>
                      <button
                        onClick={() => {
                          onSelectCategoryFilter(cat.category);
                          onNavigateTab('spreadsheet');
                        }}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Detail <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Rupiah Values */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-500 font-mono">
                        Realisasi:{' '}
                        <strong className="text-slate-800">{formatRupiah(cat.totalActual)}</strong>
                      </span>
                      <span className="text-slate-500 font-mono">
                        Pagu: <strong className="text-slate-800">{formatRupiah(cat.totalBudget)}</strong>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? 'bg-rose-500'
                            : cat.percentUsed > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, cat.percentUsed)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span>
                        Sisa: <strong className="font-mono">{formatRupiah(cat.remaining)}</strong>
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          isOver ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {formatPercent(cat.percentUsed)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Breakdown per Unit Kerja */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Alokasi & Realisasi per Unit</h3>
              </div>
              <span className="text-xs text-slate-500">{unitSummaries.length} Unit</span>
            </div>

            <div className="space-y-4">
              {unitSummaries.map((unit) => {
                return (
                  <div key={unit.unit} className="p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">{unit.unit}</span>
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {formatPercent(unit.percentUsed)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-500 font-mono">
                        Pakai: {formatShortRupiah(unit.totalActual)}
                      </span>
                      <span className="text-slate-500 font-mono">
                        Pagu: {formatShortRupiah(unit.totalBudget)}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, unit.percentUsed)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('spreadsheet')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span>Buka Seluruh Matriks Data APBS</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Riwayat Transaksi Penggunaan Dana Terakhir */}
      <div className="p-6 bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Aktivitas Penggunaan Dana Terbaru
            </h3>
            <p className="text-xs text-slate-500">
              Catatan real-time pengeluaran anggaran yang telah diverifikasi
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Lihat Semua Transaksi ({transactions.length}) <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Belum ada pengeluaran dana tercatat</p>
            <p className="text-xs text-slate-400 mt-1">
              Gunakan tombol &quot;Catat Penggunaan Dana&quot; di atas untuk memasukkan pengeluaran pertama.
            </p>
            <button
              onClick={() => onOpenRecordModal()}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium"
            >
              + Catat Pengeluaran Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="py-2.5 px-3">Tanggal & No. Bukti</th>
                  <th className="py-2.5 px-3">Mata Anggaran / Uraian</th>
                  <th className="py-2.5 px-3">Kategori & Unit</th>
                  <th className="py-2.5 px-3">PIC / Pemohon</th>
                  <th className="py-2.5 px-3 text-right">Nominal Pengeluaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 6).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{formatDateIndo(tx.date)}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {tx.invoiceNo || 'Nota GA'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          #{tx.itemId}
                        </span>
                        <span className="font-semibold text-slate-900">{tx.itemName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{tx.description}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-700">{tx.category}</div>
                      <div className="text-[11px] text-slate-400">{tx.unit}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{tx.pic}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-700 tabular-nums">
                      {formatRupiah(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

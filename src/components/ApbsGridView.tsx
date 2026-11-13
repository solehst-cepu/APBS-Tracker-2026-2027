import React, { useState, useMemo } from 'react';
import { useApbs } from '../context/ApbsContext';
import { ApbsBudgetItem } from '../types/apbs';
import { formatRupiah, formatShortRupiah, formatPercent, MONTH_NAMES } from '../utils/formatters';
import {
  Search,
  Filter,
  PlusCircle,
  Edit2,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Info
} from 'lucide-react';

interface ApbsGridViewProps {
  onOpenRecordModal: (itemId?: string) => void;
  selectedCategoryFilter?: string;
  onClearCategoryFilter?: () => void;
}

type DisplayMode = 'both' | 'actual' | 'budget';

export const ApbsGridView: React.FC<ApbsGridViewProps> = ({
  onOpenRecordModal,
  selectedCategoryFilter,
  onClearCategoryFilter,
}) => {
  const {
    items,
    categories,
    units,
    updateCell,
    filterOnlyOperational,
    setFilterOnlyOperational,
  } = useApbs();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryFilter || 'all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Inline Editing State
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    monthIndex: number;
    type: 'budget' | 'actual';
    value: string;
  } | null>(null);

  // Sync category filter if changed from dashboard
  React.useEffect(() => {
    if (selectedCategoryFilter) {
      setSelectedCategory(selectedCategoryFilter);
      setCurrentPage(1);
    }
  }, [selectedCategoryFilter]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Operational filter
      if (filterOnlyOperational && !item.isOperationalApbs) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Unit filter
      if (selectedUnit !== 'all' && item.unit !== selectedUnit) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qClean = q.replace(/^#/, '').trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(qClean) || item.id.toLowerCase().includes(qClean);
        const matchSub = item.subcategory.toLowerCase().includes(q);
        const matchUnit = item.unit.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSub && !matchUnit) return false;
      }

      return true;
    });
  }, [items, filterOnlyOperational, selectedCategory, selectedUnit, searchQuery]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Filtered Totals
  const filteredTotalBudget = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (it.totalBudget || 0), 0);
  }, [filteredItems]);

  const filteredTotalActual = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (it.totalActual || 0), 0);
  }, [filteredItems]);

  const filteredRemaining = filteredTotalBudget - filteredTotalActual;

  // Handle cell edit save
  const handleSaveCell = () => {
    if (!editingCell) return;
    const cleanNum = parseFloat(
      editingCell.value.replace(/[^0-9.-]/g, '').replace(',', '.')
    );
    const validVal = isNaN(cleanNum) ? 0 : cleanNum;
    updateCell(editingCell.itemId, editingCell.monthIndex, editingCell.type, validVal);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveCell();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Control Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari mata anggaran, kode, nama mobil, AC, satpam..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-900"
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

          {/* Quick Stats of Filtered View */}
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] font-sans">Pagu Terfilter:</span>
              <span className="font-bold text-slate-800">{formatRupiah(filteredTotalBudget)}</span>
            </div>
            <div className="text-right border-l border-slate-200 pl-4">
              <span className="text-slate-400 block text-[10px] font-sans">Realisasi:</span>
              <span className="font-bold text-emerald-600">{formatRupiah(filteredTotalActual)}</span>
            </div>
            <div className="text-right border-l border-slate-200 pl-4 hidden sm:block">
              <span className="text-slate-400 block text-[10px] font-sans">Sisa:</span>
              <span className={`font-bold ${filteredRemaining < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatRupiah(filteredRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Kategori:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                  if (onClearCategoryFilter && e.target.value === 'all') onClearCategoryFilter();
                }}
                className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Kategori ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Unit:</span>
              <select
                value={selectedUnit}
                onChange={(e) => {
                  setSelectedUnit(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Unit ({units.length})</option>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Active category pill clear */}
            {selectedCategory !== 'all' && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  if (onClearCategoryFilter) onClearCategoryFilter();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200"
              >
                Reset Filter <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* View Mode (Both / Actual Only / Budget Only) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 hidden sm:inline text-[11px]">Kolom Nilai:</span>
            <div className="flex p-0.5 bg-slate-100 rounded-md">
              <button
                onClick={() => setDisplayMode('both')}
                className={`px-2.5 py-1 text-xs rounded transition-all whitespace-nowrap ${
                  displayMode === 'both' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                }`}
              >
                Pagu & Realisasi
              </button>
              <button
                onClick={() => setDisplayMode('actual')}
                className={`px-2.5 py-1 text-xs rounded transition-all whitespace-nowrap ${
                  displayMode === 'actual' ? 'bg-white text-emerald-700 font-semibold shadow-xs' : 'text-slate-600'
                }`}
              >
                Realisasi Saja
              </button>
              <button
                onClick={() => setDisplayMode('budget')}
                className={`px-2.5 py-1 text-xs rounded transition-all whitespace-nowrap ${
                  displayMode === 'budget' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                }`}
              >
                Pagu Saja
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Edit Notice Tip */}
      <div className="flex items-center justify-between text-xs px-2 text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            <strong>Tips:</strong> Klik angka di kolom bulan untuk langsung mengubah nilai anggaran atau realisasi (tekan Enter untuk simpan).
          </span>
        </div>
        <div>
          Menampilkan <span className="font-semibold text-slate-800">{paginatedItems.length}</span> dari{' '}
          <span className="font-semibold text-slate-800">{filteredItems.length}</span> mata anggaran
        </div>
      </div>

      {/* Interactive APBS Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-2 w-10 font-semibold text-center border-r border-slate-200 bg-slate-50 sticky left-0 z-30">
                  No
                </th>
                <th className="py-3 px-2 min-w-[75px] font-semibold text-center border-r border-slate-200 bg-slate-50 sticky left-10 z-30">
                  #APBS
                </th>
                <th className="py-3 px-3 min-w-[240px] font-semibold border-r border-slate-200 bg-slate-50 sticky left-[115px] z-30 shadow-xs">
                  Mata Anggaran (Uraian Belanja GA)
                </th>
                <th className="py-3 px-3 min-w-[130px] font-semibold border-r border-slate-200">
                  Kategori & Sub
                </th>
                <th className="py-3 px-3 min-w-[90px] font-semibold border-r border-slate-200 text-center">
                  Unit
                </th>

                {/* 12 Months Columns */}
                {MONTH_NAMES.map((m, mIdx) => (
                  <th
                    key={m}
                    className="py-3 px-2 min-w-[105px] font-semibold border-r border-slate-200 text-right"
                  >
                    <div>{m}</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {displayMode === 'both' ? 'Pagu / Aktual' : displayMode === 'actual' ? 'Aktual' : 'Pagu'}
                    </div>
                  </th>
                ))}

                {/* Summary Columns */}
                <th className="py-3 px-3 min-w-[120px] font-bold text-right border-r border-slate-200 bg-slate-100">
                  Total Pagu
                </th>
                <th className="py-3 px-3 min-w-[120px] font-bold text-right border-r border-slate-200 bg-emerald-50 text-emerald-900">
                  Total Realisasi
                </th>
                <th className="py-3 px-3 min-w-[110px] font-bold text-right border-r border-slate-200">
                  Sisa Saldo
                </th>
                <th className="py-3 px-3 min-w-[80px] font-semibold text-center border-r border-slate-200">
                  % Serap
                </th>
                <th className="py-3 px-3 min-w-[90px] font-semibold text-center sticky right-0 bg-slate-50 z-10 shadow-xs">
                  Aksi
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 font-mono">
              {paginatedItems.map((item, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                const isOver = item.totalActual > item.totalBudget && item.totalBudget > 0;
                const percent = item.totalBudget > 0 ? (item.totalActual / item.totalBudget) * 100 : 0;
                const balance = item.totalBudget - item.totalActual;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOver ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2.5 px-2 text-center text-slate-400 text-[11px] border-r border-slate-100 bg-white sticky left-0 z-10">
                      {globalIndex}
                    </td>

                    {/* #APBS Code */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-white sticky left-10 z-10">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        #{item.code}
                      </span>
                    </td>

                    {/* Item Name */}
                    <td className="py-2.5 px-3 font-sans border-r border-slate-100 bg-white sticky left-[115px] z-10 shadow-xs">
                      <div className="font-semibold text-slate-900 line-clamp-2" title={item.name}>
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono text-emerald-700">Kode #APBS: {item.code}</span>
                        {item.notes && (
                          <span
                            className="bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-sans"
                            title={item.notes}
                          >
                            {item.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 font-sans border-r border-slate-100 text-slate-700 text-[11px]">
                      <div className="font-medium text-slate-800 line-clamp-1">{item.category}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{item.subcategory}</div>
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2 font-sans border-r border-slate-100 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {item.unit}
                      </span>
                    </td>

                    {/* 12 Months Cells */}
                    {MONTH_NAMES.map((_, mIdx) => {
                      const budgetVal = item.monthlyBudget[mIdx] || 0;
                      const actualVal = item.monthlyActual[mIdx] || 0;
                      const isEditingBudget =
                        editingCell?.itemId === item.id &&
                        editingCell?.monthIndex === mIdx &&
                        editingCell?.type === 'budget';
                      const isEditingActual =
                        editingCell?.itemId === item.id &&
                        editingCell?.monthIndex === mIdx &&
                        editingCell?.type === 'actual';

                      return (
                        <td
                          key={mIdx}
                          className="py-2 px-2 border-r border-slate-100 text-right align-middle text-[11px]"
                        >
                          {/* When showing Budget or Both */}
                          {(displayMode === 'both' || displayMode === 'budget') && (
                            <div className="flex items-center justify-end">
                              {isEditingBudget ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingCell.value}
                                  onChange={(e) =>
                                    setEditingCell({ ...editingCell, value: e.target.value })
                                  }
                                  onBlur={handleSaveCell}
                                  onKeyDown={handleKeyDown}
                                  className="w-20 px-1 py-0.5 text-right font-mono text-xs border border-emerald-500 rounded bg-white shadow-xs focus:outline-none"
                                />
                              ) : (
                                <span
                                  onClick={() =>
                                    setEditingCell({
                                      itemId: item.id,
                                      monthIndex: mIdx,
                                      type: 'budget',
                                      value: budgetVal.toString(),
                                    })
                                  }
                                  className="cursor-pointer hover:bg-slate-100 px-1 rounded text-slate-500 hover:text-slate-900 transition-colors"
                                  title="Klik untuk ubah nilai Pagu Anggaran bulan ini"
                                >
                                  {budgetVal > 0 ? formatShortRupiah(budgetVal) : '-'}
                                </span>
                              )}
                            </div>
                          )}

                          {/* When showing Actual or Both */}
                          {(displayMode === 'both' || displayMode === 'actual') && (
                            <div className="flex items-center justify-end">
                              {isEditingActual ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingCell.value}
                                  onChange={(e) =>
                                    setEditingCell({ ...editingCell, value: e.target.value })
                                  }
                                  onBlur={handleSaveCell}
                                  onKeyDown={handleKeyDown}
                                  className="w-20 px-1 py-0.5 text-right font-mono text-xs border border-emerald-500 rounded bg-white shadow-xs focus:outline-none"
                                />
                              ) : (
                                <span
                                  onClick={() =>
                                    setEditingCell({
                                      itemId: item.id,
                                      monthIndex: mIdx,
                                      type: 'actual',
                                      value: actualVal.toString(),
                                    })
                                  }
                                  className={`cursor-pointer px-1 rounded transition-colors font-semibold ${
                                    actualVal > budgetVal && budgetVal > 0
                                      ? 'text-rose-600 bg-rose-50'
                                      : actualVal > 0
                                      ? 'text-emerald-700 hover:bg-emerald-50'
                                      : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'
                                  }`}
                                  title="Klik untuk ubah nilai Realisasi Aktual bulan ini"
                                >
                                  {actualVal > 0 ? formatShortRupiah(actualVal) : '-'}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Budget */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-100 bg-slate-50 font-bold text-slate-800 tabular-nums">
                      {formatRupiah(item.totalBudget)}
                    </td>

                    {/* Total Actual */}
                    <td
                      className={`py-2.5 px-3 text-right border-r border-slate-100 font-bold tabular-nums ${
                        isOver ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50/60 text-emerald-800'
                      }`}
                    >
                      {formatRupiah(item.totalActual)}
                    </td>

                    {/* Balance */}
                    <td
                      className={`py-2.5 px-3 text-right border-r border-slate-100 font-semibold tabular-nums ${
                        balance < 0 ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {formatRupiah(balance)}
                    </td>

                    {/* % Serap */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-100 tabular-nums">
                      <span
                        className={`font-semibold ${
                          isOver ? 'text-rose-600' : percent > 80 ? 'text-amber-600' : 'text-slate-700'
                        }`}
                      >
                        {formatPercent(percent)}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-2.5 px-2 text-center sticky right-0 bg-white z-10 shadow-xs">
                      <button
                        onClick={() => onOpenRecordModal(item.id)}
                        className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-md transition-colors"
                        title="Catat pengeluaran dana untuk mata anggaran ini"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination & Controls Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 border border-slate-200 rounded bg-white text-slate-800"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

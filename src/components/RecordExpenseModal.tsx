import React, { useState, useEffect } from 'react';
import { useApbs } from '../context/ApbsContext';
import { formatRupiah, formatShortRupiah, MONTH_NAMES, MONTH_YEARS } from '../utils/formatters';
import { X, AlertTriangle, CheckCircle, Calculator, Receipt, Calendar, User, Tag } from 'lucide-react';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId,
}) => {
  const { items, addTransaction } = useApbs();

  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || '');
  const [monthIndex, setMonthIndex] = useState<number>(0); // 0 = Juli 2026
  const [date, setDate] = useState<string>('2026-07-15');
  const [amount, setAmount] = useState<string>('');
  const [qty, setQty] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [pic, setPic] = useState<string>('Tim GA');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Kas GA' | 'Transfer Bank' | 'Reimbursement' | 'Petty Cash'>('Kas GA');
  const [itemSearch, setItemSearch] = useState<string>('');

  // Selected item object
  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Sync preselectedItemId
  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
      const it = items.find((i) => i.id === preselectedItemId);
      if (it) {
        if (it.unitPrice > 0) {
          setUnitPrice(it.unitPrice.toString());
          setAmount(it.unitPrice.toString());
        }
      }
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id);
    }
  }, [preselectedItemId, items]);

  // When selected item changes, auto-suggest unit price
  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    const it = items.find((i) => i.id === id);
    if (it && it.unitPrice > 0) {
      setUnitPrice(it.unitPrice.toString());
      const q = parseFloat(qty) || 1;
      setAmount((it.unitPrice * q).toString());
    }
  };

  // When Qty or Unit Price changes, auto calculate amount
  const handleQtyChange = (val: string) => {
    setQty(val);
    const qNum = parseFloat(val) || 0;
    const pNum = parseFloat(unitPrice.replace(/[^0-9]/g, '')) || 0;
    if (pNum > 0 && qNum > 0) {
      setAmount((qNum * pNum).toString());
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const pNum = parseFloat(val.replace(/[^0-9]/g, '')) || 0;
    const qNum = parseFloat(qty) || 1;
    if (pNum > 0) {
      setAmount((qNum * pNum).toString());
    }
  };

  if (!isOpen) return null;

  // Remaining budget calculations for selected item
  const currentItemBudget = selectedItem?.totalBudget || 0;
  const currentItemActual = selectedItem?.totalActual || 0;
  const currentItemRemaining = currentItemBudget - currentItemActual;

  const currentMonthBudget = selectedItem?.monthlyBudget[monthIndex] || 0;
  const currentMonthActual = selectedItem?.monthlyActual[monthIndex] || 0;
  const currentMonthRemaining = currentMonthBudget - currentMonthActual;

  const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;
  const isOverMonth = parsedAmount > currentMonthRemaining && currentMonthBudget > 0;
  const isOverTotal = parsedAmount > currentItemRemaining && currentItemBudget > 0;

  // Filtered items list with smart #APBS code prioritization
  const filteredOptions = items.filter((it) => {
    if (!itemSearch.trim()) return true;
    const q = itemSearch.toLowerCase().trim();
    const qClean = q.replace(/^#/, '').trim();
    return (
      it.code.toLowerCase().includes(qClean) ||
      it.id.toLowerCase().includes(qClean) ||
      it.name.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      it.unit.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (!itemSearch.trim()) return 0;
    const qClean = itemSearch.toLowerCase().replace(/^#/, '').trim();
    const aExact = a.code.toLowerCase() === qClean;
    const bExact = b.code.toLowerCase() === qClean;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    const aStarts = a.code.toLowerCase().startsWith(qClean);
    const bStarts = b.code.toLowerCase().startsWith(qClean);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || parsedAmount <= 0) return;

    addTransaction({
      itemId: selectedItem.id, // Sesuai kode #APBS
      itemName: selectedItem.name,
      category: selectedItem.category,
      subcategory: selectedItem.subcategory,
      unit: selectedItem.unit,
      monthIndex,
      date,
      amount: parsedAmount,
      qty: parseFloat(qty) || 1,
      unitPrice: parseFloat(unitPrice.replace(/[^0-9]/g, '')) || parsedAmount,
      invoiceNo: invoiceNo.trim() || `KW-${Date.now().toString().slice(-6)}`,
      pic: pic.trim() || 'Staf GA',
      description: description.trim() || `Pengeluaran ${selectedItem.name}`,
      paymentMethod,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Catat Realisasi Penggunaan Dana APBS
            </h3>
            <p className="text-xs text-slate-500">
              Pilih pos anggaran sesuai kode <strong>#APBS</strong> untuk memotong saldo pagu secara real-time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Item Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Pilih Mata Anggaran Sesuai Kode #APBS *
              </label>
              <span className="text-[11px] text-emerald-700 font-mono">
                Cari kode misal: 130, 163, 348
              </span>
            </div>
            <div className="relative mb-1.5">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Cari kode #APBS (misal: 130) atau nama mata anggaran (Bensin, AC, Satpam)..."
                className="w-full py-1.5 pl-3 pr-8 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              {itemSearch && (
                <button
                  type="button"
                  onClick={() => setItemSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              required
              className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              {filteredOptions.slice(0, 100).map((it) => (
                <option key={it.id} value={it.id}>
                  [#APBS {it.code}] {it.name} ({it.unit}) • Sisa: {formatShortRupiah(it.totalBudget - it.totalActual)}
                </option>
              ))}
            </select>
          </div>

          {/* Item Budget Status Card */}
          {selectedItem && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    #APBS {selectedItem.code}
                  </span>
                  <span className="font-semibold text-slate-900">{selectedItem.name}</span>
                </div>
                <span className="text-[11px] font-medium text-slate-500">Unit: {selectedItem.unit}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block font-sans text-[10px]">Pagu Tahunan:</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(currentItemBudget)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans text-[10px]">Sudah Terpakai:</span>
                  <span className="font-semibold text-emerald-700">{formatRupiah(currentItemActual)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans text-[10px]">Sisa Pagu:</span>
                  <span
                    className={`font-semibold ${
                      currentItemRemaining < 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {formatRupiah(currentItemRemaining)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Month & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alokasi Bulan Pengeluaran *
              </label>
              <select
                value={monthIndex}
                onChange={(e) => setMonthIndex(parseInt(e.target.value, 10))}
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {MONTH_YEARS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m} (Alokasi: {formatShortRupiah(selectedItem?.monthlyBudget[idx] || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Transaksi *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
              </input>
            </div>
          </div>

          {/* Qty, Unit Price & Total Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah (Qty)</label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={qty}
                onChange={(e) => handleQtyChange(e.target.value)}
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Satuan (@Rp)</label>
              <input
                type="text"
                value={unitPrice}
                onChange={(e) => handleUnitPriceChange(e.target.value)}
                placeholder="misal: 25.000"
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Nominal (Rp) *
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="misal: 500000"
                required
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          {/* Budget Warning if over limit */}
          {isOverTotal && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Peringatan Pagu Terlampaui:</strong> Pengeluaran sebesar{' '}
                <span className="font-mono">{formatRupiah(parsedAmount)}</span> melebihi sisa pagu tahunan item ini ({formatRupiah(currentItemRemaining)}).
              </div>
            </div>
          )}

          {/* Invoice & PIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. Bukti / Nota / Kuitansi
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Contoh: BKK-07/26/012 atau Nota #881"
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PIC / Pemohon / Penerima *
              </label>
              <input
                type="text"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                placeholder="Nama PIC GA (misal: Pak Soleh, Pak Mulyadi)"
                required
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Kas GA', 'Transfer Bank', 'Reimbursement', 'Petty Cash'] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === method
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Uraian & Keterangan Penggunaan Dana
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rincian penggunaan dana, tujuan belanja, atau keterangan kelengkapan..."
              className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={parsedAmount <= 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Simpan & Potong Anggaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

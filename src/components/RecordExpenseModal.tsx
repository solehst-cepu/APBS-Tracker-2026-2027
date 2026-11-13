import React, { useState, useEffect, useMemo } from 'react';
import { useApbs } from '../context/ApbsContext';
import {
  DisbursementMethod,
  ExpenseTransaction,
  FormRequestType,
  TEMPLATE_ENTITIES,
} from '../types/apbs';
import { formatRupiah, formatShortRupiah, MONTH_YEARS } from '../utils/formatters';
import {
  buildDocumentFromTransactions,
  DEFAULT_APPROVERS,
  exportPengajuanDanaToPdf,
  PengajuanDanaDocumentData,
} from '../utils/pengajuanDanaPdf';
import {
  X,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

interface FormRowState {
  rowKey: string;
  itemId: string;
  itemSearch: string;
  date: string;
  monthIndex: number;
  qty: string;
  unitPrice: string;
  amount: string;
  notes: string;
}

function getMonthRoman(dateStr: string): string {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const parts = dateStr.split('-');
  const m = parseInt(parts[1] || '1', 10);
  return romans[m - 1] || 'I';
}

function mapDisbursementToPaymentMethod(
  method: DisbursementMethod,
  formType: FormRequestType
): ExpenseTransaction['paymentMethod'] {
  if (formType === 'Klaim/Laporan Pengeluaran' && method === 'Transfer') return 'Reimbursement';
  if (method === 'Transfer') return 'Transfer Bank';
  if (method === 'Tunai') return 'Kas GA';
  return 'Petty Cash';
}

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId,
}) => {
  const { items, addBatchTransactions, googleUser } = useApbs();

  const todayIso = useMemo(() => {
    const now = new Date();
    // Keep within TA 2026-2027 by default if current date is before July 2026 or just use current date
    return now.toISOString().slice(0, 10);
  }, []);

  const [formType, setFormType] = useState<FormRequestType>('Pengajuan Dana Kegiatan');
  const [disbursementMethod, setDisbursementMethod] = useState<DisbursementMethod>('Transfer');
  const [submissionDate, setSubmissionDate] = useState<string>(todayIso);
  const [executionDate, setExecutionDate] = useState<string>(todayIso);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [refEditedManually, setRefEditedManually] = useState<boolean>(false);

  const [requesterName, setRequesterName] = useState<string>(
    googleUser?.displayName || 'Tim GA'
  );
  const [unitHead, setUnitHead] = useState<string>(DEFAULT_APPROVERS.kepUnit);
  const [department, setDepartment] = useState<string>('Umum');
  const [purpose, setPurpose] = useState<string>('');
  const [checkedEntities, setCheckedEntities] = useState<string[]>(['Direktorat']);
  const [isApbs, setIsApbs] = useState<boolean>(true);

  const [saldoDiterima, setSaldoDiterima] = useState<string>('0');
  const [sisaDikembalikanMethod, setSisaDikembalikanMethod] = useState<'Tunai' | 'Transfer'>('Tunai');

  const [showApprovers, setShowApprovers] = useState<boolean>(false);
  const [approvers, setApprovers] = useState({ ...DEFAULT_APPROVERS });

  const createDefaultRow = (itemId?: string): FormRowState => {
    const found =
      (itemId ? items.find((i) => i.id === itemId) : items[0]) || items[0];
    const price = found?.unitPrice && found.unitPrice > 0 ? found.unitPrice.toString() : '';
    return {
      rowKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId: found?.id || '',
      itemSearch: '',
      date: todayIso,
      monthIndex: 3, // Oktober 2026 default or dynamic
      qty: '1',
      unitPrice: price,
      amount: price,
      notes: '',
    };
  };

  const [rows, setRows] = useState<FormRowState[]>(() => [createDefaultRow(preselectedItemId)]);

  // Update default requester from signed-in Google account when available
  useEffect(() => {
    if (googleUser?.displayName && requesterName === 'Tim GA') {
      setRequesterName(googleUser.displayName);
    }
  }, [googleUser]);

  // Sync preselectedItemId when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const targetId = preselectedItemId || items[0]?.id || '';
    const it = items.find((i) => i.id === targetId);
    const price = it?.unitPrice && it.unitPrice > 0 ? it.unitPrice.toString() : '';
    setRows([
      {
        rowKey: `row-${Date.now()}`,
        itemId: targetId,
        itemSearch: '',
        date: submissionDate,
        monthIndex: 3,
        qty: '1',
        unitPrice: price,
        amount: price,
        notes: '',
      },
    ]);
    setRefEditedManually(false);
  }, [isOpen, preselectedItemId]);

  // Auto-generate Reference No unless edited manually
  useEffect(() => {
    if (refEditedManually) return;
    const primaryCode = rows[0]?.itemId || 'GA';
    const roman = getMonthRoman(submissionDate);
    const suffix = formType === 'Klaim/Laporan Pengeluaran' ? 'Klaim' : 'Pengajuan';
    setReferenceNo(`PD-GA-${roman}-26-${primaryCode}-${suffix}`);
  }, [rows[0]?.itemId, submissionDate, formType, refEditedManually]);

  if (!isOpen) return null;

  const updateRow = (rowKey: string, patch: Partial<FormRowState>) => {
    setRows((prev) =>
      prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r))
    );
  };

  const handleRowItemChange = (rowKey: string, newItemId: string) => {
    const it = items.find((i) => i.id === newItemId);
    const currentRow = rows.find((r) => r.rowKey === rowKey);
    const q = parseFloat(currentRow?.qty || '1') || 1;
    const p = it?.unitPrice && it.unitPrice > 0 ? it.unitPrice : 0;
    updateRow(rowKey, {
      itemId: newItemId,
      unitPrice: p > 0 ? p.toString() : currentRow?.unitPrice || '',
      amount: p > 0 ? (p * q).toString() : currentRow?.amount || '',
    });
  };

  const handleRowQtyChange = (rowKey: string, qtyVal: string) => {
    const currentRow = rows.find((r) => r.rowKey === rowKey);
    const qNum = parseFloat(qtyVal) || 0;
    const pNum = parseFloat((currentRow?.unitPrice || '').replace(/[^0-9]/g, '')) || 0;
    updateRow(rowKey, {
      qty: qtyVal,
      amount: qNum > 0 && pNum > 0 ? (qNum * pNum).toString() : currentRow?.amount || '',
    });
  };

  const handleRowPriceChange = (rowKey: string, priceVal: string) => {
    const currentRow = rows.find((r) => r.rowKey === rowKey);
    const pNum = parseFloat(priceVal.replace(/[^0-9]/g, '')) || 0;
    const qNum = parseFloat(currentRow?.qty || '1') || 1;
    updateRow(rowKey, {
      unitPrice: priceVal,
      amount: pNum > 0 ? (pNum * qNum).toString() : currentRow?.amount || '',
    });
  };

  const toggleEntity = (entity: string) => {
    setCheckedEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  const getFilteredItems = (searchQuery: string) => {
    return items
      .filter((it) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const qClean = q.replace(/^#/, '').trim();
        return (
          it.code.toLowerCase().includes(qClean) ||
          it.id.toLowerCase().includes(qClean) ||
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.unit.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (!searchQuery.trim()) return 0;
        const qClean = searchQuery.toLowerCase().replace(/^#/, '').trim();
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
  };

  // Compute totals & budget preview across all rows
  const parsedRows = rows.map((r) => {
    const item = items.find((i) => i.id === r.itemId);
    const amountNum = parseFloat(r.amount.replace(/[^0-9]/g, '')) || 0;
    const qtyNum = parseFloat(r.qty) || 1;
    const unitPriceNum = parseFloat(r.unitPrice.replace(/[^0-9]/g, '')) || amountNum;
    const saldoAwal = item ? item.totalBudget - item.totalActual : 0;
    const saldoAkhir = saldoAwal - amountNum;
    return { row: r, item, amountNum, qtyNum, unitPriceNum, saldoAwal, saldoAkhir };
  });

  const totalPengajuan = parsedRows.reduce((s, r) => s + r.amountNum, 0);
  const uniqueCodeBalance = new Map<string, number>();
  parsedRows.forEach((pr) => {
    if (pr.item && !uniqueCodeBalance.has(pr.item.code)) {
      uniqueCodeBalance.set(pr.item.code, pr.saldoAwal);
    }
  });
  let totalAnggaranAwal = 0;
  uniqueCodeBalance.forEach((v) => {
    totalAnggaranAwal += v;
  });
  const penyerapanPct = totalAnggaranAwal > 0 ? (totalPengajuan / totalAnggaranAwal) * 100 : 0;
  const totalDanaTersisa = totalAnggaranAwal - totalPengajuan;
  const hasOverBudgetRow = parsedRows.some(
    (pr) => pr.item && pr.item.totalBudget > 0 && pr.amountNum > pr.saldoAwal
  );

  const parsedSaldoDiterima = parseFloat(saldoDiterima.replace(/[^0-9]/g, '')) || 0;

  const buildPayloadTransactions = (): Omit<ExpenseTransaction, 'id' | 'createdAt'>[] => {
    const pm = mapDisbursementToPaymentMethod(disbursementMethod, formType);
    const refClean = referenceNo.trim() || `PD-GA-${Date.now().toString().slice(-6)}`;

    return parsedRows
      .filter((pr) => pr.item && pr.amountNum > 0)
      .map((pr) => {
        const it = pr.item!;
        return {
          itemId: it.id,
          itemName: it.name,
          category: it.category,
          subcategory: it.subcategory,
          unit: it.unit,
          monthIndex: pr.row.monthIndex,
          date: pr.row.date || submissionDate,
          amount: pr.amountNum,
          qty: pr.qtyNum,
          unitPrice: pr.unitPriceNum,
          invoiceNo: refClean,
          pic: requesterName.trim() || 'Tim GA',
          description:
            pr.row.notes.trim() ||
            purpose.trim() ||
            `${formType} - ${it.name}`,
          paymentMethod: pm,
          formMeta: {
            formType,
            referenceNo: refClean,
            executionDate,
            unitHead: unitHead.trim() || DEFAULT_APPROVERS.kepUnit,
            department: department.trim() || it.unit || 'Umum',
            purpose: purpose.trim() || pr.row.notes.trim() || it.name,
            disbursementMethod,
            checkedEntities,
            isApbs,
            saldoDiterima: formType === 'Klaim/Laporan Pengeluaran' ? parsedSaldoDiterima : 0,
            sisaDikembalikanMethod,
            saldoAwalSnapshot: pr.saldoAwal,
            saldoAkhirSnapshot: pr.saldoAkhir,
            approvers,
          },
        };
      });
  };

  const buildPreviewPdfData = (): PengajuanDanaDocumentData | null => {
    const payloads = buildPayloadTransactions();
    if (payloads.length === 0) return null;
    const dummyTxs: ExpenseTransaction[] = payloads.map((p, idx) => ({
      ...p,
      id: `draft-${idx}`,
      createdAt: new Date().toISOString(),
    }));
    return buildDocumentFromTransactions(dummyTxs[0], dummyTxs, items, true);
  };

  const handleExportPdfOnly = () => {
    const docData = buildPreviewPdfData();
    if (!docData) return;
    exportPengajuanDanaToPdf(docData);
  };

  const handleSubmit = (alsoExportPdf: boolean) => {
    const payloads = buildPayloadTransactions();
    if (payloads.length === 0) return;

    if (alsoExportPdf) {
      const docData = buildPreviewPdfData();
      if (docData) exportPengajuanDanaToPdf(docData);
    }

    addBatchTransactions(payloads);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Formulir Pengajuan Dana / Klaim Pengeluaran APBS
              </h3>
              <p className="text-xs text-slate-500">
                Sesuai format Lembaran Pengajuan Dana Lazuardi GCS · Dapat langsung di-export ke PDF &amp; memotong pagu APBS real-time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
          className="mt-4 space-y-4 text-xs"
        >
          {/* Section 1: Jenis Formulir & No Referensi */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jenis Formulir *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    ['Pengajuan Dana Kegiatan', 'Klaim/Laporan Pengeluaran'] as FormRequestType[]
                  ).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setFormType(t)}
                      className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                        formType === t
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  No. Referensi Laporan *
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => {
                    setRefEditedManually(true);
                    setReferenceNo(e.target.value);
                  }}
                  required
                  placeholder="PD-GA-X-26-164-Reimbursement"
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Status Anggaran
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsApbs(true)}
                    className={`py-2 rounded-lg border text-[11px] font-bold ${
                      isApbs
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    APBS: YA
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApbs(false)}
                    className={`py-2 rounded-lg border text-[11px] font-bold ${
                      !isApbs
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    NON-APBS
                  </button>
                </div>
              </div>
            </div>

            {/* Unit / Entitas Checklist */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Centang Unit / Entitas / Panitia Terkait
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_ENTITIES.map((ent) => {
                  const active = checkedEntities.includes(ent);
                  return (
                    <button
                      type="button"
                      key={ent}
                      onClick={() => toggleEntity(ent)}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {active ? '✓ ' : ''}
                      {ent}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Identitas Pemohon, Metode Pencairan & Tujuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama Pemohon / PJ *
              </label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                required
                placeholder="misal: Slamet Ariyanto"
                className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kepala Unit *
              </label>
              <input
                type="text"
                value={unitHead}
                onChange={(e) => setUnitHead(e.target.value)}
                required
                className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Department / Unit
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Umum / GA / SD / SMP"
                className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Metode Pencairan Dana
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['Tunai', 'Transfer', 'Lainnya'] as DisbursementMethod[]).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setDisbursementMethod(m)}
                    className={`py-2 px-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                      disbursementMethod === m
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tanggal Pengajuan *
              </label>
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                required
                className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tgl Pelaksanaan
              </label>
              <input
                type="date"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
                className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tujuan Permintaan Dana / Laporan *
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                placeholder="Contoh: Pengajuan operasional atau Reimbursement ke Sekolah Lazuardi GCS"
                className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Section 3: Rincian Baris Anggaran (#APBS) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Rincian Penggunaan Anggaran (Sesuai Kode Rek. #APBS)
              </label>
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, createDefaultRow()])}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold text-[11px] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris #APBS</span>
              </button>
            </div>

            <div className="space-y-3">
              {parsedRows.map((pr, idx) => {
                const { row, item, saldoAwal, saldoAkhir } = pr;
                const filteredOpts = getFilteredItems(row.itemSearch);

                return (
                  <div
                    key={row.rowKey}
                    className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 text-white rounded font-bold text-[10px]">
                          Baris #{idx + 1}
                        </span>
                        {item && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-mono font-bold text-[11px]">
                            #APBS {item.code} · {item.unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span>
                          Saldo Awal:{' '}
                          <strong className="text-slate-900">{formatRupiah(saldoAwal)}</strong>
                        </span>
                        <span>→</span>
                        <span>
                          Saldo Akhir:{' '}
                          <strong
                            className={saldoAkhir < 0 ? 'text-rose-600' : 'text-emerald-700'}
                          >
                            {formatRupiah(saldoAkhir)}
                          </strong>
                        </span>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRows((prev) => prev.filter((r) => r.rowKey !== row.rowKey))
                            }
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item Search + Dropdown */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-4">
                        <input
                          type="text"
                          value={row.itemSearch}
                          onChange={(e) => updateRow(row.rowKey, { itemSearch: e.target.value })}
                          placeholder="Filter kode #APBS (misal: 164)..."
                          className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-8">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleRowItemChange(row.rowKey, e.target.value)}
                          required
                          className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {filteredOpts.slice(0, 100).map((it) => (
                            <option key={it.id} value={it.id}>
                              [#APBS {it.code}] {it.name} ({it.unit}) • Sisa:{' '}
                              {formatShortRupiah(it.totalBudget - it.totalActual)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Date, Month, Qty, @Rp, Jumlah */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Tanggal Nota
                        </label>
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(row.rowKey, { date: e.target.value })}
                          className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Alokasi Bulan APBS
                        </label>
                        <select
                          value={row.monthIndex}
                          onChange={(e) =>
                            updateRow(row.rowKey, { monthIndex: parseInt(e.target.value, 10) })
                          }
                          className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          {MONTH_YEARS.map((m, mIdx) => (
                            <option key={m} value={mIdx}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={row.qty}
                          onChange={(e) => handleRowQtyChange(row.rowKey, e.target.value)}
                          className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          @ Rp
                        </label>
                        <input
                          type="text"
                          value={row.unitPrice}
                          onChange={(e) => handleRowPriceChange(row.rowKey, e.target.value)}
                          placeholder="72000"
                          className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Jumlah (Rp) *
                        </label>
                        <input
                          type="text"
                          value={row.amount}
                          onChange={(e) => updateRow(row.rowKey, { amount: e.target.value })}
                          required
                          placeholder="72000"
                          className="w-full py-1.5 px-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-800 text-xs"
                        />
                      </div>
                    </div>

                    {/* Keterangan Pencairan Dana Kegiatan */}
                    <div>
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateRow(row.rowKey, { notes: e.target.value })}
                        placeholder="Keterangan Pencairan Dana Kegiatan (misal: Pembelian/Reimbursement, Note: Transfer ke ...)"
                        className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional Laporan Pengeluaran Saldo Diterima */}
          {formType === 'Klaim/Laporan Pengeluaran' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Saldo Diterima Sebelumnya (Rp)
                </label>
                <input
                  type="text"
                  value={saldoDiterima}
                  onChange={(e) => setSaldoDiterima(e.target.value)}
                  placeholder="0"
                  className="w-full py-1.5 px-3 bg-white border border-amber-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Metode Pengembalian Sisa
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Tunai', 'Transfer'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setSisaDikembalikanMethod(m)}
                      className={`py-1.5 rounded-lg border text-[11px] font-semibold ${
                        sisaDikembalikanMethod === m
                          ? 'bg-amber-800 text-white border-amber-800'
                          : 'bg-white text-amber-900 border-amber-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-[11px] text-amber-900 font-mono space-y-0.5">
                <div>
                  Hutang ke Yayasan:{' '}
                  <strong>
                    {formatRupiah(
                      parsedSaldoDiterima > 0 && totalPengajuan > parsedSaldoDiterima
                        ? totalPengajuan - parsedSaldoDiterima
                        : 0
                    )}
                  </strong>
                </div>
                <div>
                  Sisa Dikembalikan:{' '}
                  <strong>
                    {formatRupiah(
                      parsedSaldoDiterima > 0 && parsedSaldoDiterima > totalPengajuan
                        ? parsedSaldoDiterima - totalPengajuan
                        : 0
                    )}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Approvers Toggle */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowApprovers((v) => !v)}
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>
                Pejabat Persetujuan Lembaran ({approvers.kepUnit} · {approvers.depKeuangan} ·{' '}
                {approvers.deputyGm} · {approvers.direktorat})
              </span>
              {showApprovers ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {showApprovers && (
              <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border-t border-slate-200">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Kep. Unit
                  </label>
                  <input
                    type="text"
                    value={approvers.kepUnit}
                    onChange={(e) => setApprovers((p) => ({ ...p, kepUnit: e.target.value }))}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Dep. Keuangan
                  </label>
                  <input
                    type="text"
                    value={approvers.depKeuangan}
                    onChange={(e) => setApprovers((p) => ({ ...p, depKeuangan: e.target.value }))}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Deputy GM
                  </label>
                  <input
                    type="text"
                    value={approvers.deputyGm}
                    onChange={(e) => setApprovers((p) => ({ ...p, deputyGm: e.target.value }))}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Direktorat
                  </label>
                  <input
                    type="text"
                    value={approvers.direktorat}
                    onChange={(e) => setApprovers((p) => ({ ...p, direktorat: e.target.value }))}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Over/(Under) Budget Live Summary Strip */}
          <div className="p-3 bg-slate-900 text-white rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Saldo Anggaran Awal</span>
              <span className="font-mono font-bold">{formatRupiah(totalAnggaranAwal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Total Pengajuan</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatRupiah(totalPengajuan)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Penyerapan</span>
              <span className="font-mono font-bold">{penyerapanPct.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Dana Tersisa</span>
              <span
                className={`font-mono font-bold ${
                  totalDanaTersisa < 0 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {formatRupiah(totalDanaTersisa)}
              </span>
            </div>
          </div>

          {hasOverBudgetRow && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Peringatan Pagu Terlampaui:</strong> Salah satu pos #APBS melebihi sisa pagu tahunannya.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleExportPdfOnly}
              disabled={totalPengajuan <= 0}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Unduh PDF Saja</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={totalPengajuan <= 0}
                className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Simpan Transaksi</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={totalPengajuan <= 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Simpan &amp; Export PDF</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

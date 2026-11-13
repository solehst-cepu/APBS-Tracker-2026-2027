export type FormRequestType = 'Pengajuan Dana Kegiatan' | 'Klaim/Laporan Pengeluaran';
export type DisbursementMethod = 'Tunai' | 'Transfer' | 'Lainnya';

export const TEMPLATE_ENTITIES = [
  'ASEO',
  'CRM',
  'HRD',
  'LAZMART',
  'LIBRARY',
  'Direktorat',
  'Panitia',
  'PELANGI',
  'SD',
  'SMP',
] as const;

export interface PengajuanDanaApprovers {
  kepUnit: string;
  depKeuangan: string;
  deputyGm: string;
  direktorat: string;
}

export interface PengajuanDanaMetadata {
  formType?: FormRequestType;
  referenceNo?: string;
  executionDate?: string; // YYYY-MM-DD (Tgl Pelaksanaan)
  unitHead?: string; // Kepala Unit (default: Soleh Sohibudin)
  department?: string; // Department / Unit (e.g. Umum)
  purpose?: string; // Tujuan Permintaan Dana/Laporan
  disbursementMethod?: DisbursementMethod; // Tunai | Transfer | Lainnya
  checkedEntities?: string[];
  isApbs?: boolean;
  saldoDiterima?: number;
  sisaDikembalikanMethod?: 'Tunai' | 'Transfer';
  saldoAwalSnapshot?: number;
  saldoAkhirSnapshot?: number;
  approvers?: PengajuanDanaApprovers;
}

export interface ApbsBudgetItem {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  unitPrice: number;
  monthlyBudget: number[]; // 12 elements: Index 0 = Juli 2026 ... Index 11 = Juni 2027
  monthlyActual: number[]; // 12 elements: Index 0 = Juli 2026 ... Index 11 = Juni 2027
  totalBudget: number;
  totalActual: number;
  isOperationalApbs: boolean;
  notes?: string;
}

export interface ExpenseTransaction {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  subcategory?: string;
  unit: string;
  monthIndex: number; // 0..11 (0=Juli 2026, 11=Juni 2027)
  date: string; // YYYY-MM-DD
  amount: number;
  qty?: number;
  unitPrice?: number;
  invoiceNo?: string;
  pic: string;
  description: string;
  paymentMethod?: 'Kas GA' | 'Transfer Bank' | 'Reimbursement' | 'Petty Cash';
  formMeta?: PengajuanDanaMetadata;
  createdAt: string;
}

export type ViewTab = 'dashboard' | 'spreadsheet' | 'transactions' | 'reports';

export interface CategorySummary {
  category: string;
  totalBudget: number;
  totalActual: number;
  remaining: number;
  percentUsed: number;
  itemCount: number;
}

export interface UnitSummary {
  unit: string;
  totalBudget: number;
  totalActual: number;
  remaining: number;
  percentUsed: number;
  itemCount: number;
}

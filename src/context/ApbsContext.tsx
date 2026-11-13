import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { ApbsBudgetItem, ExpenseTransaction, CategorySummary, UnitSummary } from '../types/apbs';
import { INITIAL_APBS_ITEMS } from '../data/initialApbsData';
import { INITIAL_TRANSACTIONS } from '../data/sampleTransactions';
import {
  initAuth,
  googleSignIn,
  googleSignInRedirect,
  checkRedirectAuthResult,
  parseFirebaseAuthError,
  ParsedAuthError,
  DomainNotAllowedError,
  isAllowedSchoolEmail,
  logout as googleLogout,
  clearAccessToken,
} from '../services/googleAuth';
import {
  SpreadsheetInfo,
  AuthExpiredError,
  DB_SPREADSHEET_TITLE,
  findExistingDatabaseSpreadsheet,
  getSpreadsheetMetadata,
  extractSpreadsheetId,
  createAndPopulateDatabase,
  readDatabaseFromSheets,
  overwriteAllToSheets,
  syncSingleItemAndAppendTransaction,
  syncSingleItemRowToSheets,
} from '../services/googleSheetsDb';
import { formatRupiah, MONTH_YEARS } from '../utils/formatters';

export interface PendingSheetConfirmation {
  id: string;
  actionType:
    | 'create_db'
    | 'push_all'
    | 'pull_from_sheet'
    | 'record_tx'
    | 'edit_cell'
    | 'link_sheet';
  title: string;
  description: string;
  targetSpreadsheetName: string;
  details: { label: string; value: string }[];
  confirmLabel: string;
  localOnlyLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
  onLocalOnly?: () => void;
}

interface ApbsContextType {
  items: ApbsBudgetItem[];
  transactions: ExpenseTransaction[];
  categories: string[];
  units: string[];
  filterOnlyOperational: boolean;
  setFilterOnlyOperational: (val: boolean) => void;
  // Calculations
  totalBudget: number;
  totalActual: number;
  remainingBudget: number;
  progressPercent: number;
  monthlyStats: {
    monthIndex: number;
    monthName: string;
    budget: number;
    actual: number;
    balance: number;
    percent: number;
  }[];
  categorySummaries: CategorySummary[];
  unitSummaries: UnitSummary[];
  overBudgetItems: ApbsBudgetItem[];
  nearLimitItems: ApbsBudgetItem[];
  // Actions
  addTransaction: (tx: Omit<ExpenseTransaction, 'id' | 'createdAt'>) => void;
  addBatchTransactions: (txList: Omit<ExpenseTransaction, 'id' | 'createdAt'>[]) => void;
  updateTransaction: (id: string, updated: Partial<ExpenseTransaction>) => void;
  deleteTransaction: (id: string, alsoSyncSheets?: boolean) => Promise<void>;
  updateCell: (itemId: string, monthIndex: number, type: 'budget' | 'actual', value: number) => void;
  updateItemDetails: (itemId: string, updates: Partial<ApbsBudgetItem>) => void;
  addItem: (item: Omit<ApbsBudgetItem, 'id'>) => void;
  deleteItem: (itemId: string) => void;
  resetToDefault: (alsoSyncSheets?: boolean) => Promise<void>;
  exportDataJson: () => void;
  importDataJson: (jsonString: string) => boolean;
  // Google Sheets & Auth
  googleUser: User | null;
  needsAuth: boolean;
  isCheckingAuth: boolean;
  isLoggingIn: boolean;
  isSheetsConnected: boolean;
  spreadsheetInfo: SpreadsheetInfo | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  authErrorInfo: ParsedAuthError | null;
  clearSyncError: () => void;
  syncNotice: string | null;
  clearSyncNotice: () => void;
  isSheetsModalOpen: boolean;
  setIsSheetsModalOpen: (open: boolean) => void;
  pendingSheetConfirm: PendingSheetConfirmation | null;
  closePendingSheetConfirm: () => void;
  handleGoogleLogin: () => Promise<void>;
  handleGoogleLoginRedirect: () => Promise<void>;
  handleGoogleLogout: () => Promise<void>;
  requestCreateSheetsDb: () => void;
  requestPushAllToSheets: () => void;
  requestPullFromSheets: () => void;
  linkSpreadsheetByUrlOrId: (input: string) => Promise<void>;
}

const STORAGE_KEY_ITEMS = 'lazuardi_apbs_items_v3';
const STORAGE_KEY_TRANSACTIONS = 'lazuardi_apbs_transactions_v3';
const STORAGE_KEY_GSHEET_ID = 'lazuardi_gsheet_db_id_v1';

const MONTH_NAMES = [
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
];

const ApbsContext = createContext<ApbsContextType | undefined>(undefined);

function buildInitialItems(): ApbsBudgetItem[] {
  const baseItems = JSON.parse(JSON.stringify(INITIAL_APBS_ITEMS)) as ApbsBudgetItem[];
  INITIAL_TRANSACTIONS.forEach((tx) => {
    const it = baseItems.find(
      (i) => i.id === tx.itemId || i.name.toLowerCase() === tx.itemName.toLowerCase()
    );
    if (it && tx.monthIndex >= 0 && tx.monthIndex < 12) {
      it.monthlyActual[tx.monthIndex] = (it.monthlyActual[tx.monthIndex] || 0) + tx.amount;
      it.totalActual = it.monthlyActual.reduce((a, b) => a + b, 0);
    }
  });
  return baseItems;
}

export const ApbsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filterOnlyOperational, setFilterOnlyOperational] = useState<boolean>(true);

  // Local Items
  const [items, setItems] = useState<ApbsBudgetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse items from localStorage', e);
    }
    return buildInitialItems();
  });

  // Local Transactions
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse transactions from localStorage', e);
    }
    return INITIAL_TRANSACTIONS;
  });

  // Google Auth & Sheets state (token kept ONLY in React state / memory module)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authErrorInfo, setAuthErrorInfo] = useState<ParsedAuthError | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [pendingSheetConfirm, setPendingSheetConfirm] =
    useState<PendingSheetConfirmation | null>(null);

  const isSheetsConnected = Boolean(accessToken && spreadsheetInfo && !needsAuth);

  // Initialize Firebase Auth listener & check pending redirect sign-in result
  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        if (!isAllowedSchoolEmail(user.email)) {
          setGoogleUser(null);
          setAccessToken(null);
          setNeedsAuth(true);
          return;
        }
        setGoogleUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      (user, rejectedEmail) => {
        setGoogleUser(user);
        setAccessToken(null);
        setNeedsAuth(true);
        if (rejectedEmail) {
          const parsed = parseFirebaseAuthError(new DomainNotAllowedError(rejectedEmail));
          setAuthErrorInfo(parsed);
          setSyncError(parsed.message);
        }
      }
    );

    let isMounted = true;
    (async () => {
      try {
        const redirectRes = await checkRedirectAuthResult();
        if (isMounted && redirectRes) {
          setGoogleUser(redirectRes.user);
          setAccessToken(redirectRes.accessToken);
          setNeedsAuth(false);
          setAuthErrorInfo(null);
          setSyncError(null);
          await autoDiscoverAndConnect(redirectRes.accessToken, redirectRes.user.email);
        }
      } catch (err) {
        if (isMounted) {
          const parsed = parseFirebaseAuthError(err);
          setAuthErrorInfo(parsed);
          setSyncError(parsed.message);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Persist items locally as offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items to localStorage', e);
    }
  }, [items]);

  // Persist transactions locally as offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions to localStorage', e);
    }
  }, [transactions]);

  const handleSheetsError = (err: unknown) => {
    if (err instanceof AuthExpiredError) {
      clearAccessToken();
      setAccessToken(null);
      setNeedsAuth(true);
      setSyncError(err.message);
    } else {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengakses Google Sheets.';
      setSyncError(msg);
    }
  };

  // Connect & auto-discover spreadsheet on login
  const autoDiscoverAndConnect = async (token: string, userEmail?: string | null) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_GSHEET_ID);
      const found = await findExistingDatabaseSpreadsheet(token, savedId);

      if (found) {
        setSpreadsheetInfo(found);
        localStorage.setItem(STORAGE_KEY_GSHEET_ID, found.spreadsheetId);

        // Read existing data from Google Sheets automatically (read-only)
        const remote = await readDatabaseFromSheets(token, found);
        if (remote.items.length > 0) {
          setItems(remote.items);
          setTransactions(remote.transactions);
        }
        setLastSyncedAt(new Date().toISOString());
        setSyncNotice(
          `Terhubung otomatis ke database Google Sheets "${found.title}" (${remote.items.length} pos anggaran dimuat).`
        );
      } else {
        // Not found yet -> Prompt user confirmation before creating spreadsheet
        setPendingSheetConfirm({
          id: `create-${Date.now()}`,
          actionType: 'create_db',
          title: 'Buat Database Baru di Google Sheets?',
          description:
            'Database APBS 2026 GA belum ditemukan di Google Drive Anda. Izinkan aplikasi membuat spreadsheet baru dan mengisi seluruh data anggaran serta transaksi awal?',
          targetSpreadsheetName: DB_SPREADSHEET_TITLE,
          details: [
            { label: 'Nama File Baru', value: DB_SPREADSHEET_TITLE },
            { label: 'Tab Dibuat', value: 'Ringkasan_Dashboard, APBS_Master, Transaksi_Pengeluaran' },
            { label: 'Jumlah Pos Anggaran', value: `${items.length} Mata Anggaran (#APBS)` },
            { label: 'Jumlah Transaksi', value: `${transactions.length} Transaksi` },
            { label: 'Akun Google', value: userEmail || 'Pengguna Terautentikasi' },
          ],
          confirmLabel: 'Ya, Buat & Koneksikan Database',
          onConfirm: async () => {
            setIsSyncing(true);
            setSyncError(null);
            try {
              const created = await createAndPopulateDatabase(token, items, transactions);
              setSpreadsheetInfo(created);
              localStorage.setItem(STORAGE_KEY_GSHEET_ID, created.spreadsheetId);
              setLastSyncedAt(new Date().toISOString());
              setSyncNotice(
                `Database "${created.title}" berhasil dibuat di Google Drive dan terkoneksi otomatis!`
              );
            } catch (err) {
              handleSheetsError(err);
              throw err;
            } finally {
              setIsSyncing(false);
            }
          },
        });
      }
    } catch (err) {
      handleSheetsError(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearSyncError = () => {
    setSyncError(null);
    setAuthErrorInfo(null);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    setAuthErrorInfo(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
        await autoDiscoverAndConnect(res.accessToken, res.user.email);
      }
    } catch (err) {
      const parsed = parseFirebaseAuthError(err);
      setAuthErrorInfo(parsed);
      setSyncError(parsed.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLoginRedirect = async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    setAuthErrorInfo(null);
    try {
      await googleSignInRedirect();
    } catch (err) {
      const parsed = parseFirebaseAuthError(err);
      setAuthErrorInfo(parsed);
      setSyncError(parsed.message);
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setGoogleUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setSpreadsheetInfo(null);
    setSyncNotice('Sesi Google Sheets terputus.');
  };

  const requestCreateSheetsDb = () => {
    if (!accessToken) {
      setIsSheetsModalOpen(true);
      return;
    }
    setPendingSheetConfirm({
      id: `create-manual-${Date.now()}`,
      actionType: 'create_db',
      title: 'Buat Spreadsheet Database Baru di Google Drive?',
      description:
        'Tindakan ini akan membuat file Google Sheets baru yang terstruktur dan mengunggah seluruh data APBS dan transaksi saat ini.',
      targetSpreadsheetName: DB_SPREADSHEET_TITLE,
      details: [
        { label: 'Nama File', value: DB_SPREADSHEET_TITLE },
        { label: 'Tab Otomatis', value: 'Ringkasan_Dashboard, APBS_Master, Transaksi_Pengeluaran' },
        { label: 'Data Diunggah', value: `${items.length} Pos #APBS & ${transactions.length} Transaksi` },
      ],
      confirmLabel: 'Ya, Buat Spreadsheet Database',
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
          const created = await createAndPopulateDatabase(accessToken, items, transactions);
          setSpreadsheetInfo(created);
          localStorage.setItem(STORAGE_KEY_GSHEET_ID, created.spreadsheetId);
          setLastSyncedAt(new Date().toISOString());
          setSyncNotice(`Database baru "${created.title}" berhasil dibuat dan terhubung!`);
        } catch (err) {
          handleSheetsError(err);
          throw err;
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const requestPushAllToSheets = () => {
    if (!accessToken || !spreadsheetInfo) return;
    setPendingSheetConfirm({
      id: `push-all-${Date.now()}`,
      actionType: 'push_all',
      title: 'Timpa & Sinkronkan Semua Data ke Google Sheets?',
      description:
        'Seluruh isi tab APBS_Master, Transaksi_Pengeluaran, dan Ringkasan_Dashboard pada Google Sheets akan ditimpa agar sama persis dengan data di aplikasi saat ini.',
      targetSpreadsheetName: spreadsheetInfo.title,
      isDestructive: true,
      details: [
        { label: 'Spreadsheet Target', value: spreadsheetInfo.title },
        { label: 'Pos Anggaran (#APBS)', value: `${items.length} baris akan diperbarui` },
        { label: 'Transaksi Pengeluaran', value: `${transactions.length} baris akan ditulis ulang` },
      ],
      confirmLabel: 'Ya, Timpa & Sinkronkan Sekarang',
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
          await overwriteAllToSheets(accessToken, spreadsheetInfo, items, transactions);
          setLastSyncedAt(new Date().toISOString());
          setSyncNotice(`Seluruh data berhasil disinkronkan ke "${spreadsheetInfo.title}".`);
        } catch (err) {
          handleSheetsError(err);
          throw err;
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const requestPullFromSheets = () => {
    if (!accessToken || !spreadsheetInfo) return;
    setPendingSheetConfirm({
      id: `pull-${Date.now()}`,
      actionType: 'pull_from_sheet',
      title: 'Muat Data Terbaru dari Google Sheets?',
      description:
        'Data anggaran dan transaksi lokal di peramban akan diganti dengan data terbaru yang tersimpan di Google Sheets Anda.',
      targetSpreadsheetName: spreadsheetInfo.title,
      details: [
        { label: 'Sumber Spreadsheet', value: spreadsheetInfo.title },
        { label: 'Tab Dibaca', value: 'APBS_Master & Transaksi_Pengeluaran' },
      ],
      confirmLabel: 'Ya, Muat dari Google Sheets',
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
          const remote = await readDatabaseFromSheets(accessToken, spreadsheetInfo);
          if (remote.items.length > 0) {
            setItems(remote.items);
            setTransactions(remote.transactions);
            setLastSyncedAt(new Date().toISOString());
            setSyncNotice(
              `Berhasil memuat ${remote.items.length} pos #APBS dan ${remote.transactions.length} transaksi dari Google Sheets.`
            );
          } else {
            setSyncError('Tab APBS_Master kosong. Gunakan "Sinkronkan ke Sheets" untuk mengisi data awal.');
          }
        } catch (err) {
          handleSheetsError(err);
          throw err;
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const linkSpreadsheetByUrlOrId = async (input: string) => {
    if (!accessToken) {
      setSyncError('Silakan Sign in with Google terlebih dahulu.');
      return;
    }
    const id = extractSpreadsheetId(input);
    if (!id) {
      setSyncError('URL atau ID Spreadsheet tidak valid.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const meta = await getSpreadsheetMetadata(accessToken, id);
      const remote = await readDatabaseFromSheets(accessToken, meta);
      setSpreadsheetInfo(meta);
      localStorage.setItem(STORAGE_KEY_GSHEET_ID, meta.spreadsheetId);
      if (remote.items.length > 0) {
        setItems(remote.items);
        setTransactions(remote.transactions);
        setSyncNotice(`Terhubung ke "${meta.title}" dan memuat ${remote.items.length} pos #APBS.`);
      } else {
        setSyncNotice(`Terhubung ke "${meta.title}". Klik Sinkronkan ke Sheets untuk mengisi struktur database APBS.`);
      }
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      handleSheetsError(err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered items based on operational view toggle
  const activeItems = useMemo(() => {
    if (!filterOnlyOperational) return items;
    return items.filter((i) => i.isOperationalApbs);
  }, [items, filterOnlyOperational]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return Array.from(set).filter(Boolean);
  }, [items]);

  const units = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.unit));
    return Array.from(set).filter(Boolean);
  }, [items]);

  const totalBudget = useMemo(
    () => activeItems.reduce((acc, it) => acc + (it.totalBudget || 0), 0),
    [activeItems]
  );

  const totalActual = useMemo(
    () => activeItems.reduce((acc, it) => acc + (it.totalActual || 0), 0),
    [activeItems]
  );

  const remainingBudget = totalBudget - totalActual;
  const progressPercent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  const monthlyStats = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const budget = activeItems.reduce((sum, item) => sum + (item.monthlyBudget[idx] || 0), 0);
      const actual = activeItems.reduce((sum, item) => sum + (item.monthlyActual[idx] || 0), 0);
      const balance = budget - actual;
      const percent = budget > 0 ? (actual / budget) * 100 : 0;
      return { monthIndex: idx, monthName: name, budget, actual, balance, percent };
    });
  }, [activeItems]);

  const categorySummaries = useMemo(() => {
    const map = new Map<string, { budget: number; actual: number; count: number }>();
    activeItems.forEach((item) => {
      const cat = item.category || 'Lain-Lain';
      const current = map.get(cat) || { budget: 0, actual: 0, count: 0 };
      current.budget += item.totalBudget || 0;
      current.actual += item.totalActual || 0;
      current.count += 1;
      map.set(cat, current);
    });

    const result: CategorySummary[] = [];
    map.forEach((val, cat) => {
      result.push({
        category: cat,
        totalBudget: val.budget,
        totalActual: val.actual,
        remaining: val.budget - val.actual,
        percentUsed: val.budget > 0 ? (val.actual / val.budget) * 100 : 0,
        itemCount: val.count,
      });
    });

    return result.sort((a, b) => b.totalBudget - a.totalBudget);
  }, [activeItems]);

  const unitSummaries = useMemo(() => {
    const map = new Map<string, { budget: number; actual: number; count: number }>();
    activeItems.forEach((item) => {
      const u = item.unit || 'Semua Unit';
      const current = map.get(u) || { budget: 0, actual: 0, count: 0 };
      current.budget += item.totalBudget || 0;
      current.actual += item.totalActual || 0;
      current.count += 1;
      map.set(u, current);
    });

    const result: UnitSummary[] = [];
    map.forEach((val, u) => {
      result.push({
        unit: u,
        totalBudget: val.budget,
        totalActual: val.actual,
        remaining: val.budget - val.actual,
        percentUsed: val.budget > 0 ? (val.actual / val.budget) * 100 : 0,
        itemCount: val.count,
      });
    });

    return result.sort((a, b) => b.totalBudget - a.totalBudget);
  }, [activeItems]);

  const overBudgetItems = useMemo(
    () => activeItems.filter((i) => i.totalActual > i.totalBudget && i.totalBudget > 0),
    [activeItems]
  );

  const nearLimitItems = useMemo(() => {
    return activeItems.filter((i) => {
      if (i.totalBudget <= 0) return false;
      const ratio = i.totalActual / i.totalBudget;
      return ratio >= 0.8 && ratio <= 1.0;
    });
  }, [activeItems]);

  // Helper to apply new transaction locally
  const applyTransactionLocally = (newTx: ExpenseTransaction): ApbsBudgetItem | null => {
    let updatedItem: ApbsBudgetItem | null = null;
    setTransactions((prev) => [newTx, ...prev]);
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === newTx.itemId) {
          const newActual = [...item.monthlyActual];
          newActual[newTx.monthIndex] = (newActual[newTx.monthIndex] || 0) + newTx.amount;
          const newTotalActual = newActual.reduce((a, b) => a + b, 0);
          updatedItem = {
            ...item,
            monthlyActual: newActual,
            totalActual: newTotalActual,
          };
          return updatedItem;
        }
        return item;
      })
    );
    return updatedItem;
  };

  // Add transaction (explicit confirmation if connected to Google Sheets)
  const addTransaction = (txData: Omit<ExpenseTransaction, 'id' | 'createdAt'>) => {
    const newTx: ExpenseTransaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    const targetItem = items.find((i) => i.id === txData.itemId);
    if (!targetItem) return;

    const newActual = [...targetItem.monthlyActual];
    newActual[txData.monthIndex] = (newActual[txData.monthIndex] || 0) + txData.amount;
    const simulatedUpdatedItem: ApbsBudgetItem = {
      ...targetItem,
      monthlyActual: newActual,
      totalActual: newActual.reduce((a, b) => a + b, 0),
    };

    if (isSheetsConnected && accessToken && spreadsheetInfo) {
      setPendingSheetConfirm({
        id: `tx-sync-${Date.now()}`,
        actionType: 'record_tx',
        title: 'Simpan Transaksi & Perbarui Google Sheets?',
        description:
          'Transaksi penggunaan dana ini akan memotong saldo pos APBS dan langsung ditulis ke database Google Sheets Anda.',
        targetSpreadsheetName: spreadsheetInfo.title,
        details: [
          { label: 'Pos Kode #APBS', value: `#${targetItem.code} — ${targetItem.name}` },
          { label: 'Bulan Alokasi', value: MONTH_YEARS[txData.monthIndex] || '-' },
          { label: 'Nominal Pengeluaran', value: formatRupiah(txData.amount) },
          { label: 'Sisa Pagu Baru', value: formatRupiah(simulatedUpdatedItem.totalBudget - simulatedUpdatedItem.totalActual) },
          { label: 'Operasi Sheets', value: 'Update baris APBS_Master & tambah baris Transaksi_Pengeluaran' },
        ],
        confirmLabel: 'Ya, Simpan & Update Google Sheets',
        localOnlyLabel: 'Simpan Lokal Saja',
        onLocalOnly: () => {
          applyTransactionLocally(newTx);
          setSyncNotice('Transaksi disimpan secara lokal (belum disinkronkan ke Google Sheets).');
        },
        onConfirm: async () => {
          setIsSyncing(true);
          setSyncError(null);
          try {
            await syncSingleItemAndAppendTransaction(
              accessToken,
              spreadsheetInfo,
              simulatedUpdatedItem,
              newTx
            );
            applyTransactionLocally(newTx);
            setLastSyncedAt(new Date().toISOString());
            setSyncNotice(`Transaksi #${targetItem.code} tersimpan & tersinkron ke Google Sheets!`);
          } catch (err) {
            handleSheetsError(err);
            throw err;
          } finally {
            setIsSyncing(false);
          }
        },
      });
    } else {
      applyTransactionLocally(newTx);
    }
  };

  // Add multiple line items from a single Pengajuan Dana form
  const addBatchTransactions = (txDataList: Omit<ExpenseTransaction, 'id' | 'createdAt'>[]) => {
    if (txDataList.length === 0) return;
    if (txDataList.length === 1) {
      addTransaction(txDataList[0]);
      return;
    }

    const baseTime = Date.now();
    const newTxs: ExpenseTransaction[] = txDataList.map((txData, idx) => ({
      ...txData,
      id: `tx-${baseTime}-${idx}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    }));

    const applyBatchLocally = (): { nextItems: ApbsBudgetItem[]; nextTransactions: ExpenseTransaction[] } => {
      const nextTransactions = [...newTxs, ...transactions];
      const nextItems = items.map((item) => {
        const matching = newTxs.filter((t) => t.itemId === item.id);
        if (matching.length === 0) return item;
        const newActual = [...item.monthlyActual];
        matching.forEach((t) => {
          newActual[t.monthIndex] = (newActual[t.monthIndex] || 0) + t.amount;
        });
        return {
          ...item,
          monthlyActual: newActual,
          totalActual: newActual.reduce((a, b) => a + b, 0),
        };
      });
      setTransactions(nextTransactions);
      setItems(nextItems);
      return { nextItems, nextTransactions };
    };

    const totalBatchAmount = newTxs.reduce((s, t) => s + t.amount, 0);
    const refNo = newTxs[0]?.formMeta?.referenceNo || newTxs[0]?.invoiceNo || '-';

    if (isSheetsConnected && accessToken && spreadsheetInfo) {
      const nextTransactions = [...newTxs, ...transactions];
      const nextItems = items.map((item) => {
        const matching = newTxs.filter((t) => t.itemId === item.id);
        if (matching.length === 0) return item;
        const newActual = [...item.monthlyActual];
        matching.forEach((t) => {
          newActual[t.monthIndex] = (newActual[t.monthIndex] || 0) + t.amount;
        });
        return {
          ...item,
          monthlyActual: newActual,
          totalActual: newActual.reduce((a, b) => a + b, 0),
        };
      });

      setPendingSheetConfirm({
        id: `tx-batch-${baseTime}`,
        actionType: 'record_tx',
        title: 'Simpan Formulir Pengajuan Dana & Update Sheets?',
        description:
          'Formulir pengajuan dana berisi beberapa rincian pos #APBS. Semua pos akan memotong pagu dan langsung disinkronkan ke Google Sheets.',
        targetSpreadsheetName: spreadsheetInfo.title,
        details: [
          { label: 'No. Referensi', value: refNo },
          { label: 'Jumlah Baris #APBS', value: `${newTxs.length} pos anggaran` },
          { label: 'Total Pengajuan', value: formatRupiah(totalBatchAmount) },
          { label: 'Operasi Sheets', value: 'Update APBS_Master & Transaksi_Pengeluaran' },
        ],
        confirmLabel: 'Ya, Simpan & Update Google Sheets',
        localOnlyLabel: 'Simpan Lokal Saja',
        onLocalOnly: () => {
          applyBatchLocally();
          setSyncNotice('Formulir pengajuan dana disimpan secara lokal.');
        },
        onConfirm: async () => {
          setIsSyncing(true);
          setSyncError(null);
          try {
            await overwriteAllToSheets(accessToken, spreadsheetInfo, nextItems, nextTransactions);
            setItems(nextItems);
            setTransactions(nextTransactions);
            setLastSyncedAt(new Date().toISOString());
            setSyncNotice(`Formulir ${refNo} (${newTxs.length} pos) tersimpan & tersinkron ke Google Sheets!`);
          } catch (err) {
            handleSheetsError(err);
            throw err;
          } finally {
            setIsSyncing(false);
          }
        },
      });
    } else {
      applyBatchLocally();
    }
  };

  const updateTransaction = (id: string, updated: Partial<ExpenseTransaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === oldTx.itemId) {
          const newActual = [...item.monthlyActual];
          newActual[oldTx.monthIndex] = Math.max(0, (newActual[oldTx.monthIndex] || 0) - oldTx.amount);

          const targetItemId = updated.itemId || oldTx.itemId;
          if (targetItemId === item.id) {
            const newMonth = updated.monthIndex !== undefined ? updated.monthIndex : oldTx.monthIndex;
            const newAmount = updated.amount !== undefined ? updated.amount : oldTx.amount;
            newActual[newMonth] = (newActual[newMonth] || 0) + newAmount;
          }

          return {
            ...item,
            monthlyActual: newActual,
            totalActual: newActual.reduce((a, b) => a + b, 0),
          };
        }

        if (updated.itemId && updated.itemId === item.id && updated.itemId !== oldTx.itemId) {
          const newActual = [...item.monthlyActual];
          const newMonth = updated.monthIndex !== undefined ? updated.monthIndex : oldTx.monthIndex;
          const newAmount = updated.amount !== undefined ? updated.amount : oldTx.amount;
          newActual[newMonth] = (newActual[newMonth] || 0) + newAmount;
          return {
            ...item,
            monthlyActual: newActual,
            totalActual: newActual.reduce((a, b) => a + b, 0),
          };
        }

        return item;
      })
    );
  };

  // Delete transaction (explicit confirmation happens in TransactionView modal)
  const deleteTransaction = async (id: string, alsoSyncSheets = true) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    const nextTransactions = transactions.filter((t) => t.id !== id);
    const nextItems = items.map((item) => {
      if (item.id === tx.itemId) {
        const newActual = [...item.monthlyActual];
        newActual[tx.monthIndex] = Math.max(0, (newActual[tx.monthIndex] || 0) - tx.amount);
        return {
          ...item,
          monthlyActual: newActual,
          totalActual: newActual.reduce((a, b) => a + b, 0),
        };
      }
      return item;
    });

    setTransactions(nextTransactions);
    setItems(nextItems);

    if (alsoSyncSheets && isSheetsConnected && accessToken && spreadsheetInfo) {
      setIsSyncing(true);
      setSyncError(null);
      try {
        await overwriteAllToSheets(accessToken, spreadsheetInfo, nextItems, nextTransactions);
        setLastSyncedAt(new Date().toISOString());
        setSyncNotice(`Transaksi dihapus & database Google Sheets diperbarui.`);
      } catch (err) {
        handleSheetsError(err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Direct cell edit (explicit confirmation if connected to Google Sheets)
  const applyCellLocally = (
    itemId: string,
    monthIndex: number,
    type: 'budget' | 'actual',
    safeVal: number
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          if (type === 'budget') {
            const newMonthly = [...item.monthlyBudget];
            newMonthly[monthIndex] = safeVal;
            return {
              ...item,
              monthlyBudget: newMonthly,
              totalBudget: newMonthly.reduce((a, b) => a + b, 0),
            };
          } else {
            const newMonthly = [...item.monthlyActual];
            newMonthly[monthIndex] = safeVal;
            return {
              ...item,
              monthlyActual: newMonthly,
              totalActual: newMonthly.reduce((a, b) => a + b, 0),
            };
          }
        }
        return item;
      })
    );
  };

  const updateCell = (
    itemId: string,
    monthIndex: number,
    type: 'budget' | 'actual',
    value: number
  ) => {
    const safeVal = isNaN(value) ? 0 : Math.max(0, value);
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    const oldVal =
      type === 'budget'
        ? targetItem.monthlyBudget[monthIndex] || 0
        : targetItem.monthlyActual[monthIndex] || 0;

    if (oldVal === safeVal) return;

    const simulatedItem: ApbsBudgetItem =
      type === 'budget'
        ? (() => {
            const newMonthly = [...targetItem.monthlyBudget];
            newMonthly[monthIndex] = safeVal;
            return {
              ...targetItem,
              monthlyBudget: newMonthly,
              totalBudget: newMonthly.reduce((a, b) => a + b, 0),
            };
          })()
        : (() => {
            const newMonthly = [...targetItem.monthlyActual];
            newMonthly[monthIndex] = safeVal;
            return {
              ...targetItem,
              monthlyActual: newMonthly,
              totalActual: newMonthly.reduce((a, b) => a + b, 0),
            };
          })();

    if (isSheetsConnected && accessToken && spreadsheetInfo) {
      setPendingSheetConfirm({
        id: `cell-sync-${Date.now()}`,
        actionType: 'edit_cell',
        title: 'Perbarui Nilai Sel di Google Sheets?',
        description:
          'Perubahan nilai anggaran/realisasi berikut akan langsung diperbarui pada baris pos APBS terkait di Google Sheets.',
        targetSpreadsheetName: spreadsheetInfo.title,
        details: [
          { label: 'Pos Kode #APBS', value: `#${targetItem.code} — ${targetItem.name}` },
          {
            label: 'Kolom & Bulan',
            value: `${type === 'budget' ? 'Pagu Anggaran' : 'Realisasi Aktual'} (${MONTH_YEARS[monthIndex]})`,
          },
          { label: 'Nilai Lama', value: formatRupiah(oldVal) },
          { label: 'Nilai Baru', value: formatRupiah(safeVal) },
        ],
        confirmLabel: 'Ya, Update Google Sheets',
        localOnlyLabel: 'Simpan Lokal Saja',
        onLocalOnly: () => {
          applyCellLocally(itemId, monthIndex, type, safeVal);
          setSyncNotice('Perubahan sel disimpan secara lokal.');
        },
        onConfirm: async () => {
          setIsSyncing(true);
          setSyncError(null);
          try {
            await syncSingleItemRowToSheets(accessToken, spreadsheetInfo, simulatedItem);
            applyCellLocally(itemId, monthIndex, type, safeVal);
            setLastSyncedAt(new Date().toISOString());
            setSyncNotice(`Sel pos #${targetItem.code} berhasil diperbarui di Google Sheets.`);
          } catch (err) {
            handleSheetsError(err);
            throw err;
          } finally {
            setIsSyncing(false);
          }
        },
      });
    } else {
      applyCellLocally(itemId, monthIndex, type, safeVal);
    }
  };

  const updateItemDetails = (itemId: string, updates: Partial<ApbsBudgetItem>) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...updates } : it)));
  };

  const addItem = (itemData: Omit<ApbsBudgetItem, 'id'>) => {
    const idCode = itemData.code || `custom-${Date.now()}`;
    const newItem: ApbsBudgetItem = {
      ...itemData,
      id: idCode,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const deleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setTransactions((prev) => prev.filter((t) => t.itemId !== itemId));
  };

  const resetToDefault = async (alsoSyncSheets = false) => {
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
    const baseItems = buildInitialItems();
    setItems(baseItems);
    setTransactions(INITIAL_TRANSACTIONS);

    if (alsoSyncSheets && isSheetsConnected && accessToken && spreadsheetInfo) {
      setIsSyncing(true);
      setSyncError(null);
      try {
        await overwriteAllToSheets(accessToken, spreadsheetInfo, baseItems, INITIAL_TRANSACTIONS);
        setLastSyncedAt(new Date().toISOString());
        setSyncNotice('Data lokal dan Google Sheets berhasil di-reset ke data awal.');
      } catch (err) {
        handleSheetsError(err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const exportDataJson = () => {
    const payload = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      academicYear: '2026-2027',
      organization: 'General Affairs (GA) - Lazuardi GCS Cinere',
      items,
      transactions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `APBS_GA_Lazuardi_2026_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDataJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.items)) {
        setItems(parsed.items);
        if (Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  };

  return (
    <ApbsContext.Provider
      value={{
        items,
        transactions,
        categories,
        units,
        filterOnlyOperational,
        setFilterOnlyOperational,
        totalBudget,
        totalActual,
        remainingBudget,
        progressPercent,
        monthlyStats,
        categorySummaries,
        unitSummaries,
        overBudgetItems,
        nearLimitItems,
        addTransaction,
        addBatchTransactions,
        updateTransaction,
        deleteTransaction,
        updateCell,
        updateItemDetails,
        addItem,
        deleteItem,
        resetToDefault,
        exportDataJson,
        importDataJson,
        googleUser,
        needsAuth,
        isCheckingAuth,
        isLoggingIn,
        isSheetsConnected,
        spreadsheetInfo,
        isSyncing,
        lastSyncedAt,
        syncError,
        authErrorInfo,
        clearSyncError,
        syncNotice,
        clearSyncNotice: () => setSyncNotice(null),
        isSheetsModalOpen,
        setIsSheetsModalOpen,
        pendingSheetConfirm,
        closePendingSheetConfirm: () => setPendingSheetConfirm(null),
        handleGoogleLogin,
        handleGoogleLoginRedirect,
        handleGoogleLogout,
        requestCreateSheetsDb,
        requestPushAllToSheets,
        requestPullFromSheets,
        linkSpreadsheetByUrlOrId,
      }}
    >
      {children}
    </ApbsContext.Provider>
  );
};

export const useApbs = (): ApbsContextType => {
  const context = useContext(ApbsContext);
  if (!context) {
    throw new Error('useApbs must be used within an ApbsProvider');
  }
  return context;
};

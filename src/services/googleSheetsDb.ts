import { ApbsBudgetItem, ExpenseTransaction } from '../types/apbs';
import { MONTH_YEARS } from '../utils/formatters';

export const DB_SPREADSHEET_TITLE = 'APBS_GA_2026_2027_Lazuardi_Database';
export const SHEET_APBS_MASTER = 'APBS_Master';
export const SHEET_TRANSAKSI = 'Transaksi_Pengeluaran';
export const SHEET_DASHBOARD = 'Ringkasan_Dashboard';

export class AuthExpiredError extends Error {
  constructor(message = 'Sesi login Google berakhir. Silakan masuk ulang untuk melanjutkan sinkronisasi.') {
    super(message);
    this.name = 'AuthExpiredError';
  }
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: { sheetId: number; title: string }[];
}

async function fetchGoogleApi(url: string, accessToken: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    throw new AuthExpiredError();
  }

  if (!res.ok) {
    const errText = await res.text();
    let msg = `Google API Error (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) msg = parsed.error.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(msg);
  }

  return res.json();
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed;
}

export async function findExistingDatabaseSpreadsheet(
  accessToken: string,
  savedId?: string | null
): Promise<SpreadsheetInfo | null> {
  // 1. Verify saved spreadsheetId first if available
  if (savedId) {
    try {
      const meta = await getSpreadsheetMetadata(accessToken, savedId);
      if (meta) return meta;
    } catch (err) {
      if (err instanceof AuthExpiredError) throw err;
      // If 404 or inaccessible, continue to search Drive
    }
  }

  // 2. Search Google Drive (files created/opened by this app) for our named DB spreadsheet
  const query = encodeURIComponent(
    `name='${DB_SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=5`;

  const data = await fetchGoogleApi(driveUrl, accessToken);
  const files = data?.files || [];
  if (files.length === 0) return null;

  return getSpreadsheetMetadata(accessToken, files[0].id);
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetInfo> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title)`;
  const data = await fetchGoogleApi(url, accessToken);
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || DB_SPREADSHEET_TITLE,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title || '',
    })),
  };
}

function buildMasterRows(items: ApbsBudgetItem[]): (string | number)[][] {
  const header = [
    '#APBS_ID',
    'Kode_APBS',
    'Nama_Mata_Anggaran',
    'Kategori',
    'Subkategori',
    'Unit',
    'Harga_Satuan',
    'Pagu_Jul_2026',
    'Pagu_Agu_2026',
    'Pagu_Sep_2026',
    'Pagu_Okt_2026',
    'Pagu_Nov_2026',
    'Pagu_Des_2026',
    'Pagu_Jan_2027',
    'Pagu_Feb_2027',
    'Pagu_Mar_2027',
    'Pagu_Apr_2027',
    'Pagu_Mei_2027',
    'Pagu_Jun_2027',
    'Aktual_Jul_2026',
    'Aktual_Agu_2026',
    'Aktual_Sep_2026',
    'Aktual_Okt_2026',
    'Aktual_Nov_2026',
    'Aktual_Des_2026',
    'Aktual_Jan_2027',
    'Aktual_Feb_2027',
    'Aktual_Mar_2027',
    'Aktual_Apr_2027',
    'Aktual_Mei_2027',
    'Aktual_Jun_2027',
    'Total_Pagu',
    'Total_Realisasi',
    'Sisa_Saldo',
    'Persen_Serap',
    'Operasional_APBS',
    'Catatan',
  ];

  const rows = items.map((item, idx) => {
    const rowNum = idx + 2;
    const budgets = Array.from({ length: 12 }, (_, m) => item.monthlyBudget[m] || 0);
    const actuals = Array.from({ length: 12 }, (_, m) => item.monthlyActual[m] || 0);
    return [
      item.id,
      item.code,
      item.name,
      item.category,
      item.subcategory,
      item.unit,
      item.unitPrice || 0,
      ...budgets,
      ...actuals,
      `=SUM(H${rowNum}:S${rowNum})`,
      `=SUM(T${rowNum}:AE${rowNum})`,
      `=AF${rowNum}-AG${rowNum}`,
      `=IF(AF${rowNum}>0,AG${rowNum}/AF${rowNum},0)`,
      item.isOperationalApbs ? 'YA' : 'TIDAK',
      item.notes || '',
    ];
  });

  return [header, ...rows];
}

function buildTransactionRows(transactions: ExpenseTransaction[]): (string | number)[][] {
  const header = [
    'ID_Transaksi',
    'Kode_APBS',
    'Nama_Mata_Anggaran',
    'Kategori',
    'Subkategori',
    'Unit',
    'Bulan_Index',
    'Bulan_Nama',
    'Tanggal',
    'Nominal',
    'Qty',
    'Harga_Satuan',
    'No_Bukti',
    'PIC',
    'Metode_Bayar',
    'Keterangan',
    'Waktu_Catat',
    'Form_Meta_JSON',
  ];

  const rows = transactions.map((tx) => [
    tx.id,
    tx.itemId,
    tx.itemName,
    tx.category,
    tx.subcategory || '',
    tx.unit,
    tx.monthIndex,
    MONTH_YEARS[tx.monthIndex] || `Bulan ${tx.monthIndex + 1}`,
    tx.date,
    tx.amount,
    tx.qty ?? 1,
    tx.unitPrice ?? tx.amount,
    tx.invoiceNo || '',
    tx.pic || '',
    tx.paymentMethod || 'Kas GA',
    tx.description || '',
    tx.createdAt,
    tx.formMeta ? JSON.stringify(tx.formMeta) : '',
  ]);

  return [header, ...rows];
}

function buildDashboardRows(items: ApbsBudgetItem[]): (string | number)[][] {
  const categories = Array.from(new Set(items.filter((i) => i.isOperationalApbs).map((i) => i.category)));
  const rows: (string | number)[][] = [
    ['LAPORAN RINGKASAN DATABASE APBS TIM GENERAL AFFAIRS (GA)', '', '', '', ''],
    ['Lazuardi Global Compassionate School - Cinere (TA 2026-2027)', '', '', '', ''],
    ['', '', '', '', ''],
    ['INDIKATOR UTAMA (PAGU OPERASIONAL GA)', 'Nilai (Rp / %)', 'Keterangan', '', ''],
    [
      'Total Pagu APBS Operasional',
      `=SUMIF(${SHEET_APBS_MASTER}!AJ2:AJ,"YA",${SHEET_APBS_MASTER}!AF2:AF)`,
      'Total anggaran resmi TA 2026-2027',
      '',
      '',
    ],
    [
      'Total Realisasi Terpakai',
      `=SUMIF(${SHEET_APBS_MASTER}!AJ2:AJ,"YA",${SHEET_APBS_MASTER}!AG2:AG)`,
      'Akumulasi realisasi bulan Juli - Juni',
      '',
      '',
    ],
    ['Sisa Pagu Tersedia', '=B5-B6', 'Saldo anggaran belum terpakai', '', ''],
    ['Tingkat Penyerapan Dana (%)', '=IF(B5>0,B6/B5,0)', 'Persentase penggunaan dari total pagu', '', ''],
    ['Jumlah Transaksi Tercatat', `=COUNTA(${SHEET_TRANSAKSI}!A2:A)`, 'Total bukti pengeluaran di tab transaksi', '', ''],
    ['', '', '', '', ''],
    ['REKAPITULASI PER KATEGORI UTAMA', 'Pagu Anggaran', 'Realisasi Aktual', 'Sisa Saldo', '% Serap'],
  ];

  categories.forEach((cat, idx) => {
    const r = 12 + idx;
    rows.push([
      cat,
      `=SUMIFS(${SHEET_APBS_MASTER}!AF2:AF,${SHEET_APBS_MASTER}!D2:D,A${r},${SHEET_APBS_MASTER}!AJ2:AJ,"YA")`,
      `=SUMIFS(${SHEET_APBS_MASTER}!AG2:AG,${SHEET_APBS_MASTER}!D2:D,A${r},${SHEET_APBS_MASTER}!AJ2:AJ,"YA")`,
      `=B${r}-C${r}`,
      `=IF(B${r}>0,C${r}/B${r},0)`,
    ]);
  });

  rows.push(['', '', '', '', '']);
  const monthHeaderRow = rows.length + 1;
  rows.push(['DISTRIBUSI BULANAN (JULI 2026 - JUNI 2027)', 'Pagu Bulanan', 'Realisasi Bulanan', 'Selisih', '% Serap']);

  const paguCols = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'];
  const actualCols = ['T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE'];

  MONTH_YEARS.forEach((mName, mIdx) => {
    const r = monthHeaderRow + 1 + mIdx;
    const pCol = paguCols[mIdx];
    const aCol = actualCols[mIdx];
    rows.push([
      mName,
      `=SUMIF(${SHEET_APBS_MASTER}!AJ2:AJ,"YA",${SHEET_APBS_MASTER}!${pCol}2:${pCol})`,
      `=SUMIF(${SHEET_APBS_MASTER}!AJ2:AJ,"YA",${SHEET_APBS_MASTER}!${aCol}2:${aCol})`,
      `=B${r}-C${r}`,
      `=IF(B${r}>0,C${r}/B${r},0)`,
    ]);
  });

  return rows;
}

export async function createAndPopulateDatabase(
  accessToken: string,
  items: ApbsBudgetItem[],
  transactions: ExpenseTransaction[]
): Promise<SpreadsheetInfo> {
  // 1. Create spreadsheet with 3 named sheets
  const createPayload = {
    properties: {
      title: DB_SPREADSHEET_TITLE,
      locale: 'en_US',
      timeZone: 'Asia/Jakarta',
    },
    sheets: [
      {
        properties: {
          title: SHEET_DASHBOARD,
          sheetId: 0,
          gridProperties: { frozenRowCount: 4 },
        },
      },
      {
        properties: {
          title: SHEET_APBS_MASTER,
          sheetId: 1,
          gridProperties: { frozenRowCount: 1, frozenColumnCount: 3 },
        },
      },
      {
        properties: {
          title: SHEET_TRANSAKSI,
          sheetId: 2,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    ],
  };

  const created = await fetchGoogleApi(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(createPayload),
    }
  );

  const spreadsheetId = created.spreadsheetId;
  const info: SpreadsheetInfo = {
    spreadsheetId,
    title: created.properties?.title || DB_SPREADSHEET_TITLE,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: (created.sheets || []).map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  };

  // 2. Populate all 3 sheets
  await overwriteAllToSheets(accessToken, info, items, transactions);

  // 3. Apply clean styling & formatting (emerald header, number formats)
  try {
    await applyDatabaseFormatting(accessToken, info);
  } catch (err) {
    console.warn('Formatting warning (non-fatal):', err);
  }

  return info;
}

async function applyDatabaseFormatting(accessToken: string, info: SpreadsheetInfo) {
  const dashId = info.sheets.find((s) => s.title === SHEET_DASHBOARD)?.sheetId ?? 0;
  const masterId = info.sheets.find((s) => s.title === SHEET_APBS_MASTER)?.sheetId ?? 1;
  const txId = info.sheets.find((s) => s.title === SHEET_TRANSAKSI)?.sheetId ?? 2;

  const headerBg = { red: 0.024, green: 0.373, blue: 0.275 }; // emerald-800
  const whiteText = { red: 1, green: 1, blue: 1 };

  const requests = [
    // APBS_Master Header
    {
      repeatCell: {
        range: { sheetId: masterId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 37 },
        cell: {
          userEnteredFormat: {
            backgroundColor: headerBg,
            textFormat: { foregroundColor: whiteText, bold: true, fontSize: 10 },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    },
    // APBS_Master Currency columns (G..AH = col index 6..34)
    {
      repeatCell: {
        range: { sheetId: masterId, startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 34 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // APBS_Master Percent column (AI = col index 34)
    {
      repeatCell: {
        range: { sheetId: masterId, startRowIndex: 1, startColumnIndex: 34, endColumnIndex: 35 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'PERCENT', pattern: '0.00%' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // Transaksi Header
    {
      repeatCell: {
        range: { sheetId: txId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
        cell: {
          userEnteredFormat: {
            backgroundColor: headerBg,
            textFormat: { foregroundColor: whiteText, bold: true, fontSize: 10 },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    },
    // Transaksi Currency columns (J..L = col index 9..12)
    {
      repeatCell: {
        range: { sheetId: txId, startRowIndex: 1, startColumnIndex: 9, endColumnIndex: 12 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // Dashboard Title
    {
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
        cell: {
          userEnteredFormat: {
            backgroundColor: headerBg,
            textFormat: { foregroundColor: whiteText, bold: true, fontSize: 12 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // Dashboard Number formats
    {
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: 4, startColumnIndex: 1, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'PERCENT', pattern: '0.00%' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: 11, startColumnIndex: 4, endColumnIndex: 5 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'PERCENT', pattern: '0.00%' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      autoResizeDimensions: {
        dimensions: { sheetId: dashId, dimension: 'COLUMNS', startIndex: 0, endIndex: 5 },
      },
    },
  ];

  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests }),
    }
  );
}

function resolveSheetName(info: SpreadsheetInfo, preferred: string, fallbackIndex: number): string {
  const exact = info.sheets.find((s) => s.title === preferred);
  if (exact) return exact.title;
  if (info.sheets[fallbackIndex]) return info.sheets[fallbackIndex].title;
  return info.sheets[0]?.title || preferred;
}

async function ensureRequiredSheetsExist(
  accessToken: string,
  info: SpreadsheetInfo
): Promise<SpreadsheetInfo> {
  const existingTitles = new Set(info.sheets.map((s) => s.title));
  const missing: string[] = [];
  if (!existingTitles.has(SHEET_DASHBOARD)) missing.push(SHEET_DASHBOARD);
  if (!existingTitles.has(SHEET_APBS_MASTER)) missing.push(SHEET_APBS_MASTER);
  if (!existingTitles.has(SHEET_TRANSAKSI)) missing.push(SHEET_TRANSAKSI);

  if (missing.length === 0) return info;

  const requests = missing.map((title) => ({
    addSheet: { properties: { title } },
  }));

  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests }),
    }
  );

  return getSpreadsheetMetadata(accessToken, info.spreadsheetId);
}

export async function overwriteAllToSheets(
  accessToken: string,
  info: SpreadsheetInfo,
  items: ApbsBudgetItem[],
  transactions: ExpenseTransaction[]
): Promise<void> {
  const updatedInfo = await ensureRequiredSheetsExist(accessToken, info);

  const masterSheet = resolveSheetName(updatedInfo, SHEET_APBS_MASTER, 0);
  const txSheet = resolveSheetName(updatedInfo, SHEET_TRANSAKSI, 1);
  const dashSheet = resolveSheetName(updatedInfo, SHEET_DASHBOARD, 2);

  // Clear existing ranges first so old removed rows don't linger
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${updatedInfo.spreadsheetId}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: [`'${masterSheet}'!A:AK`, `'${txSheet}'!A:R`, `'${dashSheet}'!A:E`],
      }),
    }
  );

  const masterValues = buildMasterRows(items);
  const txValues = buildTransactionRows(transactions);
  const dashValues = buildDashboardRows(items);

  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${updatedInfo.spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'${masterSheet}'!A1`, values: masterValues },
          { range: `'${txSheet}'!A1`, values: txValues },
          { range: `'${dashSheet}'!A1`, values: dashValues },
        ],
      }),
    }
  );
}

export async function readDatabaseFromSheets(
  accessToken: string,
  info: SpreadsheetInfo
): Promise<{
  items: ApbsBudgetItem[];
  transactions: ExpenseTransaction[];
}> {
  // Verify actual sheet names from metadata
  const freshMeta = await getSpreadsheetMetadata(accessToken, info.spreadsheetId);
  const masterSheet = freshMeta.sheets.find((s) => s.title === SHEET_APBS_MASTER)?.title || freshMeta.sheets[0]?.title;
  const txSheet = freshMeta.sheets.find((s) => s.title === SHEET_TRANSAKSI)?.title;

  if (!masterSheet) {
    throw new Error('Sheet APBS_Master tidak ditemukan di spreadsheet ini.');
  }

  const ranges = [`'${masterSheet}'!A1:AK1000`];
  if (txSheet) ranges.push(`'${txSheet}'!A1:R5000`);

  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${freshMeta.spreadsheetId}/values:batchGet?${params}&valueRenderOption=UNFORMATTED_VALUE`;

  const res = await fetchGoogleApi(url, accessToken);
  const valueRanges = res?.valueRanges || [];

  const masterRows: any[][] = valueRanges[0]?.values || [];
  const txRows: any[][] = valueRanges[1]?.values || [];

  // Parse APBS Master rows (skip header row 0)
  const items: ApbsBudgetItem[] = [];
  for (let i = 1; i < masterRows.length; i++) {
    const row = masterRows[i];
    if (!row || !row[0]) continue;
    const id = String(row[0]).trim();
    const code = String(row[1] || row[0]).trim();
    const name = String(row[2] || '').trim();
    if (!name) continue;

    const monthlyBudget = Array.from({ length: 12 }, (_, m) => Number(row[7 + m]) || 0);
    const monthlyActual = Array.from({ length: 12 }, (_, m) => Number(row[19 + m]) || 0);
    const totalBudget = monthlyBudget.reduce((a, b) => a + b, 0);
    const totalActual = monthlyActual.reduce((a, b) => a + b, 0);
    const opFlag = String(row[35] || 'YA').toUpperCase();

    items.push({
      id,
      code,
      name,
      category: String(row[3] || 'Lain-Lain').trim(),
      subcategory: String(row[4] || '').trim(),
      unit: String(row[5] || 'ALL').trim(),
      unitPrice: Number(row[6]) || 0,
      monthlyBudget,
      monthlyActual,
      totalBudget,
      totalActual,
      isOperationalApbs: opFlag !== 'TIDAK' && opFlag !== 'NO' && opFlag !== 'FALSE',
      notes: String(row[36] || '').trim(),
    });
  }

  // Parse Transactions rows (skip header row 0)
  const transactions: ExpenseTransaction[] = [];
  for (let i = 1; i < txRows.length; i++) {
    const row = txRows[i];
    if (!row || !row[0]) continue;
    const pm = String(row[14] || 'Kas GA') as ExpenseTransaction['paymentMethod'];

    let parsedFormMeta: ExpenseTransaction['formMeta'] = undefined;
    if (row[17]) {
      try {
        parsedFormMeta = JSON.parse(String(row[17]));
      } catch {
        parsedFormMeta = undefined;
      }
    }

    transactions.push({
      id: String(row[0]).trim(),
      itemId: String(row[1] || '').trim(),
      itemName: String(row[2] || '').trim(),
      category: String(row[3] || '').trim(),
      subcategory: String(row[4] || '').trim(),
      unit: String(row[5] || 'ALL').trim(),
      monthIndex: Number(row[6]) || 0,
      date: String(row[8] || '').trim(),
      amount: Number(row[9]) || 0,
      qty: Number(row[10]) || 1,
      unitPrice: Number(row[11]) || Number(row[9]) || 0,
      invoiceNo: String(row[12] || '').trim(),
      pic: String(row[13] || '').trim(),
      paymentMethod: ['Kas GA', 'Transfer Bank', 'Reimbursement', 'Petty Cash'].includes(pm || '')
        ? pm
        : 'Kas GA',
      description: String(row[15] || '').trim(),
      formMeta: parsedFormMeta,
      createdAt: String(row[16] || new Date().toISOString()),
    });
  }

  return { items, transactions };
}

export async function syncSingleItemAndAppendTransaction(
  accessToken: string,
  info: SpreadsheetInfo,
  updatedItem: ApbsBudgetItem,
  newTx: ExpenseTransaction
): Promise<void> {
  const masterSheet = resolveSheetName(info, SHEET_APBS_MASTER, 0);
  const txSheet = resolveSheetName(info, SHEET_TRANSAKSI, 2);

  // 1. Find exact row number of item in APBS_Master column A
  const colAData = await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${encodeURIComponent(`'${masterSheet}'!A:A`)}?valueRenderOption=UNFORMATTED_VALUE`,
    accessToken
  );
  const colValues: any[][] = colAData?.values || [];
  let targetRowIndex = -1;
  for (let i = 1; i < colValues.length; i++) {
    if (String(colValues[i]?.[0] || '').trim() === updatedItem.id) {
      targetRowIndex = i + 1; // 1-indexed sheet row
      break;
    }
  }

  const budgets = Array.from({ length: 12 }, (_, m) => updatedItem.monthlyBudget[m] || 0);
  const actuals = Array.from({ length: 12 }, (_, m) => updatedItem.monthlyActual[m] || 0);

  if (targetRowIndex > 1) {
    // Update the item's row in APBS_Master
    const rowValues = [
      updatedItem.id,
      updatedItem.code,
      updatedItem.name,
      updatedItem.category,
      updatedItem.subcategory,
      updatedItem.unit,
      updatedItem.unitPrice || 0,
      ...budgets,
      ...actuals,
      `=SUM(H${targetRowIndex}:S${targetRowIndex})`,
      `=SUM(T${targetRowIndex}:AE${targetRowIndex})`,
      `=AF${targetRowIndex}-AG${targetRowIndex}`,
      `=IF(AF${targetRowIndex}>0,AG${targetRowIndex}/AF${targetRowIndex},0)`,
      updatedItem.isOperationalApbs ? 'YA' : 'TIDAK',
      updatedItem.notes || '',
    ];

    await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${encodeURIComponent(`'${masterSheet}'!A${targetRowIndex}:AK${targetRowIndex}`)}?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
  } else {
    // Append new row if item didn't exist in Sheet yet
    const nextRow = colValues.length + 1;
    const rowValues = [
      updatedItem.id,
      updatedItem.code,
      updatedItem.name,
      updatedItem.category,
      updatedItem.subcategory,
      updatedItem.unit,
      updatedItem.unitPrice || 0,
      ...budgets,
      ...actuals,
      `=SUM(H${nextRow}:S${nextRow})`,
      `=SUM(T${nextRow}:AE${nextRow})`,
      `=AF${nextRow}-AG${nextRow}`,
      `=IF(AF${nextRow}>0,AG${nextRow}/AF${nextRow},0)`,
      updatedItem.isOperationalApbs ? 'YA' : 'TIDAK',
      updatedItem.notes || '',
    ];
    await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${encodeURIComponent(`'${masterSheet}'!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
  }

  // 2. Append transaction row at top/bottom of Transaksi_Pengeluaran
  const txRow = [
    newTx.id,
    newTx.itemId,
    newTx.itemName,
    newTx.category,
    newTx.subcategory || '',
    newTx.unit,
    newTx.monthIndex,
    MONTH_YEARS[newTx.monthIndex] || `Bulan ${newTx.monthIndex + 1}`,
    newTx.date,
    newTx.amount,
    newTx.qty ?? 1,
    newTx.unitPrice ?? newTx.amount,
    newTx.invoiceNo || '',
    newTx.pic || '',
    newTx.paymentMethod || 'Kas GA',
    newTx.description || '',
    newTx.createdAt,
    newTx.formMeta ? JSON.stringify(newTx.formMeta) : '',
  ];

  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${encodeURIComponent(`'${txSheet}'!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ values: [txRow] }),
    }
  );
}

export async function syncSingleItemRowToSheets(
  accessToken: string,
  info: SpreadsheetInfo,
  updatedItem: ApbsBudgetItem
): Promise<void> {
  const masterSheet = resolveSheetName(info, SHEET_APBS_MASTER, 0);

  const colAData = await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${encodeURIComponent(`'${masterSheet}'!A:A`)}?valueRenderOption=UNFORMATTED_VALUE`,
    accessToken
  );
  const colValues: any[][] = colAData?.values || [];
  let targetRowIndex = -1;
  for (let i = 1; i < colValues.length; i++) {
    if (String(colValues[i]?.[0] || '').trim() === updatedItem.id) {
      targetRowIndex = i + 1;
      break;
    }
  }

  const budgets = Array.from({ length: 12 }, (_, m) => updatedItem.monthlyBudget[m] || 0);
  const actuals = Array.from({ length: 12 }, (_, m) => updatedItem.monthlyActual[m] || 0);

  if (targetRowIndex > 1) {
    const rowValues = [
      updatedItem.id,
      updatedItem.code,
      updatedItem.name,
      updatedItem.category,
      updatedItem.subcategory,
      updatedItem.unit,
      updatedItem.unitPrice || 0,
      ...budgets,
      ...actuals,
      `=SUM(H${targetRowIndex}:S${targetRowIndex})`,
      `=SUM(T${targetRowIndex}:AE${targetRowIndex})`,
      `=AF${targetRowIndex}-AG${targetRowIndex}`,
      `=IF(AF${targetRowIndex}>0,AG${targetRowIndex}/AF${targetRowIndex},0)`,
      updatedItem.isOperationalApbs ? 'YA' : 'TIDAK',
      updatedItem.notes || '',
    ];

    await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${encodeURIComponent(`'${masterSheet}'!A${targetRowIndex}:AK${targetRowIndex}`)}?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
  }
}

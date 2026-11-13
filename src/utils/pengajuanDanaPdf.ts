import { jsPDF } from 'jspdf';
import {
  ApbsBudgetItem,
  DisbursementMethod,
  ExpenseTransaction,
  FormRequestType,
  PengajuanDanaApprovers,
  TEMPLATE_ENTITIES,
} from '../types/apbs';
import { formatRupiah } from './formatters';

export interface PengajuanDanaLineItem {
  date: string;
  apbsCode: string;
  description: string;
  qty: number;
  unitPrice: number;
  disbursementMethod: DisbursementMethod;
  notes: string;
  amount: number;
  saldoAwal: number;
  saldoAkhir: number;
}

export interface PengajuanDanaDocumentData {
  formType: FormRequestType;
  referenceNo: string;
  submissionDate: string; // YYYY-MM-DD
  executionDate: string; // YYYY-MM-DD
  requesterName: string;
  unitHead: string;
  department: string;
  purpose: string;
  disbursementMethod: DisbursementMethod;
  checkedEntities: string[];
  isApbs: boolean;
  lines: PengajuanDanaLineItem[];
  totalAmount: number;
  totalBudgetAnggaran: number;
  penyerapanPercent: number;
  danaTersisa: number;
  saldoDiterima: number;
  sisaDikembalikanMethod: 'Tunai' | 'Transfer';
  approvers: PengajuanDanaApprovers;
}

export const DEFAULT_APPROVERS: PengajuanDanaApprovers = {
  kepUnit: 'Soleh Sohibudin',
  depKeuangan: 'Rahmi',
  deputyGm: 'Andini Fitriani',
  direktorat: 'Mustafa Kamil',
};

export function mapPaymentMethodToDisbursement(
  pm?: ExpenseTransaction['paymentMethod']
): DisbursementMethod {
  if (pm === 'Kas GA' || pm === 'Petty Cash') return 'Tunai';
  if (pm === 'Transfer Bank' || pm === 'Reimbursement') return 'Transfer';
  return 'Lainnya';
}

export function formatDateShortEn(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mName = months[parseInt(m, 10) - 1] || m;
    return `${parseInt(d, 10)}/${mName}/${y}`;
  } catch {
    return dateStr;
  }
}

export function formatDateFullDayIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function buildDocumentFromTransactions(
  primaryTx: ExpenseTransaction,
  allTransactions: ExpenseTransaction[],
  items: ApbsBudgetItem[],
  groupByReference = true
): PengajuanDanaDocumentData {
  const refNo =
    primaryTx.formMeta?.referenceNo ||
    primaryTx.invoiceNo ||
    `PD-GA-${primaryTx.itemId}-${primaryTx.id.slice(-4)}`;

  const siblingTxs =
    groupByReference && refNo
      ? allTransactions.filter(
          (t) =>
            (t.formMeta?.referenceNo && t.formMeta.referenceNo === refNo) ||
            (t.invoiceNo && t.invoiceNo === refNo)
        )
      : [primaryTx];

  const txList = siblingTxs.length > 0 ? siblingTxs : [primaryTx];
  const meta = primaryTx.formMeta || {};

  // Build line items with APBS balance context
  const lines: PengajuanDanaLineItem[] = txList.map((tx) => {
    const item = items.find((it) => it.id === tx.itemId || it.code === tx.itemId);
    const currentRemaining = item ? item.totalBudget - item.totalActual : 0;
    const saldoAwal =
      tx.formMeta?.saldoAwalSnapshot !== undefined
        ? tx.formMeta.saldoAwalSnapshot
        : currentRemaining + tx.amount;
    const saldoAkhir =
      tx.formMeta?.saldoAkhirSnapshot !== undefined
        ? tx.formMeta.saldoAkhirSnapshot
        : currentRemaining;

    return {
      date: tx.date,
      apbsCode: item?.code || tx.itemId,
      description: tx.itemName,
      qty: tx.qty ?? 1,
      unitPrice: tx.unitPrice ?? tx.amount,
      disbursementMethod:
        tx.formMeta?.disbursementMethod || mapPaymentMethodToDisbursement(tx.paymentMethod),
      notes: tx.description || '-',
      amount: tx.amount,
      saldoAwal,
      saldoAkhir,
    };
  });

  // Deduplicate APBS budget balance per unique APBS code for aggregate Over/(Under) Budget box
  const seenCodes = new Map<string, number>();
  lines.forEach((l) => {
    if (!seenCodes.has(l.apbsCode)) {
      seenCodes.set(l.apbsCode, l.saldoAwal);
    }
  });
  let totalBudgetAnggaran = 0;
  seenCodes.forEach((val) => {
    totalBudgetAnggaran += val;
  });

  const totalAmount = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const penyerapanPercent = totalBudgetAnggaran > 0 ? (totalAmount / totalBudgetAnggaran) * 100 : 0;
  const danaTersisa = totalBudgetAnggaran - totalAmount;

  const inferredEntities = new Set<string>(meta.checkedEntities || []);
  if (inferredEntities.size === 0) {
    txList.forEach((t) => {
      const u = (t.unit || '').toUpperCase();
      TEMPLATE_ENTITIES.forEach((ent) => {
        if (u.includes(ent.toUpperCase())) inferredEntities.add(ent);
      });
    });
  }

  return {
    formType:
      meta.formType ||
      (primaryTx.paymentMethod === 'Reimbursement'
        ? 'Klaim/Laporan Pengeluaran'
        : 'Pengajuan Dana Kegiatan'),
    referenceNo: refNo,
    submissionDate: primaryTx.date,
    executionDate: meta.executionDate || primaryTx.date,
    requesterName: primaryTx.pic || 'Tim GA',
    unitHead: meta.unitHead || DEFAULT_APPROVERS.kepUnit,
    department: meta.department || primaryTx.unit || 'Umum',
    purpose: meta.purpose || primaryTx.description || primaryTx.itemName,
    disbursementMethod:
      meta.disbursementMethod || mapPaymentMethodToDisbursement(primaryTx.paymentMethod),
    checkedEntities: Array.from(inferredEntities),
    isApbs: meta.isApbs !== undefined ? meta.isApbs : true,
    lines,
    totalAmount,
    totalBudgetAnggaran,
    penyerapanPercent,
    danaTersisa,
    saldoDiterima: meta.saldoDiterima || 0,
    sisaDikembalikanMethod: meta.sisaDikembalikanMethod || 'Tunai',
    approvers: {
      kepUnit: meta.approvers?.kepUnit || meta.unitHead || DEFAULT_APPROVERS.kepUnit,
      depKeuangan: meta.approvers?.depKeuangan || DEFAULT_APPROVERS.depKeuangan,
      deputyGm: meta.approvers?.deputyGm || DEFAULT_APPROVERS.deputyGm,
      direktorat: meta.approvers?.direktorat || DEFAULT_APPROVERS.direktorat,
    },
  };
}

function drawCheckbox(doc: jsPDF, x: number, y: number, checked: boolean, size = 3.2) {
  doc.setDrawColor(40, 48, 60);
  doc.setLineWidth(0.25);
  doc.rect(x, y, size, size);
  if (checked) {
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.45);
    doc.line(x + 0.6, y + size * 0.55, x + size * 0.42, y + size - 0.6);
    doc.line(x + size * 0.42, y + size - 0.6, x + size - 0.5, y + 0.6);
    doc.setDrawColor(40, 48, 60);
    doc.setLineWidth(0.25);
  }
}

export function exportPengajuanDanaToPdf(data: PengajuanDanaDocumentData): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 297;
  const margin = 10;
  const contentW = pageW - margin * 2; // 277mm

  // Title Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, 8, contentW, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LAZUARDI GLOBAL COMPASSIONATE SCHOOL · FORMULIR PENGAJUAN / LAPORAN DANA', margin + 3, 13.8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('APBS GENERAL AFFAIRS TA 2026–2027', pageW - margin - 3, 13.8, { align: 'right' });

  doc.setTextColor(15, 23, 42);

  // Top Meta Row: Form Type Checkboxes + Ref No + Date + Entities Checklist
  let y = 20;

  // Left box: Form Type & Ref No (width 115mm)
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, 115, 20);

  drawCheckbox(doc, margin + 2.5, y + 2.5, data.formType === 'Pengajuan Dana Kegiatan');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Pengajuan Dana Kegiatan', margin + 7.5, y + 5.1);

  drawCheckbox(doc, margin + 58, y + 2.5, data.formType === 'Klaim/Laporan Pengeluaran');
  doc.text('Klaim/Laporan Pengeluaran', margin + 63, y + 5.1);

  doc.setDrawColor(220, 226, 234);
  doc.line(margin, y + 7.5, margin + 115, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('No. Referensi Laporan:', margin + 2.5, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(data.referenceNo || '-', margin + 36, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Tanggal Cetak/Dokumen:', margin + 2.5, y + 17.2);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateFullDayIndo(data.submissionDate), margin + 36, y + 17.2);

  // Middle box: Petunjuk Singkat & APBS Status (width 85mm)
  const midX = margin + 117;
  doc.setDrawColor(180, 190, 205);
  doc.rect(midX, y, 85, 20);
  doc.setFillColor(248, 250, 252);
  doc.rect(midX, y, 85, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PETUNJUK & STATUS APBS', midX + 2.5, y + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const noteLines = doc.splitTextToSize(
    'Nominal anggaran mengacu pada Kode Rek. APBS Unit. Untuk Laporan Pengeluaran, lengkapi Saldo Diterima & Sisa Dana Dikembalikan.',
    80
  );
  doc.text(noteLines, midX + 2.5, y + 9);

  drawCheckbox(doc, midX + 2.5, y + 15.2, data.isApbs, 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`APBS: ${data.isApbs ? 'YA (Terhubung Pagu APBS)' : 'NON-APBS'}`, midX + 7, y + 17.7);

  // Right box: Entity / Unit Checklist (width 73mm)
  const entX = midX + 87;
  const entW = 73;
  doc.setDrawColor(180, 190, 205);
  doc.rect(entX, y, entW, 20);
  doc.setFillColor(248, 250, 252);
  doc.rect(entX, y, entW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('UNIT / ENTITAS / PANITIA', entX + 2.5, y + 3.8);

  TEMPLATE_ENTITIES.forEach((ent, idx) => {
    const col = idx < 5 ? 0 : 1;
    const row = idx % 5;
    const cx = entX + 2.5 + col * 36;
    const cy = y + 6.5 + row * 2.6;
    const isChecked = data.checkedEntities.some(
      (c) => c.toLowerCase() === ent.toLowerCase()
    );
    drawCheckbox(doc, cx, cy, isChecked, 2.2);
    doc.setFont('helvetica', isChecked ? 'bold' : 'normal');
    doc.setFontSize(6.4);
    doc.text(ent, cx + 3.2, cy + 1.9);
  });

  // Identity & Pencairan Section
  y += 22.5;
  doc.setDrawColor(180, 190, 205);
  doc.rect(margin, y, contentW, 18);

  // Left strip inside identity: Metode Pencairan (30mm)
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, 30, 18, 'F');
  doc.line(margin + 30, y, margin + 30, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Pencairan:', margin + 2, y + 3.8);

  (['Tunai', 'Transfer', 'Lainnya'] as DisbursementMethod[]).forEach((m, idx) => {
    const my = y + 5.5 + idx * 4;
    drawCheckbox(doc, margin + 2.5, my, data.disbursementMethod === m, 2.8);
    doc.setFont('helvetica', data.disbursementMethod === m ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.text(m, margin + 7, my + 2.3);
  });

  // Identity Grid columns (x = margin + 30 to margin + contentW)
  const idX = margin + 32;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Nama Pemohon / PJ', idX, y + 4);
  doc.text('Tanggal Pengajuan', idX + 56, y + 4);
  doc.text('Tgl Pelaksanaan', idX + 98, y + 4);
  doc.text('Department / Unit', idX + 140, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(data.requesterName || '-', idX, y + 8);
  doc.text(formatDateShortEn(data.submissionDate), idX + 56, y + 8);
  doc.text(formatDateShortEn(data.executionDate), idX + 98, y + 8);
  doc.text(data.department || 'Umum', idX + 140, y + 8);

  doc.setDrawColor(225, 230, 238);
  doc.line(margin + 30, y + 9.5, margin + contentW, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Kepala Unit', idX, y + 13);
  doc.text('Tujuan Permintaan Dana / Laporan', idX + 56, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(data.unitHead || DEFAULT_APPROVERS.kepUnit, idX, y + 16.8);
  const purposeText = doc.splitTextToSize(data.purpose || '-', 184);
  doc.text(purposeText[0] || '-', idX + 56, y + 16.8);

  // Main Table Header & APBS Saldo Table Header
  y += 21;
  const mainCols = [
    { label: 'Tanggal', w: 20, align: 'center' as const },
    { label: 'Kode APBS', w: 19, align: 'center' as const },
    { label: 'Deskripsi', w: 40, align: 'left' as const },
    { label: 'Qty', w: 11, align: 'center' as const },
    { label: '@ Rp', w: 24, align: 'right' as const },
    { label: 'Pencairan', w: 20, align: 'center' as const },
    { label: 'Keterangan Pencairan Dana Kegiatan', w: 48, align: 'left' as const },
    { label: 'Jumlah', w: 26, align: 'right' as const },
  ]; // Sum = 208mm

  const rightTableX = margin + 212;
  const apbsCols = [
    { label: 'Kode APBS', w: 17, align: 'center' as const },
    { label: 'Saldo Awal', w: 24, align: 'right' as const },
    { label: 'Saldo Akhir', w: 24, align: 'right' as const },
  ]; // Sum = 65mm

  // Header row (height 9mm)
  doc.setFillColor(16, 185, 129); // Emerald header accent
  doc.setDrawColor(100, 116, 139);
  doc.rect(margin, y, 208, 9, 'F');
  doc.rect(rightTableX, y, 65, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);

  let cx = margin;
  mainCols.forEach((col) => {
    const tx =
      col.align === 'right'
        ? cx + col.w - 1.5
        : col.align === 'center'
          ? cx + col.w / 2
          : cx + 1.5;
    doc.text(col.label, tx, y + 5.7, { align: col.align });
    cx += col.w;
  });

  // Right table multi-line header ("Saldo Anggaran Awal / Akhir")
  doc.text('Kode APBS', rightTableX + 8.5, y + 5.7, { align: 'center' });
  doc.text('Saldo Anggaran', rightTableX + 17 + 24, y + 3.5, { align: 'center' });
  doc.setFontSize(6.8);
  doc.text('Awal', rightTableX + 17 + 12, y + 7.5, { align: 'center' });
  doc.text('Akhir', rightTableX + 17 + 24 + 12, y + 7.5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  y += 9;

  // Render rows (at least 5 visual rows like template, or more if lines.length > 5)
  const totalVisualRows = Math.max(5, Math.min(data.lines.length, 8));
  const rowH = totalVisualRows > 5 ? 9.5 : 11;

  for (let i = 0; i < totalVisualRows; i++) {
    const line = data.lines[i];
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 208, rowH, 'F');
      doc.rect(rightTableX, y, 65, rowH, 'F');
    }

    doc.setDrawColor(190, 200, 214);
    // Draw cell borders
    let xPos = margin;
    mainCols.forEach((col) => {
      doc.rect(xPos, y, col.w, rowH);
      xPos += col.w;
    });
    let rxPos = rightTableX;
    apbsCols.forEach((col) => {
      doc.rect(rxPos, y, col.w, rowH);
      rxPos += col.w;
    });

    if (line) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);

      let xCell = margin;
      // Tanggal
      doc.text(formatDateShortEn(line.date), xCell + 10, y + 4.8, { align: 'center' });
      xCell += mainCols[0].w;

      // Kode APBS
      doc.setFont('helvetica', 'bold');
      doc.text(`#${line.apbsCode}`, xCell + 9.5, y + 4.8, { align: 'center' });
      xCell += mainCols[1].w;

      // Deskripsi
      doc.setFont('helvetica', 'bold');
      const descLines = doc.splitTextToSize(line.description || '-', mainCols[2].w - 3);
      doc.text(descLines.slice(0, 2), xCell + 1.5, y + 4.2);
      xCell += mainCols[2].w;

      // Qty
      doc.setFont('helvetica', 'normal');
      doc.text(String(line.qty), xCell + 5.5, y + 4.8, { align: 'center' });
      xCell += mainCols[3].w;

      // @ Rp
      doc.text(formatRupiah(line.unitPrice), xCell + mainCols[4].w - 1.5, y + 4.8, {
        align: 'right',
      });
      xCell += mainCols[4].w;

      // Pencairan Dana
      doc.text(line.disbursementMethod, xCell + 10, y + 4.8, { align: 'center' });
      xCell += mainCols[5].w;

      // Keterangan
      const noteText = doc.splitTextToSize(line.notes || '-', mainCols[6].w - 3);
      doc.text(noteText.slice(0, 2), xCell + 1.5, y + 4.2);
      xCell += mainCols[6].w;

      // Jumlah
      doc.setFont('helvetica', 'bold');
      doc.text(formatRupiah(line.amount), xCell + mainCols[7].w - 1.5, y + 4.8, {
        align: 'right',
      });

      // Right APBS Control Table
      doc.setFont('helvetica', 'bold');
      doc.text(`#${line.apbsCode}`, rightTableX + 8.5, y + 4.8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(formatRupiah(line.saldoAwal), rightTableX + 17 + 22.5, y + 4.8, {
        align: 'right',
      });
      doc.setFont('helvetica', 'bold');
      doc.text(formatRupiah(line.saldoAkhir), rightTableX + 17 + 24 + 22.5, y + 4.8, {
        align: 'right',
      });
    }

    y += rowH;
  }

  // Total Row (height 7.5mm)
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 208, 7.5, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, y, 208, 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL PENGAJUAN / PENGELUARAN', margin + 180, y + 5, { align: 'right' });
  doc.setTextColor(4, 120, 87);
  doc.text(formatRupiah(data.totalAmount), margin + 206.5, y + 5, { align: 'right' });
  doc.setTextColor(15, 23, 42);

  y += 10;

  // Bottom Section: Left = PJ, Cek APBS & 4 Approval Boxes (208mm); Right = Over/(Under) Budget & Saldo Diterima (65mm)
  const bottomStartY = y;

  // Left top strip: PJ & Cek APBS (height 12mm)
  doc.setDrawColor(180, 190, 205);
  doc.rect(margin, bottomStartY, 102, 12);
  doc.rect(margin + 106, bottomStartY, 102, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('PJ (Penanggung Jawab)', margin + 2.5, bottomStartY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Nama & Tgl :  ${data.requesterName}   (${formatDateShortEn(data.submissionDate)})`,
    margin + 2.5,
    bottomStartY + 9
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Cek APBS :', margin + 108.5, bottomStartY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('Tgl : .......................     Nama : ......................................', margin + 108.5, bottomStartY + 9);

  // 4 Approval Boxes (y = bottomStartY + 14.5, height = 34mm, each width = 50.5mm, gap = 2mm)
  const appY = bottomStartY + 14.5;
  const appH = 34;
  const appW = 50.5;
  const approvals = [
    { title: 'Persetujuan Kep. Unit', name: data.approvers.kepUnit },
    { title: 'Persetujuan Dep. Keuangan', name: data.approvers.depKeuangan },
    { title: 'Persetujuan Deputy GM', name: data.approvers.deputyGm },
    { title: 'Persetujuan Direktorat', name: data.approvers.direktorat },
  ];

  approvals.forEach((app, idx) => {
    const ax = margin + idx * (appW + 2);
    doc.setDrawColor(160, 172, 188);
    doc.rect(ax, appY, appW, appH);
    doc.setFillColor(248, 250, 252);
    doc.rect(ax, appY, appW, 6.5, 'F');
    doc.line(ax, appY + 6.5, ax + appW, appY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(app.title, ax + appW / 2, appY + 4.4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('Tgl: ............................', ax + 2.5, appY + 11.5);

    // Signature line & name at bottom
    doc.setDrawColor(203, 213, 225);
    doc.line(ax + 4, appY + 27, ax + appW - 4, appY + 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text(app.name, ax + appW / 2, appY + 31.5, { align: 'center' });
  });

  // Right Box 1: Over/(Under) Budget (width 65mm)
  doc.setDrawColor(160, 172, 188);
  doc.rect(rightTableX, bottomStartY, 65, 26);
  doc.setFillColor(241, 245, 249);
  doc.rect(rightTableX, bottomStartY, 65, 6, 'F');
  doc.line(rightTableX, bottomStartY + 6, rightTableX + 65, bottomStartY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.3);
  doc.text('Over / (Under) Budget', rightTableX + 32.5, bottomStartY + 4.2, { align: 'center' });

  const budgetRows = [
    { label: 'Anggaran', val: formatRupiah(data.totalBudgetAnggaran), bold: false },
    { label: 'Realisasi / Pengajuan', val: formatRupiah(data.totalAmount), bold: false },
    { label: 'Penyerapan Anggaran', val: `${data.penyerapanPercent.toFixed(1)}%`, bold: true },
    { label: 'Dana Tersisa', val: formatRupiah(data.danaTersisa), bold: true },
  ];

  budgetRows.forEach((r, idx) => {
    const ry = bottomStartY + 10.2 + idx * 4.4;
    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.text(r.label, rightTableX + 2.5, ry);
    doc.text(r.val, rightTableX + 62.5, ry, { align: 'right' });
  });

  // Right Box 2: Saldo Diterima (Saat Laporan) (width 65mm)
  const saldoY = bottomStartY + 28;
  doc.setDrawColor(160, 172, 188);
  doc.rect(rightTableX, saldoY, 65, 20.5);
  doc.setFillColor(248, 250, 252);
  doc.rect(rightTableX, saldoY, 65, 5.5, 'F');
  doc.line(rightTableX, saldoY + 5.5, rightTableX + 65, saldoY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Saldo Diterima (Laporan Pengeluaran)', rightTableX + 32.5, saldoY + 3.8, {
    align: 'center',
  });

  const hutangYayasan =
    data.saldoDiterima > 0 && data.totalAmount > data.saldoDiterima
      ? data.totalAmount - data.saldoDiterima
      : 0;
  const sisaDikembalikan =
    data.saldoDiterima > 0 && data.saldoDiterima > data.totalAmount
      ? data.saldoDiterima - data.totalAmount
      : 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Saldo Diterima:', rightTableX + 2.5, saldoY + 9.2);
  doc.setFont('helvetica', 'bold');
  doc.text(formatRupiah(data.saldoDiterima), rightTableX + 62.5, saldoY + 9.2, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Hutang ke Yayasan:', rightTableX + 2.5, saldoY + 13.4);
  doc.text(formatRupiah(hutangYayasan), rightTableX + 62.5, saldoY + 13.4, { align: 'right' });

  doc.text(`Sisa Dikembalikan (${data.sisaDikembalikanMethod}):`, rightTableX + 2.5, saldoY + 17.6);
  doc.text(formatRupiah(sisaDikembalikan), rightTableX + 62.5, saldoY + 17.6, { align: 'right' });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Dicetak melalui APBS 2026 GA Tracker · Lazuardi GCS Cinere · Ref: ${data.referenceNo}`,
    margin,
    203
  );

  const safeFilename = (data.referenceNo || 'Pengajuan_Dana_APBS').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`${safeFilename}.pdf`);
}

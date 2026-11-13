export const MONTH_NAMES = [
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
];

export const MONTH_YEARS = [
  'Juli 2026', 'Agustus 2026', 'September 2026', 'Oktober 2026', 'November 2026', 'Desember 2026',
  'Januari 2027', 'Februari 2027', 'Maret 2027', 'April 2027', 'Mei 2027', 'Juni 2027'
];

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatNumber(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-${formatted}` : formatted;
}

export function formatShortRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  const absVal = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absVal >= 1_000_000_000) {
    return `${sign}Rp ${(absVal / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (absVal >= 1_000_000) {
    return `${sign}Rp ${(absVal / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  }
  if (absVal >= 1_000) {
    return `${sign}Rp ${(absVal / 1_000).toFixed(0)} Rb`;
  }
  return formatRupiah(amount);
}

export function formatPercent(percent: number): string {
  if (isNaN(percent) || percent === null || percent === undefined) return '0,0%';
  return `${percent.toFixed(1).replace('.', ',')}%`;
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-');
    const mIdx = parseInt(month, 10) - 1;
    const indoMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${parseInt(day, 10)} ${indoMonths[mIdx] || month} ${year}`;
  } catch {
    return dateStr;
  }
}

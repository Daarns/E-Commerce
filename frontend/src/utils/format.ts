// Convert decimal string from Go backend to number
// Handles: string ("150000.00"), number, undefined, null
export function toNum(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  return typeof val === 'number' ? val : parseFloat(val) || 0;
}

// Accepts number OR decimal string from Go backend (e.g. "150000.00").
// Returns formatted IDR currency. Returns "Rp 0" on NaN instead of crashing.
export function formatCurrency(amount: number | string, currency: string = 'IDR'): string {
  const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(parsed)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parsed);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCountdown(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${seconds}s`;
}

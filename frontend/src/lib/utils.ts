import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Merge Tailwind CSS class names with conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupee currency.
 * e.g. 1234.5 -> "â‚¹1,234.50"
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  options?: { showSymbol?: boolean; decimals?: number }
): string {
  const { showSymbol = true, decimals = 2 } = options ?? {};
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);

  if (isNaN(num)) return showSymbol ? 'â‚¹0.00' : '0.00';

  const formatted = new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);

  return formatted;
}

/**
 * Format a date string or Date object.
 * @param date - ISO string or Date
 * @param fmt - date-fns format string (default: 'dd MMM yyyy')
 */
export function formatDate(
  date: string | Date | null | undefined,
  fmt = 'dd MMM yyyy'
): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return format(d, fmt);
  } catch {
    return '-';
  }
}

/**
 * Format a GST number for display.
 * e.g. "27AABCU9603R1ZX" -> "27AABCU9603R1ZX" (formatted with spaces)
 */
export function formatGST(gst: string | null | undefined): string {
  if (!gst) return '-';
  const clean = gst.replace(/\s/g, '').toUpperCase();
  if (clean.length !== 15) return clean;
  // Format as: 2-digit state + 10-digit PAN + 1-digit entity + Z + check
  return `${clean.slice(0, 2)} ${clean.slice(2, 12)} ${clean.slice(12, 13)} ${clean.slice(13, 14)} ${clean.slice(14)}`;
}

/**
 * Truncate a string to a max length, appending ellipsis.
 */
export function truncate(
  text: string | null | undefined,
  maxLength = 50
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format a quantity with unit.
 * e.g. formatQuantity(100, 'strips') -> '100 strips'
 */
export function formatQuantity(qty: number, unit?: string): string {
  if (unit) return `${qty.toLocaleString('en-IN')} ${unit}`;
  return qty.toLocaleString('en-IN');
}

/**
 * Calculate GST amount from base price and GST percentage.
 */
export function calculateGSTAmount(basePrice: number, gstPercent: number): number {
  return parseFloat(((basePrice * gstPercent) / 100).toFixed(2));
}

/**
 * Get expiry status color class based on days until expiry.
 */
export function getExpiryStatusClass(expiryDate: string | Date | null | undefined): string {
  if (!expiryDate) return 'text-muted-foreground';
  const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'text-destructive font-semibold';
  if (daysUntilExpiry <= 30) return 'text-red-500 font-semibold';
  if (daysUntilExpiry <= 90) return 'text-yellow-600 font-semibold';
  return 'text-green-600';
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

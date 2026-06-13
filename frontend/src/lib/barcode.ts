/**
 * Barcode scanner handler for USB/HID barcode scanners.
 *
 * USB barcode scanners act as keyboard emulators - they type characters
 * very rapidly and terminate with Enter (keyCode 13).
 *
 * This module provides utilities to capture barcode scans globally
 * and distinguish them from normal keyboard input.
 */

type BarcodeHandler = (barcode: string) => void;
type CleanupFn = () => void;

export interface BarcodeScannerOptions {
  /** Minimum characters for a valid barcode (default: 3) */
  minLength?: number;
  /** Maximum ms between keystrokes to consider it a scan (default: 50ms) */
  scannerThreshold?: number;
  /** Characters that terminate a scan (default: ['Enter']) */
  terminators?: string[];
  /** Prefix character(s) the scanner sends before the barcode (optional) */
  prefix?: string;
  /** Suffix to strip from end of barcode (optional) */
  suffix?: string;
  /** Only active when this element or its children have focus (optional) */
  targetElement?: HTMLElement | null;
}

const DEFAULT_OPTIONS: Required<Omit<BarcodeScannerOptions, 'targetElement' | 'prefix' | 'suffix'>> = {
  minLength: 3,
  scannerThreshold: 50,
  terminators: ['Enter'],
};

/**
 * Attach a global barcode scanner listener.
 *
 * @param onScan - Callback invoked with the scanned barcode string
 * @param options - Configuration options
 * @returns Cleanup function to remove the listener
 *
 * @example
 * const cleanup = attachBarcodeScanner((barcode) => {
 *   console.log('Scanned:', barcode);
 *   searchMedicine(barcode);
 * });
 *
 * // On component unmount:
 * cleanup();
 */
export function attachBarcodeScanner(
  onScan: BarcodeHandler,
  options: BarcodeScannerOptions = {}
): CleanupFn {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let buffer = '';
  let lastKeyTime = 0;
  let isScanning = false;

  const handleKeyDown = (event: KeyboardEvent) => {
    // Ignore if a modifier key is held (user shortcut, not scanner)
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    // Check if target element constraint is met
    if (opts.targetElement && !opts.targetElement.contains(document.activeElement)) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastKeyTime;
    lastKeyTime = now;

    // Detect terminator keys
    if (opts.terminators.includes(event.key)) {
      if (buffer.length >= opts.minLength) {
        let barcode = buffer;

        // Strip prefix if configured
        if (opts.prefix && barcode.startsWith(opts.prefix)) {
          barcode = barcode.slice(opts.prefix.length);
        }

        // Strip suffix if configured
        if (opts.suffix && barcode.endsWith(opts.suffix)) {
          barcode = barcode.slice(0, -opts.suffix.length);
        }

        if (barcode.length >= opts.minLength) {
          // Prevent default Enter behavior if we captured a scan
          if (isScanning) {
            event.preventDefault();
          }
          onScan(barcode.trim());
        }
      }
      buffer = '';
      isScanning = false;
      return;
    }

    // Only accept printable characters
    if (event.key.length !== 1) return;

    // Reset buffer if too much time has passed (human typing)
    if (timeSinceLast > opts.scannerThreshold && buffer.length > 0) {
      buffer = '';
      isScanning = false;
    }

    // Fast typing indicates a scanner
    if (timeSinceLast <= opts.scannerThreshold && buffer.length > 0) {
      isScanning = true;
    }

    buffer += event.key;
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * React hook for barcode scanner integration.
 *
 * @example
 * function POSComponent() {
 *   useBarcodeScanner((barcode) => {
 *     addItemToCart(barcode);
 *   });
 *
 *   return <div>...</div>;
 * }
 */
import { useEffect, useRef } from 'react';

export function useBarcodeScanner(
  onScan: BarcodeHandler,
  options: BarcodeScannerOptions = {}
) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const cleanup = attachBarcodeScanner(
      (barcode) => onScanRef.current(barcode),
      options
    );
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.minLength, options.scannerThreshold, options.targetElement]);
}

/**
 * Validate a barcode format.
 * Supports EAN-13, EAN-8, UPC-A, Code-128, Code-39.
 */
export function validateBarcode(barcode: string): {
  isValid: boolean;
  format?: string;
  error?: string;
} {
  const clean = barcode.trim();

  if (!clean) {
    return { isValid: false, error: 'Empty barcode' };
  }

  // EAN-13 (13 digits)
  if (/^\d{13}$/.test(clean)) {
    return { isValid: validateEAN13(clean), format: 'EAN-13' };
  }

  // EAN-8 (8 digits)
  if (/^\d{8}$/.test(clean)) {
    return { isValid: true, format: 'EAN-8' };
  }

  // UPC-A (12 digits)
  if (/^\d{12}$/.test(clean)) {
    return { isValid: true, format: 'UPC-A' };
  }

  // Code-39 (alphanumeric with special chars)
  if (/^[A-Z0-9\-. $/+%]+$/.test(clean) && clean.length >= 1) {
    return { isValid: true, format: 'Code-39' };
  }

  // Code-128 (ASCII printable)
  if (clean.length >= 1 && clean.length <= 48) {
    return { isValid: true, format: 'Code-128' };
  }

  return { isValid: false, error: 'Unknown barcode format' };
}

function validateEAN13(barcode: string): boolean {
  if (barcode.length !== 13) return false;
  const digits = barcode.split('').map(Number);
  const checkDigit = digits[12];
  const sum = digits
    .slice(0, 12)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

/**
 * Format a barcode for display (add spaces for readability).
 */
export function formatBarcodeDisplay(barcode: string): string {
  const clean = barcode.trim();
  if (clean.length === 13) {
    // EAN-13: X XXXXXX XXXXXX
    return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
  }
  if (clean.length === 12) {
    // UPC-A: XXXXXX XXXXXX
    return `${clean.slice(0, 6)} ${clean.slice(6)}`;
  }
  return clean;
}

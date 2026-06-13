"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScanBarcode, X, Loader2 } from "lucide-react";

interface BarcodeInputProps {
  onScan: (barcode: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  scanDelay?: number;
  minLength?: number;
}

/**
 * Barcode scanner input component.
 * Detects rapid keystrokes from a hardware barcode scanner (typically completes in < 100ms)
 * and distinguishes them from manual keyboard input.
 *
 * Behavior:
 * - If consecutive keystrokes arrive within `scanDelay` ms, treats the sequence as a scan.
 * - On Enter key (common scanner terminator) the buffered value is submitted.
 * - Manual typing is still possible; press Enter to submit manually.
 */
export default function BarcodeInput({
  onScan,
  placeholder = "Scan or type barcode...",
  disabled = false,
  autoFocus = false,
  className = "",
  scanDelay = 80,
  minLength = 3,
}: BarcodeInputProps) {
  const [value, setValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef("");
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const submitBarcode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (trimmed.length < minLength) return;
      setLoading(true);
      try {
        await onScan(trimmed);
      } finally {
        setLoading(false);
        setValue("");
        scanBufferRef.current = "";
      }
    },
    [onScan, minLength]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      setLastKeyTime(now);

      // Enter key â€” submit regardless of source
      if (e.key === "Enter") {
        e.preventDefault();
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        setIsScanning(false);
        submitBarcode(value);
        return;
      }

      // Detect scanner: rapid consecutive keystrokes
      if (timeDiff < scanDelay && e.key.length === 1) {
        setIsScanning(true);
        scanBufferRef.current += e.key;

        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        scanTimerRef.current = setTimeout(() => {
          setIsScanning(false);
          // Scanner finished â€” submit the buffered code
          if (scanBufferRef.current.length >= minLength) {
            submitBarcode(scanBufferRef.current);
          }
          scanBufferRef.current = "";
        }, scanDelay * 2);
      } else {
        // Manual keystroke â€” reset scanner buffer
        scanBufferRef.current = "";
        setIsScanning(false);
      }
    },
    [lastKeyTime, scanDelay, value, submitBarcode, minLength]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    setValue("");
    scanBufferRef.current = "";
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div
        className={`
          absolute left-3 transition-colors
          ${isScanning ? "text-blue-500 animate-pulse" : "text-gray-400"}
        `}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ScanBarcode className="w-4 h-4" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        autoComplete="off"
        spellCheck={false}
        className={`
          w-full pl-10 pr-9 py-2.5 text-sm rounded-lg
          border transition-colors outline-none
          bg-white dark:bg-gray-900
          text-gray-900 dark:text-gray-100
          placeholder:text-gray-400
          ${
            isScanning
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />

      {value && !loading && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          tabIndex={-1}
          aria-label="Clear"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {isScanning && (
        <span className="absolute -top-6 left-0 text-xs text-blue-500 font-medium animate-pulse">
          Scanning...
        </span>
      )}
    </div>
  );
}

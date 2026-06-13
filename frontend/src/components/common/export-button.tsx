"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from "lucide-react";

export type ExportFormat = "pdf" | "excel" | "csv";

interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void> | void;
  formats?: ExportFormat[];
  disabled?: boolean;
  label?: string;
}

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: typeof FileText; ext: string }> = {
  pdf: { label: "Export PDF", icon: FileText, ext: ".pdf" },
  excel: { label: "Export Excel", icon: FileSpreadsheet, ext: ".xlsx" },
  csv: { label: "Export CSV", icon: FileSpreadsheet, ext: ".csv" },
};

export default function ExportButton({
  onExport,
  formats = ["pdf", "excel", "csv"],
  disabled = false,
  label = "Export",
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    setOpen(false);
    try {
      await onExport(format);
    } finally {
      setLoading(null);
    }
  };

  if (formats.length === 1) {
    const fmt = formats[0];
    const config = FORMAT_CONFIG[fmt];
    const Icon = config.icon;
    return (
      <button
        onClick={() => handleExport(fmt)}
        disabled={disabled || loading !== null}
        className="
          inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-200
          hover:bg-gray-50 dark:hover:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        {loading === fmt ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        {config.label}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={disabled || loading !== null}
        className="
          inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-200
          hover:bg-gray-50 dark:hover:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-1 w-44 py-1 rounded-lg shadow-xl z-50
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        ">
          {formats.map((fmt) => {
            const config = FORMAT_CONFIG[fmt];
            const Icon = config.icon;
            return (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="
                  flex items-center gap-3 w-full px-4 py-2.5 text-sm
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  transition-colors
                "
              >
                <Icon className="w-4 h-4 text-gray-400" />
                {config.label}
                <span className="ml-auto text-xs text-gray-400">{config.ext}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

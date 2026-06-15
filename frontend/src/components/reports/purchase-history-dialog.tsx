"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/api";
import { X, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PurchaseRow {
  supplierName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  availableQty: number;
}

function fmtExp(d: unknown): string {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (isNaN(dt.getTime())) return String(d);
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

/**
 * Popup table of every purchase (batch) of one medicine across all suppliers.
 * Columns: Sr No · Supplier · Batch · Expiry · Qty. Fed by
 * GET /medicines/:id/purchases. Closes on Escape / backdrop / ✕.
 */
export function PurchaseHistoryDialog({
  medicineId,
  medicineName,
  onClose,
}: {
  medicineId: string | null;
  medicineName?: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!medicineId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setName(medicineName ?? "");
    let cancelled = false;
    apiClient
      .get(`/medicines/${medicineId}/purchases`)
      .then((r) => {
        if (cancelled) return;
        setRows(Array.isArray(r.data?.rows) ? r.data.rows : []);
        if (r.data?.medicine?.name) setName(r.data.medicine.name);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [medicineId, medicineName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (medicineId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [medicineId, onClose]);

  if (!medicineId || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
              {name || "Item"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Purchases from all parties</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No purchases found for this item.
            </div>
          ) : (
            <Table className="text-xs [&_td]:py-1.5 [&_th]:h-8">
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12">Sr No</TableHead>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-gray-400 dark:text-gray-500">{i + 1}</TableCell>
                    <TableCell className="text-gray-800 dark:text-gray-200">{r.supplierName}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-gray-700 dark:text-gray-300">
                      {r.batchNumber}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {fmtExp(r.expiryDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {r.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

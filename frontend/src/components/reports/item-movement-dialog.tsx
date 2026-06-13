"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/api";
import { X, ShoppingCart, ShoppingBag, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

/** Short dd/mm/yy date used across all report tables. */
export function fmtDate(d: unknown): string {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export interface MovementRow {
  date: string;
  party: string;
  invoiceNumber: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface ItemDetail {
  medicine: {
    id: string;
    name: string;
    packing: string;
    company: string;
    category: string;
    mrp: number;
    saleRate: number;
    purchaseRate: number;
    stock: number;
  };
  summary: {
    totalQtySold: number;
    totalRevenue: number;
    totalMargin: number;
    thisMonthQty: number;
    thisMonthRevenue: number;
  };
  sales: MovementRow[];
  purchases: MovementRow[];
}

/**
 * Wide centered popup showing one item's movement. Two switchable tabs:
 *  • Recent Sales — to whom (customers) the item was sold
 *  • Recent Purchases — from which parties (suppliers) it was purchased
 * Fed by GET /reports/items/:id/detail. Reused by the Zero-Stock and
 * Not-Sold report lists (open on Enter / row click).
 */
export function ItemMovementDialog({
  itemId,
  onClose,
}: {
  itemId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"sales" | "purchases">("sales");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!itemId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setTab("sales");
    let cancelled = false;
    apiClient
      .get(`/reports/items/${itemId}/detail`)
      .then((r) => {
        if (!cancelled) setDetail(r.data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (itemId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemId, onClose]);

  if (!itemId || !mounted) return null;

  const rows = detail ? (tab === "sales" ? detail.sales : detail.purchases) : [];
  const partyLabel = tab === "sales" ? "Customer" : "Supplier";
  const m = detail?.medicine;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
              {m?.name ?? "Item"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {[m?.company, m?.packing].filter(Boolean).join(" · ")}
              {m ? ` · Stock: ${m.stock}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 px-3 pt-2 dark:border-gray-800">
          {(["sales", "purchases"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-700 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {t === "sales" ? (
                <ShoppingCart className="h-3.5 w-3.5" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
              {t === "sales" ? "Recent Sales" : "Recent Purchases"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No {tab === "sales" ? "sales" : "purchases"} found for this item.
            </div>
          ) : (
            <Table className="text-xs [&_td]:py-1 [&_th]:h-8">
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>{partyLabel}</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {fmtDate(r.date)}
                    </TableCell>
                    <TableCell>{r.party}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-blue-600">
                      {r.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-right">{r.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.rate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.amount)}
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

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Trash2,
  RefreshCw,
  X,
  TrendingDown,
  CalendarClock,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  Spinner,
  ds,
} from "@/components/design-system";
import { apiClient } from "@/lib/api";

interface ExpiringItem {
  id: string;
  medicine_name: string;
  brand: string;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  days_left: number;
  stock: number;
  supplier: string;
  location: string;
  purchase_rate: number;
}

type ExpiryRange = "all" | "week" | "month";
type ActionType = "return" | "writeoff";

// Expiry is always month/year only → "MM/YY".
function formatExpiry(dateStr: string): string {
  if (!dateStr) return "—";
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return dateStr;
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getDaysLeftBadge(daysLeft: number) {
  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Expired {Math.abs(daysLeft)}d ago
      </span>
    );
  }
  if (daysLeft === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Expires Today
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/40 px-2.5 py-1 text-xs font-semibold text-orange-700">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        {daysLeft}d left
      </span>
    );
  }
  if (daysLeft <= 60) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-950/40 px-2.5 py-1 text-xs font-semibold text-yellow-700">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        {daysLeft}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-950/40 px-2.5 py-1 text-xs font-semibold text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {daysLeft}d left
    </span>
  );
}

function getRowClass(daysLeft: number): string {
  if (daysLeft < 0) return "bg-red-50 dark:bg-red-950/40 border-l-4 border-l-red-500";
  if (daysLeft <= 30) return "bg-orange-50 dark:bg-orange-950/40 border-l-4 border-l-orange-400";
  if (daysLeft <= 60) return "bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-l-yellow-400";
  return "bg-green-50/50 dark:bg-green-950/40 border-l-4 border-l-green-400";
}

export default function ExpiryPage() {
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ExpiryRange>("all");
  const [actionModal, setActionModal] = useState<{
    item: ExpiringItem;
    type: ActionType;
  } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExpiring();
  }, []);

  async function fetchExpiring() {
    setLoading(true);
    try {
      const res = await apiClient.get("/inventory/expiring", { params: { days: 365 } });
      const batches: any[] = res.data?.batches ?? res.data?.items ?? res.data ?? [];
      const mapped: ExpiringItem[] = batches.map((b) => {
        const expiry = b.expiryDate ?? b.expiry_date ?? "";
        return {
          id: b.id,
          medicine_name: b.medicine?.name ?? b.medicine_name ?? "",
          brand: b.medicine?.genericName ?? "",
          batch_number: b.batchNumber ?? b.batch_number ?? "",
          mfg_date: b.manufacturingDate ?? b.mfg_date ?? "",
          expiry_date: expiry,
          days_left: expiry
            ? Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0,
          stock: b.availableQty ?? b.stock ?? 0,
          supplier: b.supplier?.name ?? b.supplier ?? "",
          location: b.location ?? "",
          purchase_rate: Number(b.purchaseRate ?? b.purchase_rate ?? 0),
        };
      });
      setItems(mapped);
    } catch {
      setItems([]); // real data only — no mock fallback
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const active = items.filter((i) => !processedIds.has(i.id));
    return {
      all: active.length,
      week: active.filter((i) => i.days_left <= 7).length,
      month: active.filter((i) => i.days_left <= 30).length,
    };
  }, [items, processedIds]);

  const filtered = useMemo(() => {
    const active = items.filter((i) => !processedIds.has(i.id));
    if (range === "week") return active.filter((i) => i.days_left <= 7);
    if (range === "month") return active.filter((i) => i.days_left <= 30);
    return active; // all
  }, [items, range, processedIds]);

  const stockValueAtRisk = useMemo(
    () =>
      filtered.reduce(
        (sum, item) => sum + item.stock * item.purchase_rate,
        0
      ),
    [filtered]
  );

  async function handleAction() {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      await fetch(
        `/api/v1/inventory/batches/${actionModal.item.id}/${actionModal.type}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: actionNote }),
        }
      );
    } catch {
      // Handle locally for demo
    }
    setProcessedIds((prev) => new Set(prev).add(actionModal.item.id));
    setActionModal(null);
    setActionNote("");
    setSubmitting(false);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expiry Alert Management"
        subtitle="Monitor and act on medicines nearing or past their expiry date"
        icon={CalendarClock}
        actions={
          <button onClick={fetchExpiring} className={ds.btnOutline}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {/* Table Card */}
      <Panel className="overflow-hidden">
        {/* Range filter + Stock Value at Risk */}
        <PanelBar muted>
          <div className="flex items-center gap-3">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as ExpiryRange)}
              className="h-8 w-44 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="all">All ({counts.all})</option>
              <option value="week">This Week ({counts.week})</option>
              <option value="month">This Month ({counts.month})</option>
            </select>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">{filtered.length}</span>{" "}
              items
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stock Value at Risk:{" "}
              <span className="font-bold text-red-600">
                {formatCurrency(stockValueAtRisk)}
              </span>
            </p>
          </div>
        </PanelBar>

        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <CheckCircle className="h-12 w-12 mb-3 text-green-400" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">All clear!</p>
            <p className="text-sm">No medicines in this category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left bg-slate-800">
                  {[
                    "S.No",
                    "Item Name",
                    "Batch #",
                    "Expiry",
                    "Days Left",
                    "Stock",
                    "Supplier",
                    "Location",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="h-8 whitespace-nowrap px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-white"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`${getRowClass(item.days_left)} hover:brightness-95 transition-all`}
                  >
                    <td className="px-2 py-1.5 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {item.medicine_name}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="whitespace-nowrap rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {item.batch_number}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`text-xs font-medium ${
                          item.days_left < 0
                            ? "text-red-700"
                            : item.days_left <= 30
                            ? "text-orange-700"
                            : item.days_left <= 60
                            ? "text-yellow-700"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {formatExpiry(item.expiry_date)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      {getDaysLeftBadge(item.days_left)}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {item.stock}{" "}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">units</span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{item.supplier}</td>
                    <td className="px-2 py-1.5">
                      <span className="rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-xs text-blue-700">
                        {item.location}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setActionModal({ item, type: "return" })
                          }
                          title="Mark for Return"
                          className="flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Return
                        </button>
                        <button
                          onClick={() =>
                            setActionModal({ item, type: "writeoff" })
                          }
                          title="Write Off"
                          className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Write Off
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
            <div
              className={`flex items-center justify-between rounded-t-2xl px-6 py-4 ${
                actionModal.type === "return"
                  ? "bg-blue-600"
                  : "bg-red-600"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionModal.type === "return" ? (
                  <RotateCcw className="h-5 w-5 text-white" />
                ) : (
                  <Trash2 className="h-5 w-5 text-white" />
                )}
                <h2 className="text-lg font-semibold text-white">
                  {actionModal.type === "return"
                    ? "Mark for Return"
                    : "Write Off Stock"}
                </h2>
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="rounded-lg p-1 hover:bg-white/20"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Item Info */}
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 p-4">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {actionModal.item.medicine_name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {actionModal.item.brand} | Batch:{" "}
                  {actionModal.item.batch_number}
                </p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Stock:{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {actionModal.item.stock} units
                    </span>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Value:{" "}
                    <span className="font-semibold text-red-600">
                      {formatCurrency(
                        actionModal.item.stock * actionModal.item.purchase_rate
                      )}
                    </span>
                  </span>
                </div>
                <div className="mt-2">
                  {getDaysLeftBadge(actionModal.item.days_left)}
                </div>
              </div>

              {/* Warning */}
              <div
                className={`flex gap-2 rounded-lg border p-3 ${
                  actionModal.type === "writeoff"
                    ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40"
                    : "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    actionModal.type === "writeoff"
                      ? "text-red-500"
                      : "text-blue-500"
                  }`}
                />
                <p
                  className={`text-xs ${
                    actionModal.type === "writeoff"
                      ? "text-red-700"
                      : "text-blue-700"
                  }`}
                >
                  {actionModal.type === "writeoff"
                    ? "This action will permanently write off the stock and cannot be undone. The loss will be recorded in accounts."
                    : "This will mark the batch for return to the supplier. Ensure the supplier has been notified."}
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Note / Reason
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={`Enter reason for ${
                    actionModal.type === "return" ? "return" : "write-off"
                  }...`}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setActionModal(null)}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={submitting}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                    actionModal.type === "return"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submitting
                    ? "Processing..."
                    : actionModal.type === "return"
                    ? "Confirm Return"
                    : "Confirm Write Off"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

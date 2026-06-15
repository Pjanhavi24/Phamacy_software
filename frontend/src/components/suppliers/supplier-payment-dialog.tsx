"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { X, Loader2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  paymentStatus: string; // pending | partial | paid (lowercased)
}

const METHODS = [
  { key: "cash", label: "Cash" },
  { key: "cheque", label: "Cheque" },
  { key: "upi", label: "UPI" },
  { key: "neft", label: "NEFT" },
];

function fmtDate(d: unknown): string {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function SupplierPaymentDialog({
  supplier,
  onClose,
}: {
  supplier: Record<string, any> | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState("cash");
  const [payDate, setPayDate] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  const supplierId = supplier?.id as string | undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["supplier-invoices", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const r = await apiClient.get("/purchases", { params: { supplierId, limit: 300 } });
      const list: any[] = r.data?.purchases ?? r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
      return list.map((p) => ({
        id: String(p.id),
        invoiceNumber: String(p.invoiceNumber ?? p.invoiceNo ?? p.id),
        date: p.invoiceDate ?? p.createdAt ?? "",
        amount: Number(p.netAmount ?? p.totalAmount ?? 0),
        paymentStatus: String(p.paymentStatus ?? "pending").toLowerCase(),
      })) as Invoice[];
    },
  });

  // Most recent first.
  const invoices = useMemo(
    () => [...(data ?? [])].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [data]
  );

  useEffect(() => {
    setSelectedIndex((i) => (invoices.length === 0 ? 0 : Math.min(i, invoices.length - 1)));
  }, [invoices.length]);

  // Keyboard navigation: ↑/↓ move, Enter expands the row, Esc closes.
  useEffect(() => {
    if (!supplierId) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "Escape") { onClose(); return; }
      if (invoices.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, invoices.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const inv = invoices[selectedIndex];
        if (inv) setExpandedId((cur) => (cur === inv.id ? null : inv.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [supplierId, invoices, selectedIndex, onClose]);

  if (!supplierId || !mounted) return null;

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const recordPayment = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        ids.map((id) =>
          apiClient.put(`/purchases/${id}/payment`, {
            paymentStatus: "paid",
            paymentMethod: method,
            paymentDate: payDate,
          })
        )
      );
      toast.success(ids.length > 1 ? `${ids.length} bills marked paid.` : "Payment recorded.");
      setExpandedId(null);
      setChecked(new Set());
      await refetch();
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  };

  const unpaidChecked = [...checked].filter((id) => {
    const inv = invoices.find((x) => x.id === id);
    return inv && inv.paymentStatus !== "paid";
  });

  const statusBadge = (s: string) =>
    cn(
      "rounded px-1.5 py-0.5 text-[10px] font-semibold",
      s === "paid"
        ? "bg-green-100 text-green-700 dark:bg-green-950/40"
        : s === "partial"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800"
    );

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        {/* Header — supplier info (read-only) */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div className="min-w-0 text-xs">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">{supplier?.name}</span>
              {supplier?.gstin && <span className="font-mono text-gray-500 dark:text-gray-400">GSTIN: {supplier.gstin}</span>}
            </div>
            {supplier?.address && <p className="mt-0.5 text-gray-500 dark:text-gray-400">{supplier.address}</p>}
            {(supplier?.contactPerson || supplier?.phone || supplier?.mobileNo) && (
              <p className="text-gray-500 dark:text-gray-400">
                Sales Person: {supplier?.contactPerson || "—"}
                {(supplier?.mobileNo || supplier?.phone) ? ` · ${supplier?.mobileNo || supplier?.phone}` : ""}
              </p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk bar */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-5 py-2 text-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-gray-500 dark:text-gray-400">
            {invoices.length} invoice(s){unpaidChecked.length > 0 ? ` · ${unpaidChecked.length} selected` : ""}
          </span>
          <div className="flex items-center gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-950">
              {METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
            <button
              onClick={() => recordPayment(unpaidChecked)}
              disabled={unpaidChecked.length === 0 || saving}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record Payment ({unpaidChecked.length})
            </button>
          </div>
        </div>

        {/* Invoice list */}
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No invoices for this supplier.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-gray-100 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="w-8 px-2 py-2"></th>
                  <th className="w-10 px-2 py-2 text-left">Sr</th>
                  <th className="px-2 py-2 text-left">Invoice No</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="w-20 px-2 py-2 text-center">Status</th>
                  <th className="w-6 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => {
                  const open = expandedId === inv.id;
                  const paid = inv.paymentStatus === "paid";
                  return (
                    <>
                      <tr
                        key={inv.id}
                        onClick={() => { setSelectedIndex(idx); setExpandedId(open ? null : inv.id); }}
                        className={cn(
                          "cursor-pointer border-b border-gray-100 dark:border-gray-800",
                          idx === selectedIndex ? "bg-blue-50/70 dark:bg-blue-950/30" : "hover:bg-gray-50 dark:hover:bg-gray-900"
                        )}
                      >
                        <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" disabled={paid} checked={checked.has(inv.id)} onChange={() => toggleCheck(inv.id)} />
                        </td>
                        <td className="px-2 py-1.5 text-gray-400">{idx + 1}</td>
                        <td className="px-2 py-1.5 font-mono font-medium text-blue-600">{inv.invoiceNumber}</td>
                        <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{fmtDate(inv.date)}</td>
                        <td className="px-2 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">₹{inv.amount.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-center"><span className={statusBadge(inv.paymentStatus)}>{inv.paymentStatus}</span></td>
                        <td className="px-2 py-1.5 text-gray-400">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                      </tr>
                      {open && (
                        <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/60">
                          <td colSpan={7} className="px-4 py-3">
                            {paid ? (
                              <p className="text-xs text-green-700 dark:text-green-400">This invoice is already paid.</p>
                            ) : (
                              <div className="flex flex-wrap items-end gap-3">
                                <button
                                  onClick={() => toast.info("Open the purchase from Purchase History to edit it.")}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </button>
                                <div>
                                  <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">Mode</label>
                                  <div className="flex gap-3">
                                    {METHODS.map((m) => (
                                      <label key={m.key} className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                                        <input type="radio" name={`m-${inv.id}`} className="h-3.5 w-3.5 accent-blue-600" checked={method === m.key} onChange={() => setMethod(m.key)} />
                                        {m.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">Payment Date</label>
                                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
                                </div>
                                <button
                                  onClick={() => recordPayment([inv.id])}
                                  disabled={saving}
                                  className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                  Record Payment
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

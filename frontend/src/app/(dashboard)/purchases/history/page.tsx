"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Building2, Tag } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  SearchInput,
  Spinner,
  TableEmpty,
  ds,
} from "@/components/design-system";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ItemRow {
  id: string;
  quantity: number;
  freeQty: number;
  purchaseRate: number | string;
  mrp: number | string;
  gstRate: number | string;
  discountPct: number | string;
  discountAmt: number | string;
  amount: number | string;
  batchNumber?: string | null;
  expiryDate?: string | null;
  medicine: { id: string; name: string; genericName?: string };
  purchase: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    supplier?: { id: string; name: string } | null;
  };
}

const n = (v: number | string | undefined) => Number(v ?? 0) || 0;

function scheme(pct: number, amt: number): string {
  if (pct > 0) return `${pct}%`;
  if (amt > 0) return `₹${amt.toFixed(2)}`;
  return "—";
}

export default function MedicinePurchaseHistoryPage() {
  const [search, setSearch] = useState("");
  const [distFilter, setDistFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-items"],
    queryFn: async () => {
      const res = await apiClient.get("/purchases/items", { params: { limit: 300 } });
      return (res.data?.items ?? []) as ItemRow[];
    },
  });

  const rows = data ?? [];

  const distributors = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      if (r.purchase.supplier) m.set(r.purchase.supplier.id, r.purchase.supplier.name);
    });
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = search.trim().toLowerCase();
        const mSearch =
          !q ||
          r.medicine.name.toLowerCase().includes(q) ||
          (r.purchase.supplier?.name ?? "").toLowerCase().includes(q) ||
          r.purchase.invoiceNumber.toLowerCase().includes(q) ||
          (r.batchNumber ?? "").toLowerCase().includes(q);
        const mDist = distFilter === "all" || r.purchase.supplier?.id === distFilter;
        return mSearch && mDist;
      }),
    [rows, search, distFilter]
  );

  const totalQty = filtered.reduce((s, r) => s + r.quantity, 0);
  const totalAmt = filtered.reduce((s, r) => s + n(r.amount), 0);

  return (
    <PageContainer className="flex h-full flex-col">
      <PageHeader
        title="Medicine Purchase History"
        subtitle="Which medicine, when, from which distributor, and at what scheme"
        icon={History}
        actions={
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            {filtered.length} records
          </span>
        }
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PanelBar>
          <select
            value={distFilter}
            onChange={(e) => setDistFilter(e.target.value)}
            className={cn(ds.field, "w-52")}
          >
            <option value="all">All distributors</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search medicine, distributor, invoice, batch…"
            className="w-72"
          />
        </PanelBar>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white">
              <tr>
                {[
                  "Date", "Medicine", "Distributor", "Invoice #", "Batch",
                  "Qty", "Free", "Rate", "MRP", "Scheme", "GST%", "Amount",
                ].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap",
                      ["Qty", "Free", "Rate", "MRP", "GST%", "Amount"].includes(h) && "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="p-0"><Spinner /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-0">
                    <TableEmpty
                      icon={History}
                      title="No purchase history"
                      description="Saved purchases will appear here, item by item."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const pct = n(r.discountPct);
                  const amt = n(r.discountAmt);
                  const hasScheme = pct > 0 || amt > 0;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 hover:bg-blue-50/40 dark:border-gray-800 dark:hover:bg-blue-950/30"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-400">
                        {new Date(r.purchase.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">{r.medicine.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                          {r.purchase.supplier?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400">{r.purchase.invoiceNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{r.batchNumber ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">{r.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500 dark:text-gray-400">{r.freeQty || "—"}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">₹{n(r.purchaseRate).toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">₹{n(r.mrp).toFixed(2)}</td>
                      <td className="px-3 py-2.5">
                        {hasScheme ? (
                          <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-400">
                            <Tag className="h-3 w-3" /> {scheme(pct, amt)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{n(r.gstRate)}%</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">₹{n(r.amount).toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Line items: <span className="font-semibold text-gray-900 dark:text-gray-100">{filtered.length}</span></span>
            <span className="text-gray-500 dark:text-gray-400">Total qty: <span className="font-semibold text-gray-900 dark:text-gray-100">{totalQty}</span></span>
          </div>
          <span className="text-gray-500 dark:text-gray-400">
            Total purchase value: <span className="font-bold text-blue-700 dark:text-blue-400">₹{totalAmt.toFixed(2)}</span>
          </span>
        </div>
      </Panel>
    </PageContainer>
  );
}

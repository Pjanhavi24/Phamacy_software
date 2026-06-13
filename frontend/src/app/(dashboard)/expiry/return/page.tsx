"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Truck,
  Printer,
  CheckSquare,
  Square,
  Building2,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  SearchInput,
  StatusTabs,
  Spinner,
  TableEmpty,
  Modal,
  ds,
} from "@/components/design-system";
import { apiClient } from "@/lib/api";
import { useStoreSettings } from "@/lib/store-settings";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ExpBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
  purchaseRate: number | string;
  mrp: number | string;
  medicine: { id: string; name: string; genericName?: string; hsnCode?: string };
  supplier?: { id: string; name: string; gstin?: string; phone?: string } | null;
}

interface Row {
  id: string;
  name: string;
  hsn: string;
  batch: string;
  expiry: string;
  daysLeft: number;
  qty: number;
  rate: number;
  value: number;
  distributorId: string;
  distributor: string;
  gstin: string;
}

const num = (v: number | string | undefined) => Number(v ?? 0) || 0;

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function statusTag(daysLeft: number) {
  if (daysLeft < 0)
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
        Expired {Math.abs(daysLeft)}d ago
      </span>
    );
  if (daysLeft <= 30)
    return (
      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
        {daysLeft}d left
      </span>
    );
  return (
    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400">
      {daysLeft}d left
    </span>
  );
}

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expired", label: "Expired" },
  { key: "30", label: "≤ 30 days" },
  { key: "60", label: "≤ 60 days" },
];

export default function ExpiryReturnPage() {
  const store = useStoreSettings();
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [distFilter, setDistFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNote, setShowNote] = useState(false);
  const [returnNo, setReturnNo] = useState("");

  useEffect(() => {
    setReturnNo(`RET-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0")}`);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["expiring-return"],
    queryFn: async () => {
      const res = await apiClient.get("/inventory/expiring", { params: { days: 120 } });
      const batches: ExpBatch[] = res.data?.batches ?? [];
      return batches;
    },
  });

  const rows: Row[] = useMemo(
    () =>
      (data ?? []).map((b) => {
        const qty = b.availableQty;
        const rate = num(b.purchaseRate);
        return {
          id: b.id,
          name: b.medicine?.name ?? "—",
          hsn: b.medicine?.hsnCode ?? "",
          batch: b.batchNumber,
          expiry: b.expiryDate,
          daysLeft: daysUntil(b.expiryDate),
          qty,
          rate,
          value: qty * rate,
          distributorId: b.supplier?.id ?? "unknown",
          distributor: b.supplier?.name ?? "Unknown distributor",
          gstin: b.supplier?.gstin ?? "",
        };
      }),
    [data]
  );

  const distributors = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.distributorId, r.distributor));
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const mSearch =
          !search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.batch.toLowerCase().includes(search.toLowerCase());
        const mDist = distFilter === "all" || r.distributorId === distFilter;
        const mTab =
          tab === "all"
            ? true
            : tab === "expired"
            ? r.daysLeft < 0
            : tab === "30"
            ? r.daysLeft <= 30
            : r.daysLeft <= 60;
        return mSearch && mDist && mTab;
      }),
    [rows, search, distFilter, tab]
  );

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedValue = selectedRows.reduce((s, r) => s + r.value, 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id))
    );

  // Group selected rows by distributor for the return note.
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; gstin: string; items: Row[] }>();
    selectedRows.forEach((r) => {
      const g = m.get(r.distributorId) ?? { name: r.distributor, gstin: r.gstin, items: [] };
      g.items.push(r);
      m.set(r.distributorId, g);
    });
    return Array.from(m.values());
  }, [selectedRows]);

  return (
    <PageContainer>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .return-print, .return-print * { visibility: visible; }
          .return-print { position: fixed; inset: 0; width: 100%; background: white; color: black; }
          .no-print { display: none !important; }
        }
      `}</style>

      <PageHeader
        title="Expiry Return"
        subtitle="Return expired / near-expiry stock to the distributor it was bought from"
        icon={CalendarClock}
        actions={
          <button
            disabled={selected.size === 0}
            onClick={() => setShowNote(true)}
            className={cn(ds.btnStrong, "disabled:cursor-not-allowed disabled:opacity-50")}
          >
            <Truck className="h-4 w-4" /> Generate Return Bill ({selected.size})
          </button>
        }
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PanelBar>
          <StatusTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={distFilter}
              onChange={(e) => setDistFilter(e.target.value)}
              className={cn(ds.field, "w-48")}
            >
              <option value="all">All distributors</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <SearchInput value={search} onChange={setSearch} placeholder="Search medicine / batch…" className="w-56" />
          </div>
        </PanelBar>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left">
                  <button onClick={toggleAll}>
                    {filtered.length > 0 && selected.size >= filtered.length ? (
                      <CheckSquare size={16} className="text-blue-400" />
                    ) : (
                      <Square size={16} className="text-gray-300" />
                    )}
                  </button>
                </th>
                {["Medicine", "Batch", "Expiry", "Status", "Qty", "Rate", "Return Value", "Distributor"].map((h) => (
                  <th key={h} className={cn("px-3 py-2.5 text-left text-xs font-semibold", (h === "Qty" || h === "Rate" || h === "Return Value") && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-0"><Spinner /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-0"><TableEmpty icon={CalendarClock} title="No expiring stock" description="Nothing to return for the selected filters." /></td></tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={cn(
                      "cursor-pointer border-b border-gray-100 hover:bg-blue-50/40 dark:border-gray-800 dark:hover:bg-blue-950/30",
                      selected.has(r.id) && "bg-blue-50/60 dark:bg-blue-950/30"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      {selected.has(r.id) ? (
                        <CheckSquare size={16} className="text-blue-600" />
                      ) : (
                        <Square size={16} className="text-gray-400 dark:text-gray-500" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{r.batch}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-400">
                      {new Date(r.expiry).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5">{statusTag(r.daysLeft)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">{r.qty}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">₹{r.rate.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">₹{r.value.toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Building2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" /> {r.distributor}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Selected: <span className="font-semibold text-gray-900 dark:text-gray-100">{selected.size}</span></span>
            <span className="text-gray-500 dark:text-gray-400">Distributors: <span className="font-semibold text-gray-900 dark:text-gray-100">{groups.length}</span></span>
            <span className="text-gray-500 dark:text-gray-400">Total return value: <span className="font-bold text-blue-700 dark:text-blue-400">₹{selectedValue.toFixed(2)}</span></span>
          </div>
          <button
            disabled={selected.size === 0}
            onClick={() => setShowNote(true)}
            className={cn(ds.btnPrimary, "disabled:cursor-not-allowed disabled:opacity-50")}
          >
            <Printer className="h-4 w-4" /> Generate Return Bill
          </button>
        </div>
      </Panel>

      {/* Return note (debit note) modal */}
      <Modal open={showNote} onClose={() => setShowNote(false)} title="Expiry Return — Debit Note" size="lg">
        <div className="return-print space-y-6 bg-white text-black">
          {/* Store header */}
          <div className="border-b-2 border-black pb-3 text-center">
            <h1 className="text-xl font-bold uppercase">{store.name}</h1>
            <p className="text-xs">{store.address}, {store.city} - {store.pincode}</p>
            <p className="text-xs">GSTIN: {store.gstin} | DL: {store.dlNumber}</p>
            <p className="mt-1 text-sm font-semibold">EXPIRY RETURN / DEBIT NOTE</p>
            <p className="text-xs">No: {returnNo} &nbsp;|&nbsp; Date: {new Date().toLocaleDateString("en-IN")}</p>
          </div>

          {groups.map((g, gi) => {
            const sub = g.items.reduce((s, it) => s + it.value, 0);
            return (
              <div key={gi}>
                <p className="text-sm font-semibold">To (Distributor): {g.name}{g.gstin ? ` — GSTIN: ${g.gstin}` : ""}</p>
                <table className="mt-1 w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1 text-left">#</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Medicine</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Batch</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Expiry</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Qty</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Rate</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((it, i) => (
                      <tr key={it.id}>
                        <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                        <td className="border border-gray-300 px-2 py-1">{it.name}</td>
                        <td className="border border-gray-300 px-2 py-1">{it.batch}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {new Date(it.expiry).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{it.qty}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{it.rate.toFixed(2)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right font-medium">{it.value.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-2 py-1 text-right font-semibold">Subtotal</td>
                      <td className="border border-gray-300 px-2 py-1 text-right font-bold">₹{sub.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t-2 border-black pt-2">
            <span className="text-sm">Total items: {selectedRows.length}</span>
            <span className="text-base font-bold">Total Return Value: ₹{selectedValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-end pt-8 text-xs">
            <div className="border-t border-black px-8 pt-1 text-center">For {store.name}<br />Authorised Signatory</div>
          </div>
        </div>

        <div className="no-print mt-5 flex justify-end gap-2">
          <button onClick={() => setShowNote(false)} className={ds.btnOutline}>Close</button>
          <button onClick={() => window.print()} className={ds.btnStrong}>
            <Printer className="h-4 w-4" /> Print Return Bill
          </button>
        </div>
      </Modal>
    </PageContainer>
  );
}

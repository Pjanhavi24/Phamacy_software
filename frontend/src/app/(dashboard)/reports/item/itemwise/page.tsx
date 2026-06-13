"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader, Panel, Spinner } from "@/components/design-system";
import { ds } from "@/components/design-system";
import { Search, FileText, ShoppingCart, ShoppingBag, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fmtDate, type ItemDetail } from "@/components/reports/item-movement-dialog";

interface SearchHit {
  id: string;
  name: string;
  brand?: string;
  packing?: string;
}

export default function ItemwiseSalesReport() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [tab, setTab] = useState<"sales" | "purchases">("sales");
  const boxRef = useRef<HTMLDivElement>(null);

  // ── Debounced product search ──────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiClient
        .get("/medicines/search", { params: { q } })
        .then((r) => {
          const arr: SearchHit[] = Array.isArray(r.data) ? r.data : r.data?.medicines ?? [];
          setResults(arr.slice(0, 12));
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const pick = useCallback((hit: SearchHit) => {
    setSelected({ id: hit.id, name: hit.name });
    setQuery(hit.name);
    setOpen(false);
    setTab("sales");
  }, []);

  // ── Detail for the selected item ──────────────────────────────────────────
  const { data: detail, isLoading } = useQuery<ItemDetail>({
    queryKey: ["report-itemwise", selected?.id],
    queryFn: () => apiClient.get(`/reports/items/${selected!.id}/detail`).then((r) => r.data),
    enabled: !!selected,
  });

  const rows = detail ? (tab === "sales" ? detail.sales : detail.purchases) : [];
  const partyLabel = tab === "sales" ? "Customer" : "Supplier";

  return (
    <PageContainer className="flex h-full flex-col space-y-2">
      <PageHeader
        icon={FileText}
        actions={
          <div className="flex w-full items-center justify-start gap-2">
            <div ref={boxRef} className="relative w-96">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selected) setSelected(null);
                }}
                onFocus={() => results.length && setOpen(true)}
                placeholder="Search a product name…"
                className={cn(ds.field, "pl-8 pr-8")}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setSelected(null);
                    setResults([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {open && results.length > 0 && (
                <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => pick(r)}
                      className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {[r.brand, r.packing].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {!selected ? (
        <Panel className="flex flex-1 items-center justify-center">
          <div className="py-16 text-center text-sm text-gray-400">
            <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Search and select a product to see its full sales &amp; purchase detail.
          </div>
        </Panel>
      ) : isLoading || !detail ? (
        <Panel className="flex flex-1 items-center justify-center">
          <Spinner />
        </Panel>
      ) : (
        <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-px border-b border-gray-200 bg-gray-200 sm:grid-cols-3 lg:grid-cols-5 dark:border-gray-800 dark:bg-gray-800">
            <Metric label="Total Sales" value={formatCurrency(detail.summary.totalRevenue)} />
            <Metric label="Quantity Sold" value={String(detail.summary.totalQtySold)} />
            <Metric
              label="Margin"
              value={formatCurrency(detail.summary.totalMargin)}
              accent={detail.summary.totalMargin >= 0 ? "green" : "red"}
            />
            <Metric label="Current Stock" value={String(detail.medicine.stock)} />
            <Metric
              label="This Month"
              value={formatCurrency(detail.summary.thisMonthRevenue)}
              sub={`${detail.summary.thisMonthQty} units`}
            />
          </div>

          {/* Sales / Purchases tab switch */}
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
                {t === "sales" ? "Sales" : "Purchases"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                No {tab} recorded for this item.
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
                      <TableCell className="text-right font-medium">{formatCurrency(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Panel>
      )}
    </PageContainer>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red";
}) {
  return (
    <div className="bg-white px-4 py-2.5 dark:bg-gray-950">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p
        className={cn(
          "text-lg font-bold",
          accent === "green"
            ? "text-green-600"
            : accent === "red"
            ? "text-red-600"
            : "text-gray-900 dark:text-gray-100"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

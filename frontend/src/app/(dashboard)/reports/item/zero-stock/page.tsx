"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  PageContainer,
  PageHeader,
  Panel,
  Spinner,
  TableEmpty,
  ds,
} from "@/components/design-system";
import { PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemMovementDialog, fmtDate } from "@/components/reports/item-movement-dialog";

interface ZeroItem {
  id: string;
  name: string;
  packing: string;
  company: string;
  category: string;
  mrp: number;
  saleRate: number;
  lastSaleDate: string | null;
  lastPurchaseDate: string | null;
}

export default function ZeroStockReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const { data, isLoading } = useQuery<ZeroItem[]>({
    queryKey: ["report-zero-stock", from, to],
    queryFn: () =>
      apiClient
        .get("/reports/items/zero-stock", {
          params: { from: from || undefined, to: to || undefined },
        })
        .then((r) => r.data.items ?? []),
  });
  const items = data ?? [];

  useEffect(() => {
    setSelectedIndex((i) => (items.length === 0 ? 0 : Math.min(i, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    rowRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ↑/↓ move the highlight, Enter opens the movement popup.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (openId) return;
      if (items.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const it = items[selectedIndex];
        if (it) setOpenId(it.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selectedIndex, openId]);

  return (
    <PageContainer className="flex h-full flex-col space-y-2">
      <PageHeader
        icon={PackageX}
        actions={
          <div className="flex w-full flex-wrap items-center justify-start gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={cn(ds.field, "h-8 w-36")}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={cn(ds.field, "h-8 w-36")}
              />
            </label>
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Clear
              </button>
            )}
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40">
              {items.length} out of stock
            </span>
          </div>
        }
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table className="text-xs [&_td]:py-1 [&_th]:h-8">
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Packing</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Last Sold</TableHead>
                <TableHead>Last Purchased</TableHead>
                <TableHead className="text-right">MRP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <Spinner />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <TableEmpty
                      icon={PackageX}
                      title="No out-of-stock items"
                      description={
                        from || to
                          ? "No items went out of stock in this date range."
                          : "Every active item currently has stock."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it, idx) => (
                  <TableRow
                    key={it.id}
                    ref={(el) => {
                      rowRefs.current[idx] = el;
                    }}
                    className={cn(
                      "cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/30",
                      idx === selectedIndex &&
                        "bg-blue-100/70 ring-1 ring-inset ring-blue-400 dark:bg-blue-900/40"
                    )}
                    onClick={() => {
                      setSelectedIndex(idx);
                      setOpenId(it.id);
                    }}
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      {it.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {it.packing || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{it.company || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {fmtDate(it.lastSaleDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {fmtDate(it.lastPurchaseDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{it.mrp.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          <span>↑ ↓ to move · Enter to view sales &amp; purchases</span>
          <span>{items.length} items</span>
        </div>
      </Panel>

      <ItemMovementDialog itemId={openId} onClose={() => setOpenId(null)} />
    </PageContainer>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
} from "lucide-react";
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
  PanelBar,
  SearchInput,
  StatusTabs,
  Spinner,
  TableEmpty,
  Modal,
  FieldLabel,
  TextField,
  ds,
} from "@/components/design-system";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { StockMoveModal } from "@/components/inventory/stock-move-modal";
import { PackagePlus, PackageMinus } from "lucide-react";

interface Batch {
  id: string;
  item_code: string;
  medicine_name: string;
  brand: string;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  stock: number;
  mrp: number;
  purchase_rate: number;
  stock_value: number;
  location: string;
  reorder_level: number;
}

interface SummaryCards {
  total_medicines: number;
  total_batches: number;
  low_stock: number;
  out_of_stock: number;
}

type TabType = "all" | "low_stock" | "out_of_stock" | "near_expiry";
type AdjustType = "add" | "remove" | "damage";

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

// Expiry is always month/year only → "MM/YY".
function formatExpiry(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

function getRowClass(batch: Batch): string {
  if (batch.stock === 0) return "bg-red-50 dark:bg-red-950/40 border-l-4 border-l-red-400";
  if (batch.stock <= batch.reorder_level)
    return "bg-amber-50 dark:bg-amber-950/40 border-l-4 border-l-amber-400";
  const daysLeft = getDaysUntilExpiry(batch.expiry_date);
  if (daysLeft <= 30) return "bg-orange-50 dark:bg-orange-950/40 border-l-4 border-l-orange-400";
  if (daysLeft <= 90) return "bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-l-yellow-400";
  return "";
}

export default function InventoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [adjustType, setAdjustType] = useState<AdjustType>("add");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [stockMode, setStockMode] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  async function fetchBatches() {
    setLoading(true);
    try {
      const res = await apiClient.get("/inventory/batches", { params: { limit: 500 } });
      const raw: any[] = res.data?.batches ?? res.data ?? [];
      const mapped: Batch[] = raw.map((b: any) => ({
        id: b.id,
        item_code: b.medicine?.productCode != null ? String(b.medicine.productCode) : (b.item_code ?? ""),
        medicine_name: b.medicine?.name ?? b.medicine_name ?? "",
        brand: b.medicine?.genericName ?? "",
        batch_number: b.batchNumber ?? b.batch_number ?? "",
        mfg_date: b.manufacturingDate ?? b.mfg_date ?? "",
        expiry_date: b.expiryDate ?? b.expiry_date ?? "",
        stock: b.availableQty ?? b.stock ?? 0,
        mrp: Number(b.mrp ?? 0),
        purchase_rate: Number(b.purchaseRate ?? b.purchase_rate ?? 0),
        stock_value: Number(b.mrp ?? 0) * (b.availableQty ?? b.stock ?? 0),
        location: b.location ?? "",
        reorder_level: b.medicine?.reorderLevel ?? b.reorder_level ?? 0,
      }));
      setBatches(mapped);
    } catch {
      setBatches([]); // no mock data — real stock only
    } finally {
      setLoading(false);
    }
  }

  const summary: SummaryCards = useMemo(() => {
    const medicines = new Set(batches.map((b) => b.medicine_name)).size;
    const low = batches.filter(
      (b) => b.stock > 0 && b.stock <= b.reorder_level
    ).length;
    const out = batches.filter((b) => b.stock === 0).length;
    return {
      total_medicines: medicines,
      total_batches: batches.length,
      low_stock: low,
      out_of_stock: out,
    };
  }, [batches]);

  const filtered = useMemo(() => {
    let list = batches;
    if (activeTab === "low_stock")
      list = list.filter((b) => b.stock > 0 && b.stock <= b.reorder_level);
    else if (activeTab === "out_of_stock")
      list = list.filter((b) => b.stock === 0);
    else if (activeTab === "near_expiry")
      list = list.filter((b) => getDaysUntilExpiry(b.expiry_date) <= 90);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.item_code.toLowerCase().includes(q) ||
          b.medicine_name.toLowerCase().includes(q) ||
          b.brand.toLowerCase().includes(q) ||
          b.batch_number.toLowerCase().includes(q)
      );
    }
    return list;
  }, [batches, activeTab, searchQuery]);

  const totalStockValue = useMemo(
    () => filtered.reduce((sum, b) => sum + b.stock_value, 0),
    [filtered]
  );

  async function handleAdjust() {
    if (!selectedBatch || !adjustQty || Number(adjustQty) <= 0) return;
    setAdjusting(true);
    try {
      await apiClient.post(`/inventory/batches/${selectedBatch.id}/adjust`, {
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason,
      });
      await fetchBatches();
    } catch {
      // leave the list unchanged on failure
    }
    setShowAdjustModal(false);
    setAdjustQty("");
    setAdjustReason("");
    setAdjusting(false);
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All Stock", count: batches.length },
    { key: "low_stock", label: "Low Stock", count: summary.low_stock },
    { key: "out_of_stock", label: "Out of Stock", count: summary.out_of_stock },
    {
      key: "near_expiry",
      label: "Near Expiry",
      count: batches.filter((b) => getDaysUntilExpiry(b.expiry_date) <= 90)
        .length,
    },
  ];

  const COLUMNS = [
    "Item Code",
    "Item",
    "Batch #",
    "Expiry",
    "Stock",
    "MRP",
    "Purchase Rate",
    "Stock Value",
    "Location",
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Inventory Overview"
        subtitle="Manage medicine stock, batches, and adjustments"
        icon={Package}
      />

      <Panel>
        {/* Filter dropdown + search + stock actions (one line) */}
        <PanelBar>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabType)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {tabs.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} ({t.count})
                </option>
              ))}
            </select>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search medicine, batch..."
              className="w-56"
            />
          </div>
          <div className="flex items-center gap-2 pr-1">
            <button
              onClick={() => setStockMode("in")}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <PackagePlus className="h-4 w-4" /> Stock In
            </button>
            <button
              onClick={() => setStockMode("out")}
              className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              <PackageMinus className="h-4 w-4" /> Stock Out
            </button>
            <button
              onClick={fetchBatches}
              title="Refresh"
              aria-label="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </PanelBar>

        {/* Count + stock value summary */}
        <PanelBar muted>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {filtered.length}
            </span>{" "}
            batches
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Stock Value:{" "}
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalStockValue)}
            </span>
          </p>
        </PanelBar>

        {/* Table */}
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <TableEmpty
            icon={Package}
            title="No records found"
            description="Try adjusting your search or filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {COLUMNS.map((h) => (
                    <TableHead key={h} className="h-8 whitespace-nowrap px-2 text-[11px]">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((batch) => {
                  const daysLeft = getDaysUntilExpiry(batch.expiry_date);
                  return (
                    <TableRow
                      key={batch.id}
                      className={cn(getRowClass(batch), "hover:brightness-95")}
                    >
                      <TableCell className="px-2 py-1.5 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {batch.item_code || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">
                        {batch.medicine_name}
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {batch.batch_number}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            daysLeft <= 30
                              ? "text-red-600"
                              : daysLeft <= 90
                              ? "text-orange-600"
                              : "text-gray-700 dark:text-gray-300"
                          )}
                        >
                          {formatExpiry(batch.expiry_date)}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            batch.stock === 0
                              ? "text-red-600"
                              : batch.stock <= batch.reorder_level
                              ? "text-amber-600"
                              : "text-gray-900 dark:text-gray-100"
                          )}
                        >
                          {batch.stock}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300">
                        {formatCurrency(batch.mrp)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300">
                        {formatCurrency(batch.purchase_rate)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(batch.stock_value)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <span className="rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-xs text-blue-700">
                          {batch.location}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      {/* Stock adjustment modal */}
      <Modal
        open={showAdjustModal && !!selectedBatch}
        onClose={() => setShowAdjustModal(false)}
        title="Stock Adjustment"
      >
        {selectedBatch && (
          <div className="space-y-4">
            {/* Medicine info */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedBatch.medicine_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedBatch.brand} | Batch: {selectedBatch.batch_number}
              </p>
              <p className="mt-1 text-sm">
                Current Stock:{" "}
                <span className="font-bold text-blue-600">
                  {selectedBatch.stock} units
                </span>
              </p>
            </div>

            {/* Adjustment type */}
            <div>
              <FieldLabel>Adjustment Type</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {(["add", "remove", "damage"] as AdjustType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAdjustType(type)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium capitalize transition-colors",
                      adjustType === type
                        ? type === "add"
                          ? "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700"
                          : type === "remove"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700"
                          : "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700"
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {type === "add" ? (
                      <Plus className="h-4 w-4" />
                    ) : type === "remove" ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <FieldLabel htmlFor="adjust-qty">Quantity</FieldLabel>
              <TextField
                id="adjust-qty"
                type="number"
                min={1}
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            {/* Reason */}
            <div>
              <FieldLabel htmlFor="adjust-reason">
                Reason <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </FieldLabel>
              <textarea
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Enter reason for adjustment..."
                rows={2}
                className={cn(ds.field, "h-auto resize-none py-2")}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAdjustModal(false)}
                className={cn(ds.btnOutline, "flex-1")}
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustQty || Number(adjustQty) <= 0 || adjusting}
                className={cn(
                  "inline-flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  adjustType === "add"
                    ? "bg-green-600 hover:bg-green-700"
                    : adjustType === "remove"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                )}
              >
                {adjusting ? "Saving..." : "Confirm Adjustment"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {stockMode && (
        <StockMoveModal
          mode={stockMode}
          onClose={() => setStockMode(null)}
          onDone={fetchBatches}
        />
      )}
    </PageContainer>
  );
}

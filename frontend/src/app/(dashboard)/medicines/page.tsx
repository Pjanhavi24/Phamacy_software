"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { MedicineForm, type MedicineFormValues } from "@/components/medicines/medicine-form";
import {
  Plus,
  ArrowLeft,
  Filter,
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Edit,
  X,
  Download,
  Upload,
  Printer,
  Layers,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Pill,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  PageContainer,
  PageHeader,
  Panel,
  SearchInput,
  TableEmpty,
} from "@/components/design-system";

// --- Types

interface Batch {
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
  purchaseRate: number;
}

interface Medicine {
  id: string;
  itemCode: string;
  name: string;
  generic: string;
  brand: string;
  saltComposition: string;
  manufacturer: string;
  category: string;
  schedule: string;
  hsnCode: string;
  gstPercent: number;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
  marginPercent: number;
  stock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  unitsPerPack: number;
  rackLocation: string;
  storageInstructions: string;
  sideEffectsNote: string;
  prescriptionRequired: boolean;
  barcode: string;
  batches: Batch[];
  expiryDate?: string;
}


const CATEGORIES = ["All", "allopathy", "homeopathy", "ayurvedic", "unani", "surgical", "general", "cosmetic", "other"];
const SCHEDULES = ["All", "OTC", "H", "H1", "X"];
const STOCK_STATUS_OPTIONS = ["All", "In Stock", "Low Stock", "Out of Stock"];
const GST_RATES = [0, 5, 12, 18, 28];

// --- Helpers

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function getStockStatus(medicine: Medicine) {
  if (medicine.stock === 0)
    return { label: "Out of Stock", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-gray-800", badge: "bg-red-50 dark:bg-red-950/40 text-red-700 border-red-200 dark:border-gray-800" };
  if (medicine.stock <= medicine.minStock)
    return { label: "Low Stock", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-gray-800", badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 border-amber-200 dark:border-gray-800" };
  return { label: "In Stock", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-gray-800", badge: "bg-green-50 dark:bg-green-950/40 text-green-700 border-green-200 dark:border-gray-800" };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Expiry is month/year only → "MM/YY".
function formatExpiry(dateStr: string) {
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return dateStr;
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-blue-500/30 text-blue-800 rounded px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// --- Hooks

interface ApiBatch {
  batchNumber: string;
  expiryDate: string;
  manufacturingDate?: string | null;
  availableQty?: number;
  purchaseRate?: number | string;
}
interface ApiMedicine {
  id: string;
  productCode?: number | null;
  name: string;
  genericName?: string | null;
  saltComposition?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  scheduleType?: string | null;
  hsnCode?: string | null;
  gstRate?: number | string;
  mrp?: number | string;
  purchaseRate?: number | string;
  saleRate?: number | string;
  margin?: number | string;
  unitsPerPack?: number;
  minLevel?: number;
  maxLevel?: number;
  reorderLevel?: number;
  storageInstructions?: string | null;
  isPrescriptionRequired?: boolean;
  barcode?: string | null;
  batches?: ApiBatch[];
}

// Map a backend medicine record to the shape this page renders.
function mapMedicine(r: ApiMedicine): Medicine {
  const batches = r.batches ?? [];
  const stock = batches.reduce((s, b) => s + (b.availableQty ?? 0), 0);
  const earliest = [...batches]
    .filter((b) => b.expiryDate)
    .sort((a, b) => +new Date(a.expiryDate) - +new Date(b.expiryDate))[0];
  return {
    id: r.id,
    itemCode: r.productCode != null ? String(r.productCode) : "",
    name: r.name,
    generic: r.genericName ?? "",
    brand: "",
    saltComposition: r.saltComposition ?? "",
    manufacturer: r.manufacturer ?? "",
    category: r.category ?? "",
    schedule: r.scheduleType ?? "OTC",
    hsnCode: r.hsnCode ?? "",
    gstPercent: Number(r.gstRate ?? 0),
    mrp: Number(r.mrp ?? 0),
    purchaseRate: Number(r.purchaseRate ?? 0),
    saleRate: Number(r.saleRate ?? 0),
    marginPercent: Number(r.margin ?? 0),
    stock,
    minStock: r.minLevel ?? 0,
    maxStock: r.maxLevel ?? 0,
    reorderLevel: r.reorderLevel ?? 0,
    unitsPerPack: r.unitsPerPack ?? 1,
    rackLocation: "",
    storageInstructions: r.storageInstructions ?? "",
    sideEffectsNote: "",
    prescriptionRequired: r.isPrescriptionRequired ?? false,
    barcode: r.barcode ?? "",
    batches: batches.map((b) => ({
      batchNo: b.batchNumber,
      mfgDate: b.manufacturingDate ?? "",
      expiryDate: b.expiryDate,
      qty: b.availableQty ?? 0,
      purchaseRate: Number(b.purchaseRate ?? 0),
    })),
    expiryDate: earliest?.expiryDate,
  };
}

interface MedicinesPage {
  medicines: Medicine[];
  total: number;
  pages: number;
}

// Server-side search + pagination: the search term is sent to the backend so it
// matches across the COMPLETE catalogue, not just the rows on the current page.
function useMedicines(search: string, page: number, pageSize: number, category: string) {
  return useQuery<MedicinesPage>({
    queryKey: ["medicines", search, page, pageSize, category],
    placeholderData: (prev) => prev, // keep showing the old page while the next loads
    queryFn: async () => {
      try {
        const params: Record<string, string | number> = { page, limit: pageSize };
        if (search.trim()) params.search = search.trim();
        if (category && category !== "All") params.category = category;
        const res = await apiClient.get("/medicines", { params });
        const list: ApiMedicine[] = res.data?.medicines ?? res.data ?? [];
        return {
          medicines: (Array.isArray(list) ? list : []).map(mapMedicine),
          total: res.data?.total ?? list.length ?? 0,
          pages: res.data?.pages ?? 1,
        };
      } catch {
        return { medicines: [], total: 0, pages: 1 }; // no mock data
      }
    },
  });
}

// --- Sub-components

function SkeletonRow() {
  return (
    <TableRow className="border-gray-200 dark:border-gray-800">
      {[...Array(12)].map((_, j) => (
        <TableCell key={j}>
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// --- Smart Search Results Panel

function SmartSearchPanel({
  query,
  medicines,
  onSelectMedicine,
}: {
  query: string;
  medicines: Medicine[];
  onSelectMedicine: (m: Medicine) => void;
}) {
  const saltMatches = medicines.filter(
    (m) =>
      m.saltComposition.toLowerCase().includes(query.toLowerCase()) ||
      m.generic.toLowerCase().includes(query.toLowerCase())
  );

  const uniqueSalts = Array.from(new Set(saltMatches.map((m) => m.generic)));

  if (!query.trim() || saltMatches.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Related medicines with same salt composition
        </span>
        <Badge className="ml-auto bg-blue-50 dark:bg-blue-950/40 text-blue-700 border-blue-200 dark:border-gray-800 text-xs">
          {saltMatches.length} found
        </Badge>
      </div>
      <ScrollArea className="max-h-72">
        {uniqueSalts.map((salt) => {
          const saltMeds = saltMatches.filter((m) => m.generic === salt);
          return (
            <div key={salt} className="p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 font-medium uppercase tracking-wide">
                {salt}
              </p>
              {saltMeds.map((m) => {
                const ss = getStockStatus(m);
                return (
                  <button
                    key={m.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    onClick={() => onSelectMedicine(m)}
                  >
                    <div className="flex items-center gap-3">
                      <Pill className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{m.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {m.manufacturer}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-semibold ${ss.color}`}>
                        Stock: {m.stock}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">₹{m.mrp}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}

// --- Batch Detail Sheet

function MedicineBatchSheet({
  medicine,
  open,
  onOpenChange,
}: {
  medicine: Medicine | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!medicine) return null;
  const stockStatus = getStockStatus(medicine);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <SheetTitle className="text-gray-900 dark:text-gray-100 text-lg">{medicine.name}</SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            {medicine.manufacturer && (
              <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 border-blue-200 dark:border-gray-800 text-xs">{medicine.manufacturer}</Badge>
            )}
            <Badge className={`text-xs border ${stockStatus.badge}`}>{stockStatus.label}</Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Generic Name", value: medicine.generic },
                { label: "Manufacturer", value: medicine.manufacturer },
                { label: "Salt Composition", value: medicine.saltComposition },
                { label: "Category", value: medicine.category },
                { label: "Schedule", value: medicine.schedule || "OTC" },
                { label: "HSN Code", value: medicine.hsnCode },
                { label: "GST", value: `${medicine.gstPercent}%` },
                { label: "Barcode", value: medicine.barcode },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">MRP</p>
                <p className="text-gray-900 dark:text-gray-100 font-bold">₹{medicine.mrp.toFixed(2)}</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Purchase</p>
                <p className="text-gray-900 dark:text-gray-100 font-bold">₹{medicine.purchaseRate.toFixed(2)}</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sale Rate</p>
                <p className="text-gray-900 dark:text-gray-100 font-bold">₹{medicine.saleRate.toFixed(2)}</p>
              </div>
              <div className={`rounded-lg p-3 text-center border ${stockStatus.bg}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stock</p>
                <p className={`font-bold ${stockStatus.color}`}>{medicine.stock}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Min Stock", value: medicine.minStock },
                { label: "Max Stock", value: medicine.maxStock },
                { label: "Reorder Level", value: medicine.reorderLevel },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <Separator className="bg-gray-100 dark:bg-gray-800" />

            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Batch Information
              </h3>
              {medicine.batches.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No batches available</p>
              ) : (
                <div className="space-y-2">
                  {medicine.batches.map((batch) => {
                    const isExpired = new Date(batch.expiryDate) < new Date();
                    return (
                      <div key={batch.batchNo} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">{batch.batchNo}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Mfg: {formatDate(batch.mfgDate)}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 text-xs">{batch.qty} units</Badge>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">₹{batch.purchaseRate}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Expiry: {formatDate(batch.expiryDate)}</span>
                          <span className={`text-xs font-medium ${isExpired ? "text-red-600" : "text-green-600"}`}>
                            {isExpired ? "Expired" : "Valid"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {(medicine.storageInstructions || medicine.sideEffectsNote) && (
              <>
                <Separator className="bg-gray-100 dark:bg-gray-800" />
                <div className="space-y-3">
                  {medicine.storageInstructions && (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Storage Instructions</p>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{medicine.storageInstructions}</p>
                    </div>
                  )}
                  {medicine.sideEffectsNote && (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Side Effects Note</p>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{medicine.sideEffectsNote}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// --- Add / Edit Medicine Modal

function MedicineFormDialog({
  open,
  onOpenChange,
  medicine,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  medicine?: Medicine | null;
}) {
  const isEdit = !!medicine;
  const [prescriptionRequired, setPrescriptionRequired] = useState(medicine?.prescriptionRequired ?? false);
  const [marginPct, setMarginPct] = useState(medicine?.marginPercent?.toFixed(1) ?? "");
  const [mrp, setMrp] = useState(medicine?.mrp?.toString() ?? "");
  const [purchaseRate, setPurchaseRate] = useState(medicine?.purchaseRate?.toString() ?? "");

  useEffect(() => {
    const m = parseFloat(mrp);
    const p = parseFloat(purchaseRate);
    if (m > 0 && p > 0) {
      setMarginPct((((m - p) / p) * 100).toFixed(1));
    }
  }, [mrp, purchaseRate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            {isEdit ? "Edit Medicine" : "Add New Medicine"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-gray-200 dark:border-gray-800 pb-1">Basic Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Medicine Name *</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  defaultValue={medicine?.name}
                  placeholder="e.g. Paracetamol 500mg"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Brand Name</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  defaultValue={medicine?.brand}
                  placeholder="e.g. Calpol"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Generic Name *</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  defaultValue={medicine?.generic}
                  placeholder="e.g. Paracetamol"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Salt Composition</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  defaultValue={medicine?.saltComposition}
                  placeholder="e.g. Paracetamol 500mg"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Manufacturer</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  defaultValue={medicine?.manufacturer}
                  placeholder="Manufacturer name"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Barcode</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  defaultValue={medicine?.barcode}
                  placeholder="Barcode / SKU"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Category *</Label>
                <Input
                  list="medicine-category-options"
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  defaultValue={medicine?.category}
                  placeholder="Select or type a new category"
                />
                <datalist id="medicine-category-options">
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  Pick an existing category or type a new one to create it.
                </p>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Schedule Type</Label>
                <Select defaultValue={medicine?.schedule || "OTC"}>
                  <SelectTrigger className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Schedule" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800">
                    {["OTC", "H", "H1", "X"].map((s) => (
                      <SelectItem key={s} value={s} className="text-gray-800 dark:text-gray-200">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-gray-200 dark:border-gray-800 pb-1">Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">MRP (₹) *</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  type="number"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Purchase Rate (₹) *</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  type="number"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Sale Rate (₹)</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  defaultValue={medicine?.saleRate}
                  type="number"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Margin %</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-700"
                  value={marginPct}
                  readOnly
                  placeholder="Auto-calculated"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">GST %</Label>
                <Select defaultValue={String(medicine?.gstPercent ?? 12)}>
                  <SelectTrigger className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="GST %" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800">
                    {GST_RATES.map((g) => (
                      <SelectItem key={g} value={String(g)} className="text-gray-800 dark:text-gray-200">{g}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">HSN Code</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  defaultValue={medicine?.hsnCode}
                  placeholder="e.g. 30049099"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-gray-200 dark:border-gray-800 pb-1">Stock</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Min Stock Level</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  defaultValue={medicine?.minStock}
                  type="number"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Max Stock Level</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  defaultValue={medicine?.maxStock}
                  type="number"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Reorder Level</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  defaultValue={medicine?.reorderLevel}
                  type="number"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Units Per Pack</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  defaultValue={medicine?.unitsPerPack}
                  type="number"
                  placeholder="1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-gray-500 dark:text-gray-400 text-xs">Rack / Location</Label>
                <Input
                  className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  defaultValue={medicine?.rackLocation}
                  placeholder="e.g. A-12"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-gray-200 dark:border-gray-800 pb-1">Storage &amp; Other</h3>
            <div>
              <Label className="text-gray-500 dark:text-gray-400 text-xs">Storage Instructions</Label>
              <Textarea
                className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                defaultValue={medicine?.storageInstructions}
                placeholder="e.g. Store below 25°C in a dry place"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-gray-500 dark:text-gray-400 text-xs">Side Effects Note</Label>
              <Textarea
                className="mt-1 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                defaultValue={medicine?.sideEffectsNote}
                placeholder="e.g. Nausea, vomiting possible"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div>
                <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">Prescription Required</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Mark if Schedule H / H1 / X drug</p>
              </div>
              <Switch
                checked={prescriptionRequired}
                onCheckedChange={setPrescriptionRequired}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </section>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
          <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
            {isEdit ? "Save Changes" : "Add Medicine"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page

export default function MedicinesPage() {
  const [search, setSearch] = useState("");
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [scheduleFilter, setScheduleFilter] = useState("All");
  const [stockStatusFilter, setStockStatusFilter] = useState("All");
  const [manufacturerFilter, setManufacturerFilter] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [batchSheetOpen, setBatchSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editMedicine, setEditMedicine] = useState<Medicine | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const PAGE_SIZE = 200;
  const [page, setPage] = useState(1);

  // Reset to the first page whenever the search term or the server-side
  // category filter changes (otherwise you could land on an empty page).
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  const { data: pageData, isLoading, isFetching } = useMedicines(
    debouncedSearch,
    page,
    PAGE_SIZE,
    categoryFilter
  );
  const medicines = pageData?.medicines ?? [];
  const totalCount = pageData?.total ?? 0;
  const totalPages = pageData?.pages ?? 1;

  const manufacturers = useMemo(
    () => ["All", ...Array.from(new Set(medicines.map((m) => m.manufacturer))).sort()],
    [medicines]
  );

  // Existing companies / salts, to power the form's autocomplete suggestions.
  const companyOptions = useMemo(
    () => Array.from(new Set(medicines.map((m) => m.manufacturer).filter(Boolean))).sort(),
    [medicines]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return medicines.filter((m) => {
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        m.saltComposition.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.barcode.toLowerCase().includes(q) ||
        m.hsnCode.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);

      const matchCategory = categoryFilter === "All" || m.category === categoryFilter;
      const matchSchedule =
        scheduleFilter === "All" ||
        (scheduleFilter === "OTC" ? !m.schedule || m.schedule === "OTC" : m.schedule === scheduleFilter);
      const matchManufacturer = manufacturerFilter === "All" || m.manufacturer === manufacturerFilter;
      const matchStock =
        stockStatusFilter === "All" ||
        (stockStatusFilter === "In Stock" && m.stock > m.minStock) ||
        (stockStatusFilter === "Low Stock" && m.stock > 0 && m.stock <= m.minStock) ||
        (stockStatusFilter === "Out of Stock" && m.stock === 0);

      return matchSearch && matchCategory && matchSchedule && matchManufacturer && matchStock;
    });
  }, [medicines, debouncedSearch, categoryFilter, scheduleFilter, manufacturerFilter, stockStatusFilter]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSmartSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleEdit = useCallback((medicine: Medicine, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditMedicine(medicine);
    setFormOpen(true);
  }, []);

  const handleViewBatches = useCallback((medicine: Medicine, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMedicine(medicine);
    setBatchSheetOpen(true);
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/medicines/${deleteTarget.id}`);
      await queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("Item deleted.");
      setDeleteTarget(null);
    } catch (err: any) {
      // Backend blocks deletion of items that have been billed.
      toast.error(err?.response?.data?.message || "Could not delete the item.", { duration: 4000 });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, queryClient]);

  const handleSmartSelect = useCallback((medicine: Medicine) => {
    setShowSmartSearch(false);
    setSearch(medicine.name);
  }, []);

  const activeFiltersCount = [
    categoryFilter !== "All",
    scheduleFilter !== "All",
    stockStatusFilter !== "All",
    manufacturerFilter !== "All",
  ].filter(Boolean).length;

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditMedicine(null);
  }, []);

  // Save the item to the backend (create or update).
  const handleSaveItem = useCallback(
    async (v: MedicineFormValues) => {
      const payload = {
        name: v.name,
        itemType: v.itemType,
        genericName: v.genericName || null,
        genericCode: v.genericCode ? Number(v.genericCode) : null,
        manufacturer: v.manufacturer || null,
        companyCode: v.companyCode || null,
        category: v.category,
        categoryCode: v.categoryCode || null,
        scheduleType: v.scheduleType,
        looseQtyFactor: v.looseQtyFactor,
        packing: v.packing || null,
        hsnCode: v.hsnCode || null,
        gstRate: v.gstRate,
        barcode: v.barcode || null,
        mrp: v.mrp ?? 0,
        purchaseRate: v.purchaseRate ?? 0,
        saleRate: v.saleRate ?? 0,
        minLevel: v.minLevel,
        maxLevel: v.maxLevel,
        reorderLevel: v.reorderLevel,
        storageInstructions: v.storageInstructions || null,
        isActive: v.isActive,
      };
      try {
        if (editMedicine) await apiClient.put(`/medicines/${editMedicine.id}`, payload);
        else await apiClient.post("/medicines", payload);
        await queryClient.invalidateQueries({ queryKey: ["medicines"] });
        toast.success(editMedicine ? "Item updated." : "Item added to the master.");
        closeForm();
      } catch {
        toast.error("Could not save the item. Please check the fields and try again.");
      }
    },
    [editMedicine, closeForm, queryClient]
  );

  const formDefaults: Partial<MedicineFormValues> | undefined = editMedicine
    ? {
        name: editMedicine.name,
        itemType: "medicine",
        genericName: editMedicine.generic,
        manufacturer: editMedicine.manufacturer,
        category: editMedicine.category,
        barcode: editMedicine.barcode,
        hsnCode: editMedicine.hsnCode,
        mrp: editMedicine.mrp,
        purchaseRate: editMedicine.purchaseRate,
        saleRate: editMedicine.saleRate,
        gstRate: editMedicine.gstPercent,
        minLevel: editMedicine.minStock,
        maxLevel: editMedicine.maxStock,
        reorderLevel: editMedicine.reorderLevel,
        scheduleType: editMedicine.schedule && editMedicine.schedule !== "OTC" ? "H" : "OTC",
        storageInstructions: editMedicine.storageInstructions,
        isActive: true,
        looseQtyFactor: 1,
      }
    : undefined;

  // The entry form replaces the list in-place (a full page, not a popup).
  if (formOpen) {
    return (
      <PageContainer>
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={closeForm}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editMedicine ? "Edit Item" : "Add New Item"}
          </h1>
        </div>
        <MedicineForm
          defaultValues={formDefaults}
          onSubmit={handleSaveItem}
          onCancel={closeForm}
          submitLabel={editMedicine ? "Save Changes" : "Add Item"}
          companyOptions={companyOptions}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Item Master"
        subtitle="Manage your complete item inventory"
        icon={Pill}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Import Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => { setEditMedicine(null); setFormOpen(true); }}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </>
        }
      />

      {/* Smart Search Bar */}
      <div ref={searchRef} className="relative">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setShowSmartSearch(value.length > 1);
          }}
          placeholder="Search by medicine name, brand name, salt composition, generic name, barcode..."
        />

        {showSmartSearch && debouncedSearch.length > 1 && (
          <SmartSearchPanel
            query={debouncedSearch}
            medicines={medicines}
            onSelectMedicine={handleSmartSelect}
          />
        )}
      </div>

      {/* Filters (Collapsible) */}
      <Panel className="overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5 border-0">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          {filtersOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {filtersOpen && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-gray-500 dark:text-gray-400 text-xs mb-1 block">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-gray-800 dark:text-gray-200">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-500 dark:text-gray-400 text-xs mb-1 block">Manufacturer</Label>
              <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800">
                  {manufacturers.map((m) => (
                    <SelectItem key={m} value={m} className="text-gray-800 dark:text-gray-200">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-500 dark:text-gray-400 text-xs mb-1 block">Schedule Type</Label>
              <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800">
                  {SCHEDULES.map((s) => (
                    <SelectItem key={s} value={s} className="text-gray-800 dark:text-gray-200">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-500 dark:text-gray-400 text-xs mb-1 block">Stock Status</Label>
              <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800">
                  {STOCK_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-gray-800 dark:text-gray-200">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeFiltersCount > 0 && (
              <button
                className="col-span-2 lg:col-span-4 text-xs text-blue-600 hover:text-blue-700 text-left"
                onClick={() => {
                  setCategoryFilter("All");
                  setScheduleFilter("All");
                  setStockStatusFilter("All");
                  setManufacturerFilter("All");
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </Panel>

      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Showing <span className="text-gray-700 dark:text-gray-300 font-medium">{filtered.length}</span> on this page
          {" · "}
          <span className="text-gray-700 dark:text-gray-300 font-medium">{totalCount.toLocaleString()}</span> matching
          {debouncedSearch && (
            <> for <span className="text-blue-600">"{debouncedSearch}"</span></>
          )}
          {isFetching && <span className="ml-2 text-xs text-blue-500">updating…</span>}
        </p>
      </div>

      {/* Medicine Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="[&_td]:px-2 [&_td]:py-1.5 [&_td]:text-xs [&_th]:h-8 [&_th]:px-2">
            <TableHeader>
              <TableRow>
                {[
                  "S.No",
                  "Item Code",
                  "Item Name",
                  "Generic / Salt",
                  "Category",
                  "HSN",
                  "GST%",
                  "MRP",
                  "Purchase Rate",
                  "Stock",
                  "Expiry",
                  "Actions",
                ].map((h) => (
                  <TableHead
                    key={h}
                    className="uppercase tracking-wide whitespace-nowrap text-[11px]"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={12} className="p-0">
                    <TableEmpty
                      icon={Package}
                      title={
                        debouncedSearch
                          ? `No results for "${debouncedSearch}"`
                          : "No medicines found"
                      }
                      description={
                        debouncedSearch
                          ? "Try a different keyword or clear the search"
                          : "Add your first medicine to get started"
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((medicine, idx) => {
                  const isExpiringSoon =
                    medicine.expiryDate &&
                    new Date(medicine.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) &&
                    new Date(medicine.expiryDate) > new Date();

                  return (
                    <TableRow
                      key={medicine.id}
                      className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/60 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <TableCell className="text-gray-400 dark:text-gray-500 text-xs w-10">{idx + 1}</TableCell>

                      <TableCell className="font-mono text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                        {medicine.itemCode || "—"}
                      </TableCell>

                      <TableCell className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap max-w-[180px]">
                        <div>
                          <p className="truncate">{highlightText(medicine.name, debouncedSearch)}</p>
                          {medicine.prescriptionRequired && (
                            <span className="text-xs text-amber-500">Rx required</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-gray-500 dark:text-gray-400 text-xs max-w-[160px]">
                        <p className="truncate">{highlightText(medicine.saltComposition, debouncedSearch)}</p>
                      </TableCell>

                      <TableCell>
                        <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 border border-blue-200 dark:border-gray-800 text-xs whitespace-nowrap">
                          {medicine.category}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {medicine.hsnCode}
                      </TableCell>

                      <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{medicine.gstPercent}%</TableCell>

                      <TableCell className="text-gray-800 dark:text-gray-200 font-semibold whitespace-nowrap">
                        ₹{medicine.mrp.toFixed(2)}
                      </TableCell>

                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                        ₹{medicine.purchaseRate.toFixed(2)}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`font-bold text-sm leading-none ${
                            medicine.stock === 0
                              ? "text-red-600"
                              : medicine.stock <= medicine.minStock
                              ? "text-amber-600"
                              : medicine.stock > 50
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {medicine.stock}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs whitespace-nowrap">
                        {medicine.expiryDate ? (
                          <span className={isExpiringSoon ? "text-amber-600" : "text-gray-500 dark:text-gray-400"}>
                            {formatExpiry(medicine.expiryDate)}
                            {isExpiringSoon && <span className="ml-1 text-amber-500">⚠</span>}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit"
                            className="h-7 w-7 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={(e) => handleEdit(medicine, e)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View Batches"
                            className="h-7 w-7 p-0 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={(e) => handleViewBatches(medicine, e)}
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Print Barcode"
                            className="h-7 w-7 p-0 text-gray-500 dark:text-gray-400 hover:text-green-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete"
                            className="h-7 w-7 p-0 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(medicine); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page <span className="font-medium text-gray-700 dark:text-gray-300">{page}</span> of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <MedicineBatchSheet
        medicine={selectedMedicine}
        open={batchSheetOpen}
        onOpenChange={setBatchSheetOpen}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Delete item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Delete <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteTarget?.name}</span>?
            Items that have been billed in any sale cannot be deleted.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </PageContainer>
  );
}

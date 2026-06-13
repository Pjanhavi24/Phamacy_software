"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Eye,
  Download,
  Search,
  X,
  Save,
  Printer,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Barcode,
  Mail,
  FileSpreadsheet,
  History,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PageContainer,
  TableEmpty,
} from "@/components/design-system";
import { useTabDirty } from "@/components/workspace/workspace-context";

// --- Types ---

interface Supplier {
  id: string;
  name: string;
  gstin?: string;
  phone?: string;
  address?: string;
  creditDays?: number;
}

interface MedicineOption {
  id: string;
  code?: string | number;
  name: string;
  genericName?: string;
  gstRate?: number;
  mrp?: number;
  rate?: number;
  stock?: number;
  packing?: string;
}

interface PurchaseBatchOption {
  id: string;
  batchNumber: string;
  expiry: string;
  availableQty: number;
  mrp: number;
  rate: number;
  expired: boolean;
  nearExpiry: boolean;
}

interface PurchaseItem {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
  freeQty: number;
  mrp: number;
  purchaseRate: number; // bill rate
  saleRate: number;
  schemeType: "percent" | "amount";
  schemeValue: number;
  gstRate: number;
  amount: number;
}

interface Purchase {
  id: string;
  invoiceNo: string;
  supplierName: string;
  date: string;
  itemCount: number;
  totalAmount: number;
  paidAmount?: number;
  status: "paid" | "partial" | "credit";
  items?: PurchaseItem[];
  totalGst?: number;
  cgst?: number;
  sgst?: number;
}

// --- Constants ---

const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_TERMS = [0, 15, 30, 45, 60];

const FALLBACK_SUPPLIERS: Supplier[] = [
  { id: "1", name: "Sun Pharma Distributors", gstin: "27AABCS1681E1ZB", phone: "9876500001", address: "Mumbai", creditDays: 30 },
  { id: "2", name: "Cipla Healthcare", gstin: "27AAACC8198Q1ZS", phone: "9876500002", address: "Pune", creditDays: 45 },
  { id: "3", name: "MedCorp Supplies", gstin: "27AADCM1234P1ZT", phone: "9876500003", address: "Nashik", creditDays: 21 },
  { id: "4", name: "Dr. Reddy Distributors", gstin: "27AAACR4849H1ZC", phone: "9876500004", address: "Hyderabad", creditDays: 30 },
  { id: "5", name: "Lupin Pharma", gstin: "27AAABL4849K1ZA", phone: "9876500005", address: "Mumbai", creditDays: 60 },
];

const FALLBACK_MEDICINES: MedicineOption[] = [
  { id: "1", name: "Paracetamol 500mg", gstRate: 5 },
  { id: "2", name: "Amoxicillin 500mg", gstRate: 12 },
  { id: "3", name: "Metformin 500mg", gstRate: 5 },
  { id: "4", name: "Atorvastatin 10mg", gstRate: 12 },
  { id: "5", name: "Omeprazole 20mg", gstRate: 12 },
  { id: "6", name: "Azithromycin 500mg", gstRate: 12 },
  { id: "7", name: "Cetirizine 10mg", gstRate: 5 },
];

const FALLBACK_HISTORY: Purchase[] = [
  { id: "1", invoiceNo: "INV-2024-1234", supplierName: "Sun Pharma Distributors", date: "2024-01-15", itemCount: 12, totalAmount: 47025, paidAmount: 47025, status: "paid" },
  { id: "2", invoiceNo: "INV-2024-1235", supplierName: "Cipla Healthcare", date: "2024-01-18", itemCount: 8, totalAmount: 29120, paidAmount: 15000, status: "partial" },
  { id: "3", invoiceNo: "INV-2024-1236", supplierName: "MedCorp Supplies", date: "2024-01-20", itemCount: 5, totalAmount: 12480, paidAmount: 0, status: "credit" },
  { id: "4", invoiceNo: "INV-2024-1237", supplierName: "Dr. Reddy Distributors", date: "2024-01-22", itemCount: 15, totalAmount: 69680, paidAmount: 0, status: "credit" },
  { id: "5", invoiceNo: "INV-2024-1238", supplierName: "Lupin Pharma", date: "2024-01-24", itemCount: 9, totalAmount: 35360, paidAmount: 35360, status: "paid" },
];

const STATUS_CFG = {
  paid: { label: "Paid", color: "bg-green-100 dark:bg-green-950/40 text-green-700 border-green-200 dark:border-green-900", icon: CheckCircle },
  partial: { label: "Partial", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 border-blue-200 dark:border-blue-900", icon: Clock },
  credit: { label: "Credit", color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 border-amber-200 dark:border-amber-900", icon: AlertCircle },
};

// --- Helpers ---

function emptyItem(): PurchaseItem {
  return {
    id: crypto.randomUUID(),
    medicineId: "",
    medicineName: "",
    batchNo: "",
    mfgDate: "",
    expiryDate: "",
    qty: 1,
    freeQty: 0,
    mrp: 0,
    purchaseRate: 0,
    saleRate: 0,
    schemeType: "percent",
    schemeValue: 0,
    gstRate: 5,
    amount: 0,
  };
}

// Taxable value after applying the scheme (by % or by flat amount) on the line.
function lineTaxable(item: PurchaseItem): number {
  const base = item.qty * item.purchaseRate;
  const scheme =
    item.schemeType === "percent"
      ? (base * (item.schemeValue || 0)) / 100
      : item.schemeValue || 0;
  return Math.max(0, base - scheme);
}

function calcAmount(item: PurchaseItem): number {
  const taxable = lineTaxable(item);
  const gst = (taxable * item.gstRate) / 100;
  return parseFloat((taxable + gst).toFixed(2));
}

// Reject stock that is already expired or expires too soon after the bill date.
const NEAR_EXPIRY_MONTHS = 4;

// Parse common expiry formats (MM/YY, MM/YYYY, YYYY-MM, DD-MM-YYYY, DD/MM/YYYY)
// to the last day of that month.
function parseExpiryMonth(value: string): Date | null {
  const v = (value || "").trim();
  if (!v) return null;
  let mm = 0, yyyy = 0, m: RegExpExecArray | null;
  if ((m = /^(\d{1,2})[/-](\d{2})$/.exec(v))) { mm = +m[1]; yyyy = 2000 + +m[2]; }
  else if ((m = /^(\d{1,2})[/-](\d{4})$/.exec(v))) { mm = +m[1]; yyyy = +m[2]; }
  else if ((m = /^(\d{4})[/-](\d{1,2})$/.exec(v))) { yyyy = +m[1]; mm = +m[2]; }
  else if ((m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v))) { mm = +m[2]; yyyy = +m[3]; }
  else { const d = new Date(v); if (isNaN(d.getTime())) return null; mm = d.getMonth() + 1; yyyy = d.getFullYear(); }
  if (mm < 1 || mm > 12) return null;
  return new Date(yyyy, mm, 0, 23, 59, 59);
}

// Auto-format keystrokes into MM/YY as the user types (e.g. "0727" → "07/27").
function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// Normalise any supported expiry format to "MM/YY" for display in the grid.
function normalizeExpiry(value: string): string {
  const d = parseExpiryMonth(value);
  if (!d) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

// Convert an MM/YY expiry to an ISO end-of-month date for the backend.
function toExpiryISO(value: string): string {
  const d = parseExpiryMonth(value);
  if (!d) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// True if the item expires on/before (refDate + NEAR_EXPIRY_MONTHS months).
function isNearExpiry(month: string, refDate: Date): boolean {
  const exp = parseExpiryMonth(month);
  if (!exp) return false;
  const threshold = new Date(refDate);
  threshold.setMonth(threshold.getMonth() + NEAR_EXPIRY_MONTHS);
  return exp.getTime() <= threshold.getTime();
}

// --- Product picker (wide modal, like the master pickers) ---

function ProductPickerModal({
  open,
  initialQuery,
  onClose,
  onPick,
}: {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
  onPick: (med: MedicineOption) => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<MedicineOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Seed the query when the modal opens.
  useEffect(() => {
    if (open) setQ(initialQuery ?? "");
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 1) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get("/medicines/search", { params: { q: term } });
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const mapped: MedicineOption[] = data.map((m: any) => ({
          id: m.id,
          code: m.code ?? m.productCode,
          name: m.name,
          genericName: m.genericName ?? m.salt,
          gstRate: m.gstPct ?? m.gstRate,
          mrp: m.mrp,
          rate: m.rate ?? m.saleRate,
          stock: m.stock,
          packing: m.packing,
        }));
        if (!cancelled) setRows(mapped);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-10">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Select Product</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search product by name…"
              className="h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
            {loading && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-100 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="w-20 px-3 py-2 text-left font-semibold">Code</th>
                <th className="px-3 py-2 text-left font-semibold">Item Name</th>
                <th className="w-16 px-3 py-2 text-right font-semibold">Stock</th>
                <th className="w-20 px-3 py-2 text-right font-semibold">MRP</th>
                <th className="w-28 px-3 py-2 text-left font-semibold">Packing</th>
              </tr>
            </thead>
            <tbody>
              {q.trim() === "" ? (
                <tr><td colSpan={5} className="px-3 py-3 text-gray-400">Type to search…</td></tr>
              ) : loading && rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-3 text-gray-400">Searching…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-3 text-gray-400">No matches.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onPick(r)}
                    className="cursor-pointer border-t border-gray-100 hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-950/40"
                  >
                    <td className="px-3 py-1.5 font-mono text-gray-600 dark:text-gray-400">{r.code ?? "—"}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                    <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{r.stock ?? 0}</td>
                    <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{r.mrp != null ? `₹${Number(r.mrp).toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.packing ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- New Purchase Form ---

function NewPurchaseForm() {
  const queryClient = useQueryClient();

  // Supplier
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);

  // Invoice header
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(30);

  // Items
  const [items, setItems] = useState<PurchaseItem[]>([]);
  // Mark this tab as having unsaved work once a medicine is added, so opening
  // another module spawns a new tab instead of replacing this purchase.
  useTabDirty(items.some((i) => i.medicineId));

  // Product picker modal — used when editing an existing row's product
  // (clicking the item name). `pickerRow` holds that row id, else undefined.
  const [pickerRow, setPickerRow] = useState<string | null | undefined>(undefined);
  const [pickerQuery, setPickerQuery] = useState("");

  // Inline product search for the bottom add-row: the results window only
  // opens once the user starts typing, and is keyboard-navigable.
  const [medQuery, setMedQuery] = useState("");
  const [medResults, setMedResults] = useState<MedicineOption[]>([]);
  const [medOpen, setMedOpen] = useState(false);
  const [medLoading, setMedLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const addSearchRef = useRef<HTMLInputElement>(null);

  // Inline batch dropdown (per row) — mirrors the Billing page batch picker.
  const [batchRow, setBatchRow] = useState<string | null>(null);
  const [batchOpts, setBatchOpts] = useState<PurchaseBatchOption[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const excelInputRef = useRef<HTMLInputElement>(null);

  // Payment
  const [otherCharges, setOtherCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState("0");

  // Fetch suppliers
  const { data: supplierList = FALLBACK_SUPPLIERS } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () =>
      apiClient.get("/suppliers").then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : FALLBACK_SUPPLIERS;
      }),
    placeholderData: FALLBACK_SUPPLIERS,
  });

  const mutation = useMutation({
    mutationFn: (payload: object) =>
      apiClient.post("/purchases", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("Purchase saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setSupplier(null);
      setSupplierQuery("");
      setInvoiceNo("");
      setInvoiceDate(format(new Date(), "yyyy-MM-dd"));
      setDueDate("");
      setItems([]);
      setPaidAmount("0");
      setOtherCharges(0);
    },
    onError: () => toast.error("Failed to save purchase."),
  });

  const filteredSuppliers = supplierList.filter((s) =>
    s.name.toLowerCase().includes(supplierQuery.toLowerCase())
  );

  // Preselect a supplier when arriving via /purchase?supplier=<id>
  // (e.g. the "New Purchase" action on the Suppliers page).
  useEffect(() => {
    if (supplier) return;
    const sid = new URLSearchParams(window.location.search).get("supplier");
    if (!sid) return;
    const match = supplierList.find((s) => String(s.id) === sid);
    if (match) setSupplier(match);
  }, [supplierList, supplier]);

  // Consume a bill handed over from the Gmail import → fill these same rows.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("pharma_purchase_import");
    } catch {
      return;
    }
    if (!raw) return;
    try {
      sessionStorage.removeItem("pharma_purchase_import");
    } catch {
      /* ignore */
    }
    try {
      const p = JSON.parse(raw) as {
        supplierName?: string;
        invoiceNumber?: string;
        invoiceDate?: string;
        items?: Array<Partial<PurchaseItem>>;
      };
      if (p.invoiceNumber) setInvoiceNo(p.invoiceNumber);
      if (p.invoiceDate) setInvoiceDate(p.invoiceDate);
      if (p.supplierName) setSupplierQuery(p.supplierName);
      const newItems = (p.items || [])
        .filter((it) => (it.medicineName || "").trim())
        .map((it) => {
          const item: PurchaseItem = {
            ...emptyItem(),
            medicineName: it.medicineName || "",
            batchNo: it.batchNo || "",
            expiryDate: normalizeExpiry(it.expiryDate || ""),
            qty: it.qty || 1,
            mrp: it.mrp || 0,
            purchaseRate: it.purchaseRate || 0,
            saleRate: it.saleRate || 0,
            gstRate: it.gstRate ?? 5,
            schemeValue: it.schemeValue || 0,
          };
          item.amount = calcAmount(item);
          return item;
        });
      if (newItems.length) {
        setItems(newItems);
        runAutoMatch(newItems);
        toast.success(`Loaded ${newItems.length} item(s) from the Gmail bill — review and save.`);
      }
    } catch {
      /* ignore malformed payload */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A product was chosen in the picker: append a new row, or replace the
  // product on an existing row (when editing via the item name).
  const pickProduct = (med: MedicineOption) => {
    if (pickerRow) {
      // Replace product on an existing row; reset the batch (it's product-specific).
      updateItem(pickerRow, {
        medicineId: med.id,
        medicineName: med.name,
        gstRate: med.gstRate ?? 5,
        mrp: med.mrp ?? 0,
        saleRate: med.rate ?? 0,
        batchNo: "",
        expiryDate: "",
      });
    } else {
      const ni: PurchaseItem = {
        ...emptyItem(),
        medicineId: med.id,
        medicineName: med.name,
        gstRate: med.gstRate ?? 5,
        mrp: med.mrp ?? 0,
        saleRate: med.rate ?? 0,
      };
      ni.amount = calcAmount(ni);
      setItems((prev) => [...prev, ni]);
    }
    setPickerRow(undefined);
    setPickerQuery("");
  };

  // Debounced search for the inline add-row (opens the window only on typing).
  useEffect(() => {
    const q = medQuery.trim();
    if (q.length < 1) {
      setMedResults([]);
      setMedOpen(false);
      return;
    }
    let cancelled = false;
    setMedLoading(true);
    setMedOpen(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get("/medicines/search", { params: { q } });
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const mapped: MedicineOption[] = data.map((m: any) => ({
          id: m.id,
          code: m.code ?? m.productCode,
          name: m.name,
          genericName: m.genericName ?? m.salt,
          gstRate: m.gstPct ?? m.gstRate,
          mrp: m.mrp,
          rate: m.rate ?? m.saleRate,
          stock: m.stock,
          packing: m.packing,
        }));
        if (!cancelled) {
          setMedResults(mapped);
          setHighlight(0);
        }
      } catch {
        if (!cancelled) setMedResults([]);
      } finally {
        if (!cancelled) setMedLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [medQuery]);

  // Add the chosen product as a NEW row, then clear the search so the add-row
  // (and its input focus) moves down to the next line.
  const addFromSearch = (med: MedicineOption) => {
    const ni: PurchaseItem = {
      ...emptyItem(),
      medicineId: med.id,
      medicineName: med.name,
      gstRate: med.gstRate ?? 5,
      mrp: med.mrp ?? 0,
      saleRate: med.rate ?? 0,
    };
    ni.amount = calcAmount(ni);
    setItems((prev) => [...prev, ni]);
    setMedQuery("");
    setMedResults([]);
    setMedOpen(false);
    setTimeout(() => addSearchRef.current?.focus(), 30);
  };

  const handleAddSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMedOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, medResults.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (medResults.length > 0) addFromSearch(medResults[highlight] ?? medResults[0]);
    } else if (e.key === "Escape") {
      setMedOpen(false);
    }
  };

  // Open the batch dropdown for a row and load that medicine's batches.
  const openBatches = async (rowId: string, medicineId: string) => {
    setBatchRow(rowId);
    setBatchOpts([]);
    if (!medicineId) return; // manually-typed product — no catalogue batches yet
    setBatchLoading(true);
    try {
      const res = await apiClient.get(`/medicines/${medicineId}/batches`);
      setBatchOpts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setBatchOpts([]);
    } finally {
      setBatchLoading(false);
    }
  };

  // Apply a chosen batch to the row (fills batch, rates and expiry).
  const pickBatch = (rowId: string, b: PurchaseBatchOption) => {
    updateItem(rowId, {
      batchNo: b.batchNumber,
      mrp: b.mrp || 0,
      saleRate: b.rate || 0,
      expiryDate: b.expiry || "",
    });
    setBatchRow(null);
    setBatchOpts([]);
  };

  const updateItem = (id: string, patch: Partial<PurchaseItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...patch };
        updated.amount = calcAmount(updated);
        return updated;
      })
    );
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  // Auto-match imported rows to existing medicines (link medicineId by name).
  const runAutoMatch = (list: PurchaseItem[]) => {
    list.forEach(async (it) => {
      if (it.medicineId || !it.medicineName.trim()) return;
      try {
        const res = await apiClient.get("/medicines/search", {
          params: { q: it.medicineName.trim() },
        });
        const data: Array<{ id: string; name: string }> = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
        const lower = it.medicineName.trim().toLowerCase();
        const m = data.find((d) => String(d.name).toLowerCase() === lower) || data[0];
        if (m?.id) updateItem(it.id, { medicineId: m.id });
      } catch {
        /* leave unmatched — user can create it */
      }
    });
  };

  // Create a new medicine for an unmatched imported row, then link it.
  const createMedicine = async (it: PurchaseItem) => {
    const name = it.medicineName.trim();
    if (!name) return;
    try {
      const res = await apiClient.post("/medicines", {
        name,
        mrp: it.mrp || it.purchaseRate || 0,
        purchaseRate: it.purchaseRate || 0,
        saleRate: it.saleRate || it.mrp || it.purchaseRate || 0,
        gstRate: it.gstRate || 5,
      });
      const id = res.data?.id;
      if (id) {
        updateItem(it.id, { medicineId: id });
        toast.success(`Added "${name}" to the catalog.`);
      }
    } catch {
      toast.error(`Could not create "${name}".`);
    }
  };

  // Import a supplier bill from an Excel/CSV file → auto-fill the item rows.
  // Columns are matched by header name (case-insensitive), so common exports work.
  const handleExcelImport = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const pick = (row: Record<string, unknown>, keys: string[]): string => {
        const lower: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) lower[String(k).toLowerCase().trim()] = v;
        for (const k of keys) {
          const v = lower[k];
          if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
        }
        return "";
      };
      const num = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;

      const imported: PurchaseItem[] = rows
        .map((row) => {
          const name = pick(row, ["item name", "item", "medicine", "description", "product", "name", "particulars"]);
          if (!name) return null;
          const it: PurchaseItem = {
            ...emptyItem(),
            medicineName: name,
            batchNo: pick(row, ["batch no", "batch", "batchno", "batch number"]),
            expiryDate: normalizeExpiry(pick(row, ["expiry", "exp", "expiry date", "exp date"])),
            qty: Math.max(1, Math.round(num(pick(row, ["qty", "quantity", "qnty"]))) || 1),
            mrp: num(pick(row, ["mrp", "m.r.p"])),
            purchaseRate: num(pick(row, ["bill rate", "purchase rate", "p.rate", "p rate", "rate", "billrate", "cost"])),
            saleRate: num(pick(row, ["sale rate", "salerate", "s.rate", "s rate", "selling rate"])),
            schemeValue: num(pick(row, ["scheme", "scheme %", "disc", "discount", "disc%"])),
            gstRate: num(pick(row, ["gst", "gst%", "gst %", "tax", "tax%"])) || 5,
          };
          it.amount = calcAmount(it);
          return it;
        })
        .filter((x): x is PurchaseItem => x !== null);

      if (imported.length === 0) {
        toast.error("No item rows found. Expected columns like Item Name, Batch, Qty, Rate.");
        return;
      }
      setItems((prev) => [...prev, ...imported]);
      runAutoMatch(imported);
      toast.success(`Imported ${imported.length} item(s) from ${file.name}`);
    } catch {
      toast.error("Could not read the Excel file. Please check the format.");
    }
  };

  // Reference date for expiry checks = the bill (purchase) date.
  const expRefDate = invoiceDate ? new Date(invoiceDate) : new Date();

  // Totals
  const taxableAmt = items.reduce((s, i) => s + lineTaxable(i), 0);
  const totalGst = items.reduce((s, i) => s + (lineTaxable(i) * i.gstRate) / 100, 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const grandTotal = taxableAmt + totalGst + otherCharges;
  const creditAmt = Math.max(0, grandTotal - parseFloat(paidAmount || "0"));

  const handleSave = (print = false) => {
    if (!supplier) { toast.error("Please select a supplier."); return; }
    if (!invoiceNo) { toast.error("Please enter invoice number."); return; }
    const validItems = items.filter((i) => i.medicineId && i.qty > 0);

    // Expiry guard — every entered item must have a valid expiry that is more
    // than NEAR_EXPIRY_MONTHS months past the bill date.
    const named = items.filter((i) => i.medicineName.trim());
    if (named.some((i) => !i.expiryDate)) {
      toast.error("Enter an expiry date for every item.");
      return;
    }
    const nearExpiry = named.filter((i) => isNearExpiry(i.expiryDate, expRefDate));
    if (nearExpiry.length > 0) {
      toast.error(
        `Cannot purchase: ${nearExpiry.length} item(s) are expired or expire within ${NEAR_EXPIRY_MONTHS} months of the bill date.`
      );
      return;
    }

    // Every imported row must be linked to a catalog medicine before saving.
    const unmatched = named.filter((i) => !i.medicineId);
    if (unmatched.length > 0) {
      toast.error(
        `${unmatched.length} item(s) are not in the catalog — click "Create" on those rows first.`
      );
      return;
    }

    if (validItems.length === 0) { toast.error("Add at least one medicine."); return; }

    mutation.mutate({
      supplierId: supplier.id,
      invoiceNo,
      invoiceDate,
      dueDate: dueDate || undefined,
      paymentTerms,
      // Send a real end-of-month date for the MM/YY expiry the user entered.
      items: validItems.map((i) => ({ ...i, expiryDate: toExpiryISO(i.expiryDate) })),
      otherCharges,
      paidAmount: parseFloat(paidAmount || "0"),
      creditAmount: creditAmt,
      taxableAmount: taxableAmt,
      cgst,
      sgst,
      totalGst,
      grandTotal,
    });
    if (print) setTimeout(() => window.print(), 500);
  };

  return (
    <div className="space-y-3">
      {/* ===================== BILL DETAILS (single-line strip) ===================== */}
      <section className="flex flex-wrap items-end gap-3 border-b border-gray-200 px-1 pb-3 dark:border-gray-800">
        {/* Supplier (wide) */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Supplier *</label>
          {supplier ? (
            <div className="flex h-8 items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-2.5 dark:border-blue-900 dark:bg-blue-950/40">
              <div className="min-w-0 truncate">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{supplier.name}</span>
                {supplier.gstin && <span className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-400">{supplier.gstin}</span>}
              </div>
              <button onClick={() => { setSupplier(null); setSupplierQuery(""); }} className="shrink-0 text-gray-400 hover:text-red-500 dark:text-gray-500">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={supplierQuery}
                onChange={(e) => { setSupplierQuery(e.target.value); setShowSupplierDrop(true); }}
                onFocus={() => setShowSupplierDrop(true)}
                onBlur={() => setTimeout(() => setShowSupplierDrop(false), 150)}
                placeholder="Search supplier..."
                className="h-8 w-full rounded-md border border-gray-300 bg-white pl-7 pr-2 text-xs text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              {showSupplierDrop && filteredSuppliers.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                  {filteredSuppliers.map((s) => (
                    <button key={s.id}
                      onMouseDown={() => { setSupplier(s); setSupplierQuery(""); setShowSupplierDrop(false); }}
                      className="w-full border-b border-gray-100 px-3 py-1.5 text-left last:border-0 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                      {s.gstin && <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.gstin}{s.creditDays ? ` · ${s.creditDays}d credit` : ""}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Invoice Number */}
        <div className="w-32">
          <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice No *</label>
          <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" className="h-8 text-xs" />
        </div>
        {/* Invoice Date */}
        <div className="w-36">
          <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice Date</label>
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-8 text-xs" />
        </div>
        {/* Import Excel (on the same line) */}
        <button
          type="button"
          onClick={() => excelInputRef.current?.click()}
          title="Import items from an Excel/CSV file"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-green-600 px-2.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel
        </button>
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleExcelImport(f);
            e.target.value = "";
          }}
        />
      </section>

      {/* ===================== ITEM DETAILS ===================== */}
      <div>
        <h3 className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Item Details
        </h3>

      {/* Medicine grid — large scrollable area with a sticky dark header */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="min-h-[360px] max-h-[calc(100vh-300px)] overflow-auto">
          <table className="w-full min-w-[1140px] text-xs">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white">
              <tr>
                <th className="w-8 px-3 py-2.5 text-left font-semibold">#</th>
                <th className="min-w-[220px] px-3 py-2.5 text-left font-semibold">Item Name</th>
                <th className="w-44 px-3 py-2.5 text-left font-semibold">Batch No</th>
                <th className="w-28 px-3 py-2.5 text-left font-semibold">Expiry</th>
                <th className="w-16 px-3 py-2.5 text-center font-semibold">Qty</th>
                <th className="w-20 px-3 py-2.5 text-right font-semibold">MRP</th>
                <th className="w-20 px-3 py-2.5 text-right font-semibold">Bill Rate</th>
                <th className="w-20 px-3 py-2.5 text-right font-semibold">Sale Rate</th>
                <th className="w-32 px-3 py-2.5 text-center font-semibold">Scheme</th>
                <th className="w-20 px-3 py-2.5 text-center font-semibold">GST%</th>
                <th className="w-24 px-3 py-2.5 text-right font-semibold">Amount</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 hover:bg-blue-50/40 dark:border-gray-800 dark:hover:bg-blue-950/30"
                  >
                    <td className="px-3 py-2.5 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setPickerQuery(""); setPickerRow(item.id); }}
                          title="Click to change the product"
                          className="truncate text-left hover:text-blue-600 hover:underline"
                        >
                          {item.medicineName || <span className="text-gray-400">Select product…</span>}
                        </button>
                        {!item.medicineId && item.medicineName && (
                          <button
                            type="button"
                            onClick={() => createMedicine(item)}
                            title="Not in catalog — click to create and link it"
                            className="inline-flex shrink-0 items-center gap-0.5 rounded border border-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                          >
                            <Plus className="h-2.5 w-2.5" /> Create
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="relative px-3 py-2.5">
                      <Input
                        value={item.batchNo}
                        onChange={(e) => updateItem(item.id, { batchNo: e.target.value })}
                        onFocus={() => openBatches(item.id, item.medicineId)}
                        onBlur={() => setTimeout(() => setBatchRow((r) => (r === item.id ? null : r)), 150)}
                        placeholder="Batch"
                        className="h-8 text-xs"
                      />
                      {batchRow === item.id && (
                        <div className="absolute left-3 right-3 top-full z-40 mt-0.5 max-h-56 min-w-[260px] overflow-auto rounded-md border border-green-200 bg-white shadow-xl dark:border-green-900 dark:bg-gray-900">
                          {batchLoading ? (
                            <div className="px-2 py-3 text-center text-gray-400">Loading…</div>
                          ) : batchOpts.length === 0 ? (
                            <div className="px-2 py-3 text-center text-gray-400">No previous batches — type a new one.</div>
                          ) : (
                            <>
                              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                                <span>Batch</span><span className="text-right">Stock</span><span className="text-right">Rate</span><span className="text-right">Exp</span>
                              </div>
                              {batchOpts.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => pickBatch(item.id, b)}
                                  className="grid w-full grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 text-left text-xs hover:bg-green-50 dark:hover:bg-green-950/30"
                                >
                                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{b.batchNumber}</span>
                                  <span className={cn("text-right", b.availableQty > 0 ? "text-gray-600 dark:text-gray-400" : "text-red-500")}>{b.availableQty}</span>
                                  <span className="text-right text-gray-600 dark:text-gray-400">₹{Number(b.rate || b.mrp || 0).toFixed(0)}</span>
                                  <span className={cn("text-right", b.expired ? "text-red-600" : b.nearExpiry ? "text-amber-600" : "text-gray-500 dark:text-gray-400")}>{b.expiry}</span>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Input
                        value={item.expiryDate}
                        onChange={(e) => updateItem(item.id, { expiryDate: formatExpiryInput(e.target.value) })}
                        placeholder="MM/YY"
                        maxLength={5}
                        inputMode="numeric"
                        title={item.expiryDate && isNearExpiry(item.expiryDate, expRefDate) ? `Expires within ${NEAR_EXPIRY_MONTHS} months of the bill date — not allowed` : undefined}
                        className={cn(
                          "h-8 text-xs",
                          item.expiryDate && isNearExpiry(item.expiryDate, expRefDate) &&
                            "border-red-500 bg-red-50 text-red-600 focus:border-red-500 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/30 dark:text-red-400"
                        )}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.id, { qty: parseInt(e.target.value) || 0 })} className="h-8 text-center text-xs" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input type="number" min={0} step={0.01} value={item.mrp || ""} onChange={(e) => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })} className="h-8 text-right text-xs" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input type="number" min={0} step={0.01} value={item.purchaseRate || ""} onChange={(e) => updateItem(item.id, { purchaseRate: parseFloat(e.target.value) || 0 })} className="h-8 text-right text-xs" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input type="number" min={0} step={0.01} value={item.saleRate || ""} onChange={(e) => updateItem(item.id, { saleRate: parseFloat(e.target.value) || 0 })} className="h-8 text-right text-xs" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <select
                          value={item.schemeType}
                          onChange={(e) => updateItem(item.id, { schemeType: e.target.value as "percent" | "amount" })}
                          className="h-8 rounded-md border border-gray-300 bg-white px-1 text-xs text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                          <option value="percent">%</option>
                          <option value="amount">₹</option>
                        </select>
                        <Input type="number" min={0} step={0.01} value={item.schemeValue || ""} onChange={(e) => updateItem(item.id, { schemeValue: parseFloat(e.target.value) || 0 })} placeholder="0" className="h-8 w-16 text-right text-xs" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Select value={String(item.gstRate)} onValueChange={(v) => updateItem(item.id, { gstRate: parseFloat(v) })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((r) => (
                            <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">₹{item.amount.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => removeItem(item.id)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

              {/* Inline add-medicine row — opens the product picker; stays at the
                  bottom and moves down each time an item is added. */}
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-blue-50/30 dark:bg-blue-950/20">
                <td className="px-3 py-2 text-gray-400 dark:text-gray-500">{items.length + 1}</td>
                <td className="relative px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={addSearchRef}
                      value={medQuery}
                      onChange={(e) => setMedQuery(e.target.value)}
                      onKeyDown={handleAddSearchKey}
                      onBlur={() => setTimeout(() => setMedOpen(false), 150)}
                      placeholder="Type a product name to search…"
                      className="h-8 w-full rounded-md border border-gray-300 bg-white pl-7 pr-7 text-xs font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      autoComplete="off"
                    />
                    {medLoading && <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />}
                  </div>

                  {/* Results window — opens only while typing */}
                  {medOpen && medQuery.trim() !== "" && (
                    <div className="absolute left-3 top-full z-40 mt-1 w-[560px] max-w-[88vw] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                      <div className="grid grid-cols-[70px_1fr_56px_72px_96px] gap-2 border-b border-gray-100 bg-gray-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400">
                        <span>Code</span><span>Item Name</span><span className="text-right">Stock</span><span className="text-right">MRP</span><span>Packing</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {medLoading && medResults.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-gray-400">Searching…</div>
                        ) : medResults.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-gray-400">No matches.</div>
                        ) : (
                          medResults.map((med, idx) => (
                            <button
                              key={med.id}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); addFromSearch(med); }}
                              onMouseEnter={() => setHighlight(idx)}
                              className={cn(
                                "grid w-full grid-cols-[70px_1fr_56px_72px_96px] items-center gap-2 px-3 py-1.5 text-left text-xs",
                                idx === highlight ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                              )}
                            >
                              <span className="font-mono text-gray-600 dark:text-gray-400">{med.code ?? "—"}</span>
                              <span className="truncate font-medium text-gray-900 dark:text-gray-100">{med.name}</span>
                              <span className="text-right text-gray-700 dark:text-gray-300">{med.stock ?? 0}</span>
                              <span className="text-right text-gray-700 dark:text-gray-300">{med.mrp != null ? `₹${Number(med.mrp).toFixed(0)}` : "—"}</span>
                              <span className="truncate text-gray-500 dark:text-gray-400">{med.packing ?? "—"}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </td>
                <td colSpan={10} className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                  {items.length === 0 ? "Start typing a product name to search and add." : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Footer: compact — total on top, tax details below, slim actions */}
      <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 bg-white px-3 py-1.5 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {/* Totals (total above, tax below) */}
          <div className="flex flex-col">
            <span className="text-base font-bold text-blue-700">Total: ₹{grandTotal.toFixed(2)}</span>
            <span className="flex flex-wrap gap-x-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Items {items.filter((i) => i.medicineName).length}</span>
              <span>Qty {items.reduce((s, i) => s + i.qty, 0)}</span>
              <span>Taxable ₹{taxableAmt.toFixed(2)}</span>
              <span>CGST ₹{cgst.toFixed(2)}</span>
              <span>SGST ₹{sgst.toFixed(2)}</span>
              <span>GST ₹{totalGst.toFixed(2)}</span>
            </span>
          </div>
          {/* Action buttons (slim) */}
          <div className="flex flex-shrink-0 gap-2">
            <Button variant="outline" size="sm" className="h-8"
              onClick={() => { setSupplier(null); setInvoiceNo(""); setItems([]); }}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSave(true)} disabled={mutation.isPending}
              className="h-8 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50">
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Save &amp; Print
            </Button>
            <Button size="sm" onClick={() => handleSave(false)} disabled={mutation.isPending}
              className="h-8 px-5 disabled:opacity-50">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Product picker modal */}
      <ProductPickerModal
        open={pickerRow !== undefined}
        initialQuery={pickerQuery}
        onClose={() => setPickerRow(undefined)}
        onPick={pickProduct}
      />
    </div>
  );
}

function SumRow({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between text-sm", className)}>
      <span className={className ? undefined : "text-gray-500 dark:text-gray-400"}>{label}</span>
      <span className={className ? undefined : "text-gray-900 dark:text-gray-100 font-medium"}>{value}</span>
    </div>
  );
}

// --- Purchase History ---

function PurchaseHistory() {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [dateFilter, setDateFilter] = useState("month");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: purchases = FALLBACK_HISTORY, isLoading } = useQuery<Purchase[]>({
    queryKey: ["purchases", dateFilter],
    queryFn: () =>
      apiClient.get("/purchases", { params: { period: dateFilter } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : FALLBACK_HISTORY;
      }),
    placeholderData: FALLBACK_HISTORY,
  });

  const { data: purchaseDetail } = useQuery<Purchase>({
    queryKey: ["purchase-detail", selectedPurchase?.id],
    queryFn: () => apiClient.get(`/purchases/${selectedPurchase!.id}`).then((r) => r.data),
    enabled: !!selectedPurchase?.id,
  });

  const suppliers = Array.from(new Set(purchases.map((p) => p.supplierName)));

  const filtered = purchases.filter((p) => {
    const matchSearch = !search || p.invoiceNo.toLowerCase().includes(search.toLowerCase()) || p.supplierName.toLowerCase().includes(search.toLowerCase());
    const matchSupplier = supplierFilter === "all" || p.supplierName === supplierFilter;
    return matchSearch && matchSupplier;
  });

  const exportCSV = () => {
    const rows = [
      ["Invoice No", "Supplier", "Date", "Items", "Amount", "Paid", "Balance", "Status"],
      ...filtered.map((p) => [p.invoiceNo, p.supplierName, p.date, p.itemCount, p.totalAmount, p.paidAmount ?? 0, p.totalAmount - (p.paidAmount ?? 0), p.status]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "purchase_history.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (s: string) =>
    STATUS_CFG[s as keyof typeof STATUS_CFG]?.color ?? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800";

  const detailData = purchaseDetail ?? selectedPurchase;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice or supplier..."
                className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Period</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 h-8 text-sm w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <SelectItem value="today" className="text-gray-900 dark:text-gray-100">Today</SelectItem>
                  <SelectItem value="week" className="text-gray-900 dark:text-gray-100">This Week</SelectItem>
                  <SelectItem value="month" className="text-gray-900 dark:text-gray-100">This Month</SelectItem>
                  <SelectItem value="custom" className="text-gray-900 dark:text-gray-100">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Supplier</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 h-8 text-sm w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <SelectItem value="all" className="text-gray-900 dark:text-gray-100">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s} className="text-gray-900 dark:text-gray-100">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}
              className="border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 h-8">
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white dark:bg-gray-900" />)}
            </div>
          ) : filtered.length === 0 ? (
            <TableEmpty
              icon={Package}
              title="No purchases found"
              description="Try adjusting your search or filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  {["Invoice #", "Supplier", "Date", "Items", "Amount", "Paid", "Balance", "Status", ""].map((h) => (
                    <TableHead key={h} className="text-gray-500 dark:text-gray-400 text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const balance = p.totalAmount - (p.paidAmount ?? 0);
                  return (
                    <TableRow key={p.id} className="border-gray-200 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 cursor-pointer"
                      onClick={() => setSelectedPurchase(p)}>
                      <TableCell className="text-gray-900 dark:text-gray-100 font-mono text-xs">{p.invoiceNo}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{p.supplierName}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{p.date}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{p.itemCount}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 font-medium text-sm">₹{p.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 text-sm">₹{(p.paidAmount ?? 0).toLocaleString()}</TableCell>
                      <TableCell className={cn("text-sm font-medium", balance > 0 ? "text-amber-600" : "text-gray-400 dark:text-gray-500")}>
                        {balance > 0 ? `₹${balance.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs capitalize", statusColor(p.status))}>
                          {STATUS_CFG[p.status as keyof typeof STATUS_CFG]?.label ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                          onClick={(e) => { e.stopPropagation(); setSelectedPurchase(p); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>Showing {filtered.length} of {purchases.length} records</span>
            <span>Total: ₹{filtered.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedPurchase} onOpenChange={(o) => !o && setSelectedPurchase(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle>Purchase — {detailData?.invoiceNo}</DialogTitle>
          </DialogHeader>
          {detailData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-gray-500 dark:text-gray-400">Supplier</p><p className="font-medium">{detailData.supplierName}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Date</p><p className="font-medium">{detailData.date}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Status</p>
                  <Badge variant="outline" className={cn("text-xs capitalize mt-1", statusColor(detailData.status))}>
                    {STATUS_CFG[detailData.status as keyof typeof STATUS_CFG]?.label ?? detailData.status}
                  </Badge>
                </div>
              </div>
              {detailData.items && detailData.items.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                        {["Medicine", "Batch", "Expiry", "Qty", "Rate", "GST", "Amount"].map((h) => (
                          <TableHead key={h} className="text-gray-500 dark:text-gray-400 text-xs">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailData.items.map((item, i) => (
                        <TableRow key={i} className="border-gray-200 dark:border-gray-800">
                          <TableCell className="text-gray-900 dark:text-gray-100 text-xs">{item.medicineName}</TableCell>
                          <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{item.batchNo}</TableCell>
                          <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{item.expiryDate}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs">{item.qty}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs">₹{item.purchaseRate}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs">{item.gstRate}%</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100 text-xs font-medium">₹{item.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end gap-8 text-sm border-t border-gray-200 dark:border-gray-800 pt-3">
                <div className="text-right"><p className="text-gray-500 dark:text-gray-400">Total GST</p><p className="font-medium">₹{(detailData.totalGst ?? 0).toFixed(2)}</p></div>
                <div className="text-right"><p className="text-gray-500 dark:text-gray-400">Paid</p><p className="text-green-600 font-medium">₹{(detailData.paidAmount ?? 0).toFixed(2)}</p></div>
                <div className="text-right"><p className="text-gray-500 dark:text-gray-400">Grand Total</p><p className="text-gray-900 dark:text-gray-100 font-bold text-base">₹{detailData.totalAmount.toFixed(2)}</p></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-white dark:bg-gray-900" />)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Main Page ---

export default function PurchasePage() {
  return (
    <PageContainer>
      <Tabs defaultValue="new" className="space-y-3">
        {/* Compact top menu bar */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
          <TabsList className="h-auto gap-1 bg-transparent p-0">
            <TabsTrigger
              value="new"
              className="rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> New Purchase
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              <Search className="mr-1 h-3.5 w-3.5" /> History
            </TabsTrigger>
          </TabsList>
          <Link
            href="/purchases/history"
            className="ml-1 flex items-center gap-1 border-b-2 border-transparent px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400"
          >
            <History className="h-3.5 w-3.5" /> Medicine History
          </Link>
          <Link
            href="/purchases/gmail-import?connect=1"
            className="flex items-center gap-1 border-b-2 border-transparent px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400"
          >
            <Mail className="h-3.5 w-3.5" /> Import from Gmail
          </Link>
          <Link
            href="/barcode"
            className="flex items-center gap-1 border-b-2 border-transparent px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400"
          >
            <Barcode className="h-3.5 w-3.5" /> Print Barcode
          </Link>
        </div>
        <TabsContent value="new"><NewPurchaseForm /></TabsContent>
        <TabsContent value="history"><PurchaseHistory /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}

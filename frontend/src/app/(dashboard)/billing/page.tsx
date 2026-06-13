"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import {
  Printer,
  Search,
  Loader2,
  UserPlus,
  Upload,
  Star,
  X,
  ShoppingCart,
  User,
  Stethoscope,
  Plus,  Calendar,
  Percent,
  ChevronDown,
  AlertTriangle,
  Wallet,
  RotateCcw,
  Home,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SlideOver } from "@/components/design-system";
import { useTabDirty } from "@/components/workspace/workspace-context";
import { InvoiceTemplate } from "@/components/common/invoice-template";
import { useStoreSettings } from "@/lib/store-settings";
import { PatientMasterForm } from "@/components/patients/patient-master-form";
import { DoctorMasterForm } from "@/components/doctors/doctor-master-form";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";

// --- Types ---
export interface MedicineSuggestion {
  id: string;
  code: string;
  name: string;
  brand: string;
  salt: string;
  packing: string;
  schedule: string;
  location: string;
  batch: string;
  expiry: string;
  mrp: number;
  rate: number;
  gstPct: number;
  stock: number;
  looseFactor?: number;
}

export interface CartItem {
  id: string;
  medicineId: string;
  code: string;
  name: string;
  brand: string;
  salt: string;
  packing: string;
  schedule: string;
  location: string;
  batch: string;
  expiry: string;
  qty: number;
  lsQty: number;
  mrp: number;
  rate: number;
  discountPct: number;
  gstPct: number;
  stock: number;
  looseFactor: number;
  amount: number;
}

export interface BatchOption {
  id: string;
  batchNumber: string;
  expiry: string;       // MM/YY
  availableQty: number;
  mrp: number;
  rate: number;
  expired: boolean;
  nearExpiry: boolean;
}

export interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  phone: string;
  bloodGroup?: string;
  loyaltyPoints: number;
  lastVisit?: string;
}

export interface DoctorOption {
  id: string;
  name: string;
  specialization?: string;
  registrationNumber?: string;
}

export type PaymentMethod = "cash" | "upi" | "card" | "credit";

// --- Helpers ---
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0");
  return `PHR-${year}-${seq}`;
}

function effectiveQty(item: { qty: number; lsQty?: number }): number {
  return item.qty + (item.lsQty ?? 0);
}

function calcItemAmount(item: CartItem): number {
  const discountedRate = item.rate * (1 - item.discountPct / 100);
  const withGst = discountedRate * (1 + item.gstPct / 100);
  return parseFloat((withGst * effectiveQty(item)).toFixed(2));
}

// GST amount on a single line (after discount, before round-off)
function lineNetGst(item: CartItem): number {
  const base = item.rate * (1 - item.discountPct / 100) * effectiveQty(item);
  return base * (item.gstPct / 100);
}

// Margin % between MRP and sale rate
function lineMargin(item: CartItem): number {
  return item.mrp > 0 ? ((item.mrp - item.rate) / item.mrp) * 100 : 0;
}

// Batch expiry is stored as "MM/YY" (e.g. "07/26"). `new Date("07/26")` would
// misparse that as Jul 26 2001, so parse it explicitly to the END of that month.
function parseExpiry(expiry: string): Date | null {
  if (!expiry) return null;
  const m = expiry.trim().match(/^(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let yr = parseInt(m[2], 10);
    if (yr < 100) yr += 2000;
    const mon = parseInt(m[1], 10); // 1-12
    if (mon < 1 || mon > 12) return null;
    return new Date(yr, mon, 0, 23, 59, 59); // day 0 of next month = last day
  }
  const d = new Date(expiry);
  return isNaN(d.getTime()) ? null : d;
}

function isExpired(expiry: string): boolean {
  const d = parseExpiry(expiry);
  return d ? d.getTime() < Date.now() : false;
}

// Near expiry = within ~3 months (90 days).
function isExpiringSoon(expiry: string): boolean {
  const d = parseExpiry(expiry);
  if (!d) return false;
  const diffDays = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 90;
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "CASH" },
  { key: "upi", label: "UPI" },
  { key: "card", label: "CARD" },
  { key: "credit", label: "CREDIT" },
];

const RUPEE = "₹";

// Footer keyboard-shortcut chips (mirrors the desktop POS reference)
const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Ctrl+A", label: "Add Detail" },
  { keys: "Ctrl+D", label: "Remove Detail" },
  { keys: "Ctrl+S", label: "Print Bill" },
  { keys: "Ctrl+Q", label: "Save" },
  { keys: "Ctrl+B", label: "Add Batch" },
  { keys: "Ctrl+E", label: "Return" },
  { keys: "Ctrl+U", label: "Pay Now" },
];

// A suggestion coming from the imported medicine reference catalog (~254k rows).
interface CatalogSuggestion {
  id: number;
  name: string;
  price: number | null;
  manufacturer: string | null;
  packing: string | null;
  genericName: string | null;
}

// Map a catalog row into the billing suggestion shape. Catalog items are not in
// local stock, so batch/expiry are empty and stock is 0; rate defaults to the
// catalog price and GST to 12%.
function mapCatalogToSuggestion(c: CatalogSuggestion): MedicineSuggestion {
  return {
    id: `cat-${c.id}`,
    code: "",
    name: c.name,
    brand: c.manufacturer ?? "",
    salt: c.genericName ?? "",
    packing: c.packing ?? "",
    schedule: "OTC",
    location: "",
    batch: "",
    expiry: "",
    mrp: c.price ?? 0,
    rate: c.price ?? 0,
    gstPct: 12,
    stock: 0,
  };
}

// --- Main Component ---
// Per-tab bill snapshot persisted to sessionStorage, keyed by the workspace
// tab id (wt) — lets each billing tab hold its own independent bill.
type BillSnapshot = {
  cart: CartItem[];
  customer: Customer | null;
  customerQuery: string;
  doctor: DoctorOption | null;
  doctorQuery: string;
  billDiscPct: number;
  remarks: string;
  homeDelivery: boolean;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  invoiceNo: string;
};
function loadBill(key: string): Partial<BillSnapshot> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(`pharma_bill_${key}`) || "{}"); } catch { return {}; }
}
function saveBill(key: string, snap: BillSnapshot) {
  try { sessionStorage.setItem(`pharma_bill_${key}`, JSON.stringify(snap)); } catch { /* ignore */ }
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingRouter />
    </Suspense>
  );
}

// Re-key the billing workspace by the tab's wt id so each tab is a separate
// React instance with its own independent state.
function BillingRouter() {
  const wt = useSearchParams().get("wt") ?? "main";
  return <BillingWorkspace key={wt} billKey={wt} />;
}

function BillingWorkspace({ billKey }: { billKey: string }) {
  const router = useRouter();

  // Store + default print format come from Settings (persisted).
  const storeSettings = useStoreSettings();

  // Invoice + date (generated on the client after mount to avoid SSR/CSR
  // hydration mismatches from Math.random()/new Date()).
  const [invoiceNo, setInvoiceNo] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  // The invoice number is NOT shown before saving — with several tabs open a
  // previewed number would be misleading. The backend assigns the authoritative
  // next-incremental number atomically on save; we read it back from the save
  // response for the toast and the printed bill.

  useEffect(() => {
    setNow(new Date());
  }, []);
  const billDate = now ? now.toISOString().slice(0, 10) : "";
  const billDateDisplay = now
    ? `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`
    : "";

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  // Always-current mirror of the cart for use inside callbacks with [] deps.
  const cartRef = useRef<CartItem[]>([]);
  cartRef.current = cart;

  // Batch selection (per cart row). `batchEditId` is the row whose batch cell is
  // active/highlighted; the dropdown lists that medicine's available batches.
  const [batchEditId, setBatchEditId] = useState<string | null>(null);
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [batchHighlight, setBatchHighlight] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);
  const activeBatchRef = useRef<HTMLDivElement>(null);
  const activeBatchTdRef = useRef<HTMLTableCellElement>(null);
  // Item that was just added and is awaiting batch confirmation — Escape on its
  // batch cell cancels the whole add (removes it from the bill).
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  // Expiry warning shown when a chosen batch is expired (blocked) or near expiry (confirm).
  const [batchWarning, setBatchWarning] = useState<
    { type: "expired" | "near"; itemId: string; batch: BatchOption } | null
  >(null);
  // Live mirrors for use inside blur/outside-click handlers (avoid stale closures).
  const pendingItemRef = useRef<string | null>(null);
  pendingItemRef.current = pendingItemId;
  const batchWarningRef = useRef(batchWarning);
  batchWarningRef.current = batchWarning;

  // Tell the workspace this tab has unsaved work once items are in the cart, so
  // navigating to another module opens a NEW tab instead of reusing this one.
  useTabDirty(cart.length > 0);

  // Barcode / search
  const [searchQuery, setSearchQuery] = useState("");
  const [codeQuery, setCodeQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [fromCatalog, setFromCatalog] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  // Visible feedback so the search box never silently does nothing.
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Patient / customer
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [walkinResults, setWalkinResults] = useState<string[]>([]);
  const [customerDropOpen, setCustomerDropOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerSearched, setCustomerSearched] = useState(false);
  const customerContainerRef = useRef<HTMLDivElement>(null);

  // Doctor
  const [doctor, setDoctor] = useState<DoctorOption | null>(null);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [doctorResults, setDoctorResults] = useState<DoctorOption[]>([]);
  const [doctorNameResults, setDoctorNameResults] = useState<string[]>([]);
  const [doctorDropOpen, setDoctorDropOpen] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorSearched, setDoctorSearched] = useState(false);
  const doctorContainerRef = useRef<HTMLDivElement>(null);

  // Prescription
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);

  // Inline "Add Patient" / "Add Doctor" master-form modals
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);

  // Bill-level discount
  const [billDiscPct, setBillDiscPct] = useState<number>(0);

  // Remarks + delivery
  const [remarks, setRemarks] = useState("");
  const [homeDelivery, setHomeDelivery] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const receivedRef = useRef<HTMLInputElement>(null);

  // Save
  const [saving, setSaving] = useState(false);
  // When set, this tab is editing an existing bill (save → update, not create).
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  // -- Per-tab persistence: restore THIS tab's bill on mount, save on change.
  // Each billing tab (keyed by its workspace id) keeps an independent bill.
  // `hydrated` is STATE (not a ref) so the save effect only starts AFTER the
  // restored values have rendered — otherwise it would overwrite the saved
  // bill with the empty initial state on the first commit.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const s = loadBill(billKey);
    if (s.cart) setCart(s.cart);
    if (s.customer !== undefined) setCustomer(s.customer);
    if (s.customerQuery !== undefined) setCustomerQuery(s.customerQuery);
    if (s.doctor !== undefined) setDoctor(s.doctor);
    if (s.doctorQuery !== undefined) setDoctorQuery(s.doctorQuery);
    if (s.billDiscPct !== undefined) setBillDiscPct(s.billDiscPct);
    if (s.remarks !== undefined) setRemarks(s.remarks);
    if (s.homeDelivery !== undefined) setHomeDelivery(s.homeDelivery);
    if (s.paymentMethod !== undefined) setPaymentMethod(s.paymentMethod);
    if (s.amountPaid !== undefined) setAmountPaid(s.amountPaid);
    if (s.invoiceNo) setInvoiceNo(s.invoiceNo);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveBill(billKey, {
      cart, customer, customerQuery, doctor, doctorQuery,
      billDiscPct, remarks, homeDelivery, paymentMethod, amountPaid, invoiceNo,
    });
  }, [hydrated, billKey, cart, customer, customerQuery, doctor, doctorQuery, billDiscPct, remarks, homeDelivery, paymentMethod, amountPaid, invoiceNo]);

  // -- Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // -- Load a saved bill for editing (opened from Sales History → Edit).
  useEffect(() => {
    let data: any;
    try {
      const raw = sessionStorage.getItem("pharma_edit_sale");
      if (!raw) return;
      sessionStorage.removeItem("pharma_edit_sale");
      data = JSON.parse(raw);
    } catch {
      return;
    }
    setEditingSaleId(data.saleId ?? null);
    if (data.invoiceNumber) setInvoiceNo(String(data.invoiceNumber));
    if (data.customerName) setCustomerQuery(String(data.customerName));
    if (data.doctorName) setDoctorQuery(String(data.doctorName));
    if (data.paymentMethod) setPaymentMethod(String(data.paymentMethod) as PaymentMethod);
    const loaded: CartItem[] = (Array.isArray(data.items) ? data.items : []).map(
      (it: any, i: number) => {
        const item: CartItem = {
          id: `${it.medicineId}-${it.batch ?? ""}-${i}`,
          medicineId: it.medicineId,
          code: it.code ?? "",
          name: it.name ?? "Item",
          brand: "",
          salt: "",
          packing: "",
          schedule: "",
          location: "",
          batch: it.batch ?? "",
          expiry: it.expiry ?? "",
          qty: Number(it.qty ?? 1),
          lsQty: 0,
          mrp: Number(it.mrp ?? 0),
          rate: Number(it.rate ?? 0),
          discountPct: Number(it.discountPct ?? 0),
          gstPct: Number(it.gstPct ?? 0),
          // Real stock is unknown until we fetch batches below; seed with this
          // line's qty so the "Stock" (remaining) column reads 0, not a negative.
          stock: Number(it.stock ?? it.qty ?? 0),
          looseFactor: Number(it.looseFactor ?? 1),
          amount: 0,
        };
        item.amount = calcItemAmount(item);
        return item;
      }
    );
    if (loaded.length) {
      setCart(loaded);
      // Enrich each line with its batch's current available stock so the
      // remaining-stock column reflects real inventory, not a placeholder.
      const ids = Array.from(new Set(loaded.map((l) => l.medicineId).filter(Boolean)));
      Promise.all(
        ids.map((id) =>
          apiClient
            .get(`/medicines/${id}/batches`)
            .then((r) => ({ id, batches: Array.isArray(r.data) ? r.data : [] }))
            .catch(() => ({ id, batches: [] as BatchOption[] }))
        )
      ).then((results) => {
        const byId = new Map(results.map((r) => [r.id, r.batches]));
        setCart((prev) =>
          prev.map((it) => {
            const opts = byId.get(it.medicineId) as BatchOption[] | undefined;
            if (!opts || !opts.length) return it;
            const match = opts.find((o) => o.batchNumber === it.batch) ?? opts[0];
            return { ...it, stock: match.availableQty ?? it.stock };
          })
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Click outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(t)) {
        setSuggestionsOpen(false);
      }
      if (customerContainerRef.current && !customerContainerRef.current.contains(t)) {
        setCustomerDropOpen(false);
      }
      if (doctorContainerRef.current && !doctorContainerRef.current.contains(t)) {
        setDoctorDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // -- Debounced medicine search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setFromCatalog(false);
      setSearchMsg(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const q = searchQuery.trim();
        const res = await apiClient.get(`/medicines/search?q=${encodeURIComponent(q)}`);
        let data: MedicineSuggestion[] = res.data?.data ?? res.data ?? [];
        let catalog = false;
        if (data.length === 0) {
          // Not in local stock — fall back to the full medicine catalog so any
          // medicine name can still be found and added.
          const cat = await apiClient.get(
            `/medicine-catalog/suggest?q=${encodeURIComponent(q)}&limit=15`
          );
          const items: CatalogSuggestion[] = cat.data ?? [];
          data = items.map(mapCatalogToSuggestion);
          catalog = data.length > 0;
        }
        setFromCatalog(catalog);
        setSuggestions(data);
        setSuggestionsOpen(data.length > 0);
        setHighlightedIdx(0);
        setSearchMsg(data.length === 0 ? `No medicine found for "${q}"` : null);
      } catch (err: unknown) {
        setSuggestions([]);
        setSuggestionsOpen(false);
        setFromCatalog(false);
        const status = (err as { response?: { status?: number } })?.response?.status;
        setSearchMsg(
          status === 401
            ? "Your session expired — please sign in again to search."
            : "Search failed — check your connection and try again."
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // -- Patient search (auto-search the database by name / phone)
  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      setWalkinResults([]);
      setCustomerDropOpen(false);
      setCustomerSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const [regRes, walkRes] = await Promise.all([
          apiClient.get(`/customers?search=${encodeURIComponent(customerQuery)}`),
          apiClient
            .get(`/sales/walkin-names?q=${encodeURIComponent(customerQuery)}`)
            .catch(() => ({ data: [] as string[] })),
        ]);
        const reg: Customer[] = regRes.data?.data ?? regRes.data?.customers ?? regRes.data ?? [];
        setCustomerResults(reg);
        // Walk-in names from past bills, minus any that match a registered patient.
        const regNames = new Set(reg.map((c) => c.name.trim().toLowerCase()));
        const walk: string[] = (Array.isArray(walkRes.data) ? walkRes.data : []).filter(
          (n: string) => n && !regNames.has(n.trim().toLowerCase())
        );
        setWalkinResults(walk);
        setCustomerDropOpen(true);
        setCustomerSearched(true);
      } catch {
        setCustomerResults([]);
        setWalkinResults([]);
        setCustomerSearched(true);
      } finally {
        setCustomerLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  // -- Doctor search (auto-search the doctor master by name)
  useEffect(() => {
    if (!doctorQuery.trim()) {
      setDoctorResults([]);
      setDoctorNameResults([]);
      setDoctorDropOpen(false);
      setDoctorSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      setDoctorLoading(true);
      try {
        const [regRes, pastRes] = await Promise.all([
          apiClient.get(`/doctors?search=${encodeURIComponent(doctorQuery)}`),
          apiClient
            .get(`/sales/doctor-names?q=${encodeURIComponent(doctorQuery)}`)
            .catch(() => ({ data: [] as string[] })),
        ]);
        const reg: DoctorOption[] = regRes.data?.doctors ?? regRes.data?.data ?? regRes.data ?? [];
        setDoctorResults(reg);
        // Past unregistered doctor names, minus any matching a registered doctor.
        const regNames = new Set(reg.map((d) => d.name.trim().toLowerCase()));
        const past: string[] = (Array.isArray(pastRes.data) ? pastRes.data : []).filter(
          (n: string) => n && !regNames.has(n.trim().toLowerCase())
        );
        setDoctorNameResults(past);
        setDoctorDropOpen(true);
        setDoctorSearched(true);
      } catch {
        setDoctorResults([]);
        setDoctorNameResults([]);
        setDoctorSearched(true);
      } finally {
        setDoctorLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [doctorQuery]);

  // -- Batch selection -------------------------------------------------------
  // Load a medicine's sellable batches and make the row's batch cell active.
  // Holds the latest chooseBatch so openBatchSelect (defined earlier) can call it.
  const chooseBatchRef = useRef<(itemId: string, b: BatchOption) => void>();

  const openBatchSelect = useCallback(
    async (
      itemId: string,
      medicineId: string,
      currentBatch: string,
      openDropdown: boolean,
      autoSelectSingle = false,
    ) => {
      setBatchEditId(itemId);
      setBatchDropdownOpen(openDropdown);
      setBatchHighlight(0);
      // Reference-catalog items (cat-…) have no real batches in stock yet.
      if (medicineId.startsWith("cat-")) {
        setBatchOptions([]);
        return;
      }
      setBatchLoading(true);
      setBatchOptions([]);
      try {
        const res = await apiClient.get(`/medicines/${medicineId}/batches`);
        const opts: BatchOption[] = Array.isArray(res.data) ? res.data : [];
        setBatchOptions(opts);
        const idx = opts.findIndex((o) => o.batchNumber === currentBatch);
        setBatchHighlight(idx >= 0 ? idx : 0);
        // Only one batch available → confirm it immediately (no ↓ + Enter needed).
        if (autoSelectSingle && opts.length === 1) {
          chooseBatchRef.current?.(itemId, opts[0]);
        }
      } catch {
        setBatchOptions([]);
      } finally {
        setBatchLoading(false);
      }
    },
    []
  );

  // Apply a chosen batch (and its rate/mrp/stock) to the row, then close.
  const applyBatch = useCallback((itemId: string, b: BatchOption) => {
    setCart((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = {
          ...it,
          batch: b.batchNumber,
          expiry: b.expiry,
          mrp: b.mrp,
          rate: b.rate,
          stock: b.availableQty,
        };
        updated.amount = calcItemAmount(updated);
        return updated;
      })
    );
    setBatchEditId(null);
    setBatchDropdownOpen(false);
    setBatchOptions([]);
    setPendingItemId(null);
    setBatchWarning(null);
    setTimeout(() => searchRef.current?.focus(), 30);
  }, []);

  // Validate a chosen batch before applying: block expired, confirm near-expiry.
  const chooseBatch = useCallback(
    (itemId: string, b: BatchOption) => {
      if (b.expired) {
        setBatchWarning({ type: "expired", itemId, batch: b });
        return;
      }
      if (b.nearExpiry) {
        setBatchWarning({ type: "near", itemId, batch: b });
        return;
      }
      applyBatch(itemId, b);
    },
    [applyBatch]
  );
  chooseBatchRef.current = chooseBatch;

  // Cancel a just-added product that hasn't been confirmed (Escape on its batch cell).
  const cancelPendingAdd = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((it) => it.id !== itemId));
    setPendingItemId(null);
    setBatchEditId(null);
    setBatchDropdownOpen(false);
    setBatchOptions([]);
    setBatchWarning(null);
    setTimeout(() => searchRef.current?.focus(), 30);
  }, []);

  // -- Add medicine to cart
  const addMedicineToCart = useCallback(
    (med: MedicineSuggestion, opts?: { selectBatch?: boolean }) => {
      // Out-of-stock items cannot be billed — add stock via a purchase first.
      if ((med.stock ?? 0) <= 0) {
        const msg = `"${med.name}" is OUT OF STOCK — not added. Receive stock via a purchase first.`;
        toast.error(msg, { duration: 4000 });
        // NB: don't clear searchQuery here — doing so re-runs the search effect
        // and wipes this message. Just close the dropdown and show the warning.
        setSuggestions([]);
        setSuggestionsOpen(false);
        setSearchMsg(msg);
        setTimeout(() => searchRef.current?.focus(), 30);
        return false;
      }
      const prev = cartRef.current;
      const existing = prev.find((i) => i.medicineId === med.id && i.batch === med.batch);
      let targetId: string;
      if (existing) {
        targetId = existing.id;
        setCart((c) =>
          c.map((i) => {
            if (i.id !== existing.id) return i;
            // Don't let repeated scans push quantity past the available stock.
            if (i.stock > 0 && i.qty >= i.stock) {
              toast.error(`Only ${i.stock} in stock for "${i.name}".`, { duration: 3000 });
              return i;
            }
            const updated = { ...i, qty: i.qty + 1 };
            updated.amount = calcItemAmount(updated);
            return updated;
          })
        );
      } else {
        const newItem: CartItem = {
          id: `${med.id}-${med.batch}-${Date.now()}`,
          medicineId: med.id,
          code: med.code ?? "",
          name: med.name,
          brand: med.brand ?? "",
          salt: med.salt ?? "",
          packing: med.packing ?? "",
          schedule: med.schedule ?? "",
          location: med.location ?? "",
          batch: med.batch,
          expiry: med.expiry,
          qty: 1,
          lsQty: 0,
          mrp: med.mrp,
          rate: med.rate,
          discountPct: 0,
          gstPct: med.gstPct,
          stock: med.stock ?? 0,
          looseFactor: med.looseFactor ?? 1,
          amount: 0,
        };
        newItem.amount = calcItemAmount(newItem);
        targetId = newItem.id;
        setCart((c) => [...c, newItem]);
      }
      setSearchQuery("");
      setSuggestions([]);
      setSuggestionsOpen(false);

      if (opts?.selectBatch && !existing) {
        // Manual entry of a NEW line: highlight the batch cell, preload batches,
        // and mark it pending so Escape cancels the whole add.
        setPendingItemId(targetId);
        setTimeout(() => {
          // autoSelectSingle: if the item has exactly one batch, it's confirmed
          // straight away instead of waiting for ↓ + Enter.
          openBatchSelect(targetId, med.id, med.batch, false, true);
          setTimeout(() => activeBatchRef.current?.focus(), 40);
        }, 50);
      } else {
        // Barcode scan, or an existing line incremented: just keep scanning.
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      return true;
    },
    [openBatchSelect]
  );

  // Keyboard control for the active batch cell.
  const handleBatchKeyDown = (e: KeyboardEvent<HTMLDivElement>, item: CartItem) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!batchDropdownOpen) {
        openBatchSelect(item.id, item.medicineId, item.batch, true);
      } else {
        setBatchHighlight((h) => Math.min(h + 1, Math.max(0, batchOptions.length - 1)));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setBatchHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (batchDropdownOpen && batchOptions[batchHighlight]) {
        chooseBatch(item.id, batchOptions[batchHighlight]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (pendingItemId === item.id) {
        // Cancel the just-added product entirely — nothing stays in the bill.
        cancelPendingAdd(item.id);
      } else {
        setBatchDropdownOpen(false);
      }
    }
  };

  // Clicking outside the active batch cell cancels an unconfirmed add (the
  // product must have a batch chosen to stay in the bill); for an already-saved
  // line being re-edited it just closes the dropdown.
  useEffect(() => {
    if (!batchDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (activeBatchTdRef.current && !activeBatchTdRef.current.contains(e.target as Node)) {
        if (batchWarningRef.current) return; // clicking the expiry warning modal
        if (pendingItemRef.current) {
          cancelPendingAdd(pendingItemRef.current);
        } else {
          setBatchDropdownOpen(false);
          setBatchEditId(null);
        }
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [batchDropdownOpen, cancelPendingAdd]);

  // -- Barcode Enter key
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestionsOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIdx((h) => Math.min(h + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIdx((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (addMedicineToCart(suggestions[highlightedIdx], { selectBatch: true }))
          toast.success(`Added: ${suggestions[highlightedIdx].name}`);
        return;
      }
      if (e.key === "Escape") {
        setSuggestionsOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();
      searchAndAdd(searchQuery.trim(), () => setSearchQuery(""));
    }
  };

  // Look up a medicine (by name, barcode or item code) and add the first match.
  const searchAndAdd = (query: string, onDone?: () => void) => {
    (async () => {
      setSearchLoading(true);
      try {
        const res = await apiClient.get(`/medicines/search?q=${encodeURIComponent(query)}`);
        const data: MedicineSuggestion[] = res.data?.data ?? res.data ?? [];
        if (data.length > 0) {
          if (addMedicineToCart(data[0], { selectBatch: true }))
            toast.success(`Added: ${data[0].name}`);
        } else {
          toast.error("Item not found");
        }
      } catch {
        toast.error("Search failed");
      } finally {
        setSearchLoading(false);
        onDone?.();
      }
    })();
  };

  // -- Cart operations
  const updateCartItem = useCallback(
    (id: string, changes: Partial<CartItem>) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, ...changes };
          updated.amount = calcItemAmount(updated);
          return updated;
        })
      );
    },
    []
  );

  const removeCartItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // -- Totals
  const totalItems = cart.length;
  const totalQty = cart.reduce((s, i) => s + effectiveQty(i), 0);
  const subtotal = cart.reduce(
    (s, i) => s + i.rate * (1 - i.discountPct / 100) * effectiveQty(i),
    0
  );
  const lineDiscountTotal = cart.reduce(
    (s, i) => s + (i.mrp - i.rate * (1 - i.discountPct / 100)) * effectiveQty(i),
    0
  );
  const totalGst = cart.reduce((s, i) => s + lineNetGst(i), 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const mrpValue = cart.reduce((s, i) => s + i.mrp * effectiveQty(i), 0);
  const overallMargin = mrpValue > 0 ? ((mrpValue - subtotal) / mrpValue) * 100 : 0;

  const billDiscountAmount = subtotal * (billDiscPct / 100);
  const preRound = Math.max(0, subtotal - billDiscountAmount + totalGst);
  const grandTotal = Math.round(preRound);
  const roundOff = grandTotal - preRound;
  const discRupee = lineDiscountTotal + billDiscountAmount;
  const selectedTotal = subtotal;
  const received = amountPaid;
  const outstanding = grandTotal - received;

  // -- Clear bill
  const clearBill = useCallback(() => {
    setCart([]);
    setCustomer(null);
    setCustomerQuery("");
    setCustomerResults([]);
    setWalkinResults([]);
    setCustomerSearched(false);
    setDoctor(null);
    setDoctorQuery("");
    setDoctorResults([]);
    setDoctorNameResults([]);
    setDoctorSearched(false);
    setBillDiscPct(0);
    setRemarks("");
    setHomeDelivery(false);
    setPaymentMethod("cash");
    setAmountPaid(0);
    setPrescriptionFile(null);
    setSearchQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    // Start a fresh bill: clear the (post-save) invoice number, exit edit mode.
    setInvoiceNo("");
    setEditingSaleId(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  // -- Save
  const handleSave = useCallback(
    async (print = false) => {
      if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
      }
      setSaving(true);
      try {
        // Items found via the reference catalog have ids like "cat-…" and don't
        // exist in the medicines table yet. Create a real medicine for each so
        // the sale's foreign keys resolve (future searches then find it locally).
        const catalogMap: Record<string, string> = {};
        for (const i of cart) {
          if (!i.medicineId.startsWith("cat-") || catalogMap[i.medicineId]) continue;
          const created = await apiClient.post("/medicines", {
            name: i.name,
            saltComposition: i.salt || null,
            manufacturer: i.brand || null,
            packing: i.packing || null,
            category: "TABLET",
            gstRate: i.gstPct,
            mrp: i.mrp || i.rate || 1,
            purchaseRate: i.rate || i.mrp || 1,
            saleRate: i.rate || i.mrp || 1,
            hsnCode: i.code || null,
          });
          const newId = created.data?.id ?? created.data?.medicine?.id;
          if (newId) catalogMap[i.medicineId] = newId;
        }

        // Payload shaped to match the backend POST /sales contract.
        const payload = {
          // Only send a real, saved customer (null for walk-in).
          customerId: customer?.id && customer.id !== "walkin" ? customer.id : null,
          // Always store a patient name — the selected patient's, or the typed
          // walk-in name — so the invoice keeps it even without a registration.
          customerName: customer?.name ?? (customerQuery.trim() || null),
          doctorName: doctor?.name ?? (doctorQuery.trim() || null),
          paymentMode: paymentMethod, // backend maps to the PaymentMethod enum
          items: cart.map((i) => {
            const q = effectiveQty(i);
            return {
              medicineId: catalogMap[i.medicineId] ?? i.medicineId,
              quantity: q,
              // GST-inclusive, discounted per-unit price so the stored total
              // matches the Total shown on screen.
              salePrice: parseFloat((i.amount / q).toFixed(2)),
              mrp: i.mrp,
              taxRate: i.gstPct,
              discountPct: i.discountPct,
            };
          }),
          discountAmount: parseFloat(billDiscountAmount.toFixed(2)),
          gstAmount: parseFloat(totalGst.toFixed(2)),
          roundOff: parseFloat(roundOff.toFixed(2)),
          paidAmount: amountPaid || grandTotal,
          changeAmount: parseFloat(Math.max(0, received - grandTotal).toFixed(2)),
          notes: remarks || null,
        };
        let savedInvoice = invoiceNo;
        if (editingSaleId) {
          const res = await apiClient.put(`/sales/${editingSaleId}`, payload);
          savedInvoice = res.data?.invoiceNumber ?? savedInvoice;
        } else {
          const res = await apiClient.post("/sales", payload);
          savedInvoice = res.data?.invoiceNumber ?? savedInvoice;
        }
        // The backend assigns the authoritative, next-incremental invoice number
        // on save — use it for the toast and the printed bill (flushSync so the
        // hidden print template re-renders with it before window.print()).
        if (savedInvoice) flushSync(() => setInvoiceNo(String(savedInvoice)));

        // If a prescription image was attached and a real (saved) patient is
        // selected, store it against that patient.
        if (prescriptionFile && customer?.id && customer.id !== "walkin") {
          try {
            const token = localStorage.getItem("pharma_access_token");
            const fd = new FormData();
            fd.append("file", prescriptionFile);
            fd.append("customerId", customer.id);
            if (doctor?.id) fd.append("doctorId", doctor.id);
            const presRes = await fetch("/api/v1/prescriptions", {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: fd,
            });
            if (!presRes.ok) throw new Error("upload failed");
          } catch {
            toast.warning("Bill saved, but the prescription image could not be stored.");
          }
        } else if (prescriptionFile && (!customer?.id || customer.id === "walkin")) {
          toast.warning("Select a saved patient to store the prescription image.");
        }

        toast.success(
          `${editingSaleId ? "Bill updated" : "Bill saved"}${savedInvoice ? ` — ${savedInvoice}` : ""}`
        );
        if (print) window.print();
        clearBill();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Save failed";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [
      cart,
      invoiceNo,
      billDate,
      customer,
      customerQuery,
      doctor,
      doctorQuery,
      remarks,
      paymentMethod,
      billDiscountAmount,
      totalGst,
      roundOff,
      grandTotal,
      amountPaid,
      received,
      prescriptionFile,
      editingSaleId,
      clearBill,
    ]
  );

  // -- Global keyboard shortcuts (desktop POS style)
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const isEditable =
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "F8") {
        e.preventDefault();
        if (cart.length > 0 && !saving) handleSave(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0 && !saving) handleSave(false);
      } else if (e.key === "F2") {
        e.preventDefault();
        clearBill();
      } else if (ctrl && e.key.toLowerCase() === "a" && !isEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (ctrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setCart((prev) => prev.slice(0, -1));
      } else if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (cart.length > 0 && !saving) handleSave(true);
      } else if (ctrl && e.key.toLowerCase() === "q") {
        e.preventDefault();
        if (cart.length > 0 && !saving) handleSave(false);
      } else if (ctrl && e.key.toLowerCase() === "u") {
        e.preventDefault();
        receivedRef.current?.focus();
        receivedRef.current?.select();
      } else if (ctrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toast.info("Batch is selected automatically from available stock.");
      } else if (ctrl && e.key.toLowerCase() === "e") {
        e.preventDefault();
        router.push("/sales");
      } else if (e.key === "Escape") {
        setSuggestionsOpen(false);
        setCustomerDropOpen(false);
        setDoctorDropOpen(false);
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart.length, saving, handleSave, clearBill, router]);

  // -- Open the inline master-form modals to add a new patient / doctor
  const openAddPatient = () => {
    setCustomerDropOpen(false);
    setPatientModalOpen(true);
  };
  const openAddDoctor = () => {
    setDoctorDropOpen(false);
    setDoctorModalOpen(true);
  };

  // -- A patient was created in the modal → select it on the bill
  const handlePatientCreated = (created?: Record<string, unknown>) => {
    setPatientModalOpen(false);
    if (!created) return;
    const bloodToken = (created.bloodGroup as string) ?? "";
    setCustomer({
      id: String(created.id ?? ""),
      customerCode: (created.customerCode as string) ?? undefined,
      name: (created.name as string) ?? customerQuery.trim(),
      phone: (created.phone as string) ?? "",
      bloodGroup: bloodToken && !bloodToken.includes("_") ? bloodToken : undefined,
      loyaltyPoints: Number(created.loyaltyPoints ?? 0),
    });
    setCustomerQuery("");
    setCustomerResults([]);
    setWalkinResults([]);
    setCustomerSearched(false);
  };

  // -- A doctor was created in the modal → select it on the bill
  const handleDoctorCreated = (created?: Record<string, unknown>) => {
    setDoctorModalOpen(false);
    if (!created) return;
    setDoctor({
      id: String(created.id ?? ""),
      name: (created.name as string) ?? doctorQuery.trim(),
      specialization: (created.specialization as string) ?? undefined,
      registrationNumber:
        (created.registration as string) ?? (created.licenseNo as string) ?? undefined,
    });
    setDoctorQuery("");
    setDoctorResults([]);
    setDoctorNameResults([]);
    setDoctorSearched(false);
  };

  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-950 select-none text-sm">
      {/* ===================== HEADER: Patient / Bill To / Doctor + bill fields ===================== */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 shadow-sm print:hidden shrink-0">
        <div className="flex flex-wrap items-end gap-2.5 px-3 py-2">
          {/* Patient */}
          <div className="flex-1 min-w-[230px]" ref={customerContainerRef}>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-0.5">
              <User className="w-3 h-3" /> Patient
            </label>
            {customer ? (
              <div className="relative bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded-md px-2.5 py-1 h-8 flex items-center">
                <div className="flex items-center gap-2 pr-5 flex-wrap min-w-0">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{customer.name}</span>
                  {customer.phone && <span className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</span>}
                  {customer.bloodGroup && (
                    <span className="bg-red-100 dark:bg-red-950/40 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                      {customer.bloodGroup}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCustomer(null);
                    setCustomerQuery("");
                  }}
                  className="absolute top-1/2 -translate-y-1/2 right-2 text-gray-400 dark:text-gray-500 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                {customerLoading && (
                  <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 animate-spin" />
                )}
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  onFocus={() => customerResults.length > 0 && setCustomerDropOpen(true)}
                  placeholder="Search patient (name / mobile)..."
                  className="w-full h-8 pl-7 pr-8 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                />
                <button
                  onClick={openAddPatient}
                  title="Add new patient"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {customerDropOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg shadow-xl max-h-56 overflow-auto">
                    {(customerResults.length > 0 || walkinResults.length > 0) ? (
                      <>
                        {customerResults.map((c) => (
                          <button
                            key={c.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCustomer(c);
                              setCustomerQuery("");
                              setCustomerResults([]);
                              setWalkinResults([]);
                              setCustomerDropOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 border-b dark:border-gray-800 last:border-0 flex justify-between items-center"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
                                <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">Registered</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</div>
                            </div>
                          </button>
                        ))}
                        {walkinResults.map((name) => (
                          <button
                            key={`walk-${name}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCustomer({ id: "walkin", name, phone: "", loyaltyPoints: 0 });
                              setCustomerQuery("");
                              setCustomerResults([]);
                              setWalkinResults([]);
                              setCustomerDropOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-800 last:border-0 flex justify-between items-center"
                          >
                            <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-300">{name}</span>
                            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">Walk-in</span>
                          </button>
                        ))}
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={openAddPatient}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium flex items-center gap-2 border-t dark:border-gray-800"
                        >
                          <UserPlus className="w-4 h-4" /> Add a new patient
                        </button>
                      </>
                    ) : customerLoading ? (
                      <div className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500">Searching…</div>
                    ) : customerSearched ? (
                      <div className="p-2">
                        <p className="px-1 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No patient found for &quot;{customerQuery.trim()}&quot;.
                        </p>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            setCustomer({ id: "walkin", name: customerQuery.trim() || "Walk-in Customer", phone: "", loyaltyPoints: 0 })
                          }
                          className="w-full flex items-center justify-between gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded"
                        >
                          <span className="truncate">Use &quot;{customerQuery.trim() || "Walk-in Customer"}&quot; as walk-in</span>
                          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">Walk-in</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctor */}
          <div className="flex-1 min-w-[200px]" ref={doctorContainerRef}>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-0.5">
              <Stethoscope className="w-3 h-3" /> Doctor
            </label>
            {doctor ? (
              <div className="relative bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-md px-2.5 py-1 h-8 flex items-center">
                <div className="flex items-center gap-2 pr-5 flex-wrap min-w-0">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{doctor.name}</span>
                  {doctor.specialization && (
                    <span className="text-[11px] text-emerald-700 truncate">{doctor.specialization}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setDoctor(null);
                    setDoctorQuery("");
                  }}
                  className="absolute top-1/2 -translate-y-1/2 right-2 text-gray-400 dark:text-gray-500 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                {doctorLoading && (
                  <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 animate-spin" />
                )}
                <input
                  value={doctorQuery}
                  onChange={(e) => setDoctorQuery(e.target.value)}
                  onFocus={() => doctorResults.length > 0 && setDoctorDropOpen(true)}
                  placeholder="Search doctor..."
                  className="w-full h-8 pl-7 pr-8 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                />
                <button
                  onClick={openAddDoctor}
                  title="Add new doctor"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {doctorDropOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg shadow-xl max-h-56 overflow-auto">
                    {(doctorResults.length > 0 || doctorNameResults.length > 0) ? (
                      <>
                        {doctorResults.map((d) => (
                          <button
                            key={d.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setDoctor(d);
                              setDoctorQuery("");
                              setDoctorResults([]);
                              setDoctorNameResults([]);
                              setDoctorDropOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-b dark:border-gray-800 last:border-0"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{d.name}</span>
                              <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">Registered</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {[d.specialization, d.registrationNumber].filter(Boolean).join(" • ")}
                            </div>
                          </button>
                        ))}
                        {doctorNameResults.map((name) => (
                          <button
                            key={`doc-${name}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setDoctor({ id: "unregistered", name });
                              setDoctorQuery("");
                              setDoctorResults([]);
                              setDoctorNameResults([]);
                              setDoctorDropOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-800 last:border-0 flex justify-between items-center"
                          >
                            <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-300">{name}</span>
                            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">Unregistered</span>
                          </button>
                        ))}
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={openAddDoctor}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium flex items-center gap-2 border-t dark:border-gray-800"
                        >
                          <Plus className="w-4 h-4" /> Add a new doctor
                        </button>
                      </>
                    ) : doctorLoading ? (
                      <div className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500">Searching…</div>
                    ) : doctorSearched ? (
                      <div className="p-2">
                        <p className="px-1 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No doctor found for &quot;{doctorQuery.trim()}&quot;.
                        </p>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setDoctor({ id: "unregistered", name: doctorQuery.trim() });
                            setDoctorDropOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded"
                        >
                          <span className="truncate">Use &quot;{doctorQuery.trim()}&quot; as doctor</span>
                          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">Unregistered</span>
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={openAddDoctor}
                          className="mt-1 w-full text-left px-2 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium flex items-center gap-2 rounded"
                        >
                          <Plus className="w-4 h-4" /> Add Doctor (opens Doctor Master)
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date — auto-filled with today's date */}
          <div className="w-32">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3" /> Date
            </label>
            <div className="h-8 px-2 flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-300">
              {billDateDisplay}
            </div>
          </div>

          {/* Discount % */}
          <div className="w-20">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-0.5">
              <Percent className="w-3 h-3" /> Discount
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={billDiscPct || ""}
              onChange={(e) =>
                setBillDiscPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
              }
              placeholder="0"
              className="w-full h-8 px-2 text-sm text-right bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>

          {/* Prescription upload */}
          <div className="w-40">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-0.5">
              <Upload className="w-3 h-3" /> Prescription
            </label>
            <label className="cursor-pointer">
              <div className="flex items-center gap-1.5 h-8 px-2 text-xs border border-dashed border-gray-300 dark:border-gray-700 rounded-md hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-600 dark:text-gray-400 truncate">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {prescriptionFile
                    ? prescriptionFile.name
                    : "Upload"}
                </span>
              </div>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setPrescriptionFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </header>

      {/* ===================== MEDICINE GRID (middle, fills) ===================== */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
        {/* Medicine search box — placed ABOVE the column headers */}
        <div className="relative shrink-0 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900 px-3 py-2" ref={searchContainerRef}>
          <div className="flex gap-2">
            {/* Search by item code */}
            <div className="relative w-32 shrink-0">
              <input
                value={codeQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCodeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && codeQuery.trim()) {
                    e.preventDefault();
                    searchAndAdd(codeQuery.trim(), () => setCodeQuery(""));
                  }
                }}
                placeholder="Item code…"
                className="w-full h-9 px-2 text-sm bg-white dark:bg-gray-900 border border-green-300 dark:border-green-900 rounded focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {/* Search by name / barcode */}
            <div className="relative flex-1">
              <Plus className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600 pointer-events-none" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                placeholder="Search Medicine — type a name or scan barcode, then Enter…"
                className="w-full h-9 pl-8 pr-8 text-sm bg-white dark:bg-gray-900 border border-green-300 dark:border-green-900 rounded focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none font-medium"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {searchLoading && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
              )}
            </div>
          </div>
          <div
            className={`mt-1 text-[11px] ${
              searchMsg && !suggestionsOpen
                ? searchMsg.startsWith("Your session") || /out of stock/i.test(searchMsg)
                  ? "text-red-600 font-semibold"
                  : "text-orange-700"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {searchLoading
              ? "Searching the medicine database…"
              : suggestionsOpen && suggestions.length > 0
              ? fromCatalog
                ? `${suggestions.length} catalog match(es) — added at catalog price · click or Enter`
                : `${suggestions.length} match(es) — click a row below or press Enter`
              : searchMsg
              ? searchMsg
              : "Scan a barcode or type a name to add a medicine"}
          </div>

          {/* Suggestions dropdown (under the search box) */}
          {suggestionsOpen && suggestions.length > 0 && (
            <div className="absolute z-30 left-3 right-3 top-full -mt-px bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900 rounded-b-lg shadow-xl max-h-72 overflow-auto">
              {suggestions.map((med, idx) => (
                <button
                  key={`sug-${med.id}-${med.batch}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (addMedicineToCart(med, { selectBatch: true }))
                      toast.success(`Added: ${med.name}`);
                  }}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  className={`w-full text-left px-3 py-1.5 border-b dark:border-gray-800 last:border-0 flex items-center gap-2 text-xs ${
                    idx === highlightedIdx ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="flex-1 min-w-0 truncate">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{med.name}</span>
                    {med.brand && <span className="text-blue-600 ml-1">{med.brand}</span>}
                    {med.packing && <span className="text-gray-400 dark:text-gray-500 ml-1">{med.packing}</span>}
                  </span>
                  <span className="w-24 shrink-0 font-mono text-gray-600 dark:text-gray-400 truncate">{med.batch || "-"}</span>
                  <span className="w-20 shrink-0 text-gray-600 dark:text-gray-400">{med.expiry || "-"}</span>
                  <span className="w-20 shrink-0 text-right text-gray-700 dark:text-gray-300">{RUPEE}{med.mrp.toFixed(2)}</span>
                  <span className="w-20 shrink-0 text-right text-gray-500 dark:text-gray-400">
                    {med.gstPct}%
                    {med.stock === 0 ? (
                      <span className="text-red-600 ml-1">Out</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 ml-1">·{med.stock}</span>
                    )}
                  </span>
                  <span className="w-10 shrink-0 text-right text-blue-600 font-medium">Add</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable detail table with sticky headers (below the search box) */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-xs min-w-[980px]">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left font-semibold w-12">Sr.No</th>
                <th className="px-2 py-2 text-left font-semibold w-16">Code</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[220px]">Medicine</th>
                <th className="px-2 py-2 text-left font-semibold w-28">Batch</th>
                <th className="px-2 py-2 text-left font-semibold w-24">Expiry</th>
                <th className="px-2 py-2 text-center font-semibold w-20">Margin%</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Disc%</th>
                <th className="px-1 py-2 text-center font-semibold w-14">Qty</th>
                <th className="px-1 py-2 text-center font-semibold w-14">Loose</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Stock</th>
                <th className="px-2 py-2 text-right font-semibold w-20">MRP</th>
                <th className="px-2 py-2 text-right font-semibold w-24">Net GST</th>
                <th className="px-2 py-2 text-right font-semibold w-24">Total</th>
                <th className="px-2 py-2 text-center w-10">
                  <button
                    onClick={() => searchRef.current?.focus()}
                    title="Add detail (Ctrl+A)"
                    className="w-6 h-6 rounded bg-white/15 hover:bg-white/30 flex items-center justify-center mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center text-gray-400 dark:text-gray-500 py-16">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                    <div className="text-sm font-medium">No items in this bill</div>
                    <div className="text-xs mt-1">
                      Type a medicine name or scan a barcode in the search box above to add it (Ctrl+A)
                    </div>
                  </td>
                </tr>
              )}

            {cart.map((item, idx) => {
              const expired = isExpired(item.expiry);
              const expiringSoon = isExpiringSoon(item.expiry);
              // Expired OR within 3 months → red accent + red expiry date.
              const expiryAlert = expired || expiringSoon;
              // Loose sale enabled when a loose-qty factor (>1) is set on the item.
              const lf = (item.looseFactor ?? 1) > 1 ? item.looseFactor : 0;
              const looseAllowed = lf > 0;
              // Remaining stock after this line = full packs + leftover loose units.
              // e.g. stock 10, loose-billed 7 (factor 10) → 1 pack opened → "9+3".
              const packsForLoose = lf > 0 && item.lsQty > 0 ? Math.ceil(item.lsQty / lf) : 0;
              const looseRemaining = packsForLoose > 0 ? packsForLoose * lf - item.lsQty : 0;
              const fullRemaining = item.stock - item.qty - packsForLoose;
              const rowClass = expiryAlert
                ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100/60"
                : idx % 2 === 0
                ? "bg-white dark:bg-gray-900 hover:bg-blue-50/40 dark:hover:bg-blue-950/30"
                : "bg-gray-50/60 dark:bg-gray-800/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/30";
              return (
                <tr key={item.id} className={`border-b dark:border-gray-800 transition-colors ${rowClass}`}>
                  <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500 font-mono">{idx + 1}</td>
                  <td className="px-2 py-1.5 font-mono text-gray-600 dark:text-gray-400">{item.code || "—"}</td>
                  <td className="px-2 py-1.5">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                      {item.name}
                      {item.brand && <span className="text-blue-600 font-normal ml-1">{item.brand}</span>}
                    </div>
                    {(item.salt || item.packing || item.schedule) && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[260px]">
                        {[item.packing, item.salt, item.schedule && `Sch ${item.schedule}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </td>
                  <td
                    ref={batchEditId === item.id ? activeBatchTdRef : undefined}
                    className="relative px-2 py-1.5"
                  >
                    <div
                      ref={batchEditId === item.id ? activeBatchRef : undefined}
                      tabIndex={0}
                      onFocus={() => setBatchEditId(item.id)}
                      onBlur={() => {
                        // Leaving the batch cell WITHOUT choosing a batch cancels
                        // the add — the product is not committed to the bill.
                        setTimeout(() => {
                          if (batchWarningRef.current) return; // warning modal is open
                          if (pendingItemRef.current !== item.id) return; // already committed/removed
                          if (activeBatchTdRef.current?.contains(document.activeElement)) return; // focus came back
                          cancelPendingAdd(item.id);
                        }, 150);
                      }}
                      onKeyDown={(e) => handleBatchKeyDown(e, item)}
                      title="Select batch (press ↓ for the list)"
                      className={`flex items-center justify-between gap-1 rounded px-1 py-0.5 font-mono cursor-pointer outline-none transition-shadow ${
                        batchEditId === item.id
                          ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-950/30 text-gray-900 dark:text-gray-100"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="truncate">{item.batch || "—"}</span>
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (batchEditId === item.id && batchDropdownOpen) {
                            setBatchDropdownOpen(false);
                          } else {
                            openBatchSelect(item.id, item.medicineId, item.batch, true);
                          }
                        }}
                        title="Show available batches"
                        className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {batchEditId === item.id && batchDropdownOpen && (
                      <div className="absolute left-1 right-1 top-full z-40 mt-0.5 max-h-56 min-w-[180px] overflow-auto rounded-md border border-green-200 bg-white shadow-xl dark:border-green-900 dark:bg-gray-900">
                        {batchLoading ? (
                          <div className="px-2 py-3 text-center text-gray-400">Loading…</div>
                        ) : batchOptions.length === 0 ? (
                          <div className="px-2 py-3 text-center text-gray-400">No batches in stock</div>
                        ) : (
                          batchOptions.map((b, i) => (
                            <button
                              key={b.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => chooseBatch(item.id, b)}
                              onMouseEnter={() => setBatchHighlight(i)}
                              className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs ${
                                i === batchHighlight
                                  ? "bg-green-100 dark:bg-green-900/40"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
                              }`}
                            >
                              <span
                                className={`font-mono font-medium ${
                                  b.expired ? "text-red-600" : "text-gray-900 dark:text-gray-100"
                                }`}
                              >
                                {b.batchNumber}
                              </span>
                              <span className="shrink-0 text-gray-500 dark:text-gray-400">
                                Qty {b.availableQty}
                              </span>
                              <span
                                className={`flex shrink-0 items-center gap-1 ${
                                  b.expired
                                    ? "text-red-600"
                                    : b.nearExpiry
                                    ? "text-amber-600"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                Exp {b.expiry}
                                {b.expired && (
                                  <span className="rounded bg-red-100 px-1 text-[9px] font-bold text-red-700 dark:bg-red-950/50">
                                    EXPIRED
                                  </span>
                                )}
                                {!b.expired && b.nearExpiry && (
                                  <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700 dark:bg-amber-950/50">
                                    NEAR
                                  </span>
                                )}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`font-medium ${
                        expiryAlert ? "text-red-600" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {item.expiry || "-"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-400">
                    {lineMargin(item).toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={item.discountPct}
                      onChange={(e) =>
                        updateCartItem(item.id, {
                          discountPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                        })
                      }
                      className="h-7 w-14 text-center text-xs px-1 border-gray-300 dark:border-gray-700"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input
                      type="number"
                      min={looseAllowed ? 0 : 1}
                      max={item.stock || undefined}
                      value={item.qty}
                      onChange={(e) => {
                        // Min is 0 only when loose sale is enabled (pure loose bill).
                        const floor = looseAllowed ? 0 : 1;
                        let v = Math.max(floor, parseInt(e.target.value) || floor);
                        // Quantity can never exceed the batch's available stock.
                        if (item.stock > 0 && v > item.stock) {
                          v = item.stock;
                          toast.error(
                            `Only ${item.stock} in stock for "${item.name}". Quantity capped.`,
                            { duration: 3000 }
                          );
                        }
                        updateCartItem(item.id, { qty: v });
                      }}
                      className="h-7 w-12 text-center text-xs px-0.5 border-gray-200/70 dark:border-gray-700/50"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={looseAllowed ? lf - 1 : 0}
                      value={item.lsQty}
                      disabled={!looseAllowed}
                      title={looseAllowed ? "Loose units" : "Loose sale not enabled for this item"}
                      onChange={(e) =>
                        updateCartItem(item.id, { lsQty: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className={cn(
                        "h-7 w-12 text-center text-xs px-0.5 border-gray-200/70 dark:border-gray-700/50",
                        !looseAllowed && "cursor-not-allowed bg-gray-100 opacity-50 dark:bg-gray-800"
                      )}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {(() => {
                      const negative = fullRemaining < 0;
                      return (
                        <span
                          className={`font-semibold ${
                            negative
                              ? "text-red-600"
                              : fullRemaining === 0 && looseRemaining === 0
                              ? "text-amber-600"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {fullRemaining}
                          {looseRemaining > 0 && (
                            <span className="text-blue-600 dark:text-blue-400">+{looseRemaining}</span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {RUPEE}
                    {item.mrp.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">
                    {RUPEE}
                    {lineNetGst(item).toFixed(2)}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">({item.gstPct}%)</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-gray-900 dark:text-gray-100">
                    {RUPEE}
                    {item.amount.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => removeCartItem(item.id)}
                      title="Remove (Ctrl+D removes last)"
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {/* ===================== YELLOW BILLING SUMMARY (compact) ===================== */}
      <footer className="shrink-0 print:hidden border-t-2 border-green-300 dark:border-green-900 bg-green-100 dark:bg-green-950/40">
        {/* Remarks + delivery + live stats — single thin strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1 border-b border-green-200/70 dark:border-green-900 text-[11px]">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="font-semibold text-green-800 shrink-0">Remarks</span>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks… [Alt+R]"
              className="flex-1 h-6 px-2 text-xs bg-white/80 dark:bg-gray-900 border border-green-200 dark:border-green-900 rounded focus:border-green-500 outline-none min-w-0"
            />
          </div>
          <label className="flex items-center gap-1 font-semibold text-green-800 shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={homeDelivery}
              onChange={(e) => setHomeDelivery(e.target.checked)}
              className="accent-blue-600 w-3.5 h-3.5"
            />
            <Home className="w-3.5 h-3.5" /> Home Delivery
          </label>
          <span className="text-green-900/80">Items/Qty <span className="font-bold text-green-900">{totalItems}/{totalQty}</span></span>
          <span className="text-green-900/80">Disc ({RUPEE})<span className="font-bold text-green-900 ml-1">{discRupee.toFixed(2)}</span></span>
          <span className="text-green-900/80">GST ({RUPEE})<span className="font-bold text-green-900 ml-1">{totalGst.toFixed(2)}</span></span>
          <span className="text-green-900/80">Round Off<span className="font-bold text-green-900 ml-1">{roundOff.toFixed(2)}</span></span>
          <span className="text-green-900/80">Margin%<span className="font-bold text-green-900 ml-1">{overallMargin.toFixed(1)}</span></span>
        </div>

        {/* Main summary row — single line, inline cells */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
          {/* Payment mode */}
          <div className="relative w-28">
            <Wallet className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400 pointer-events-none" />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full h-9 pl-7 pr-6 text-sm font-semibold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md appearance-none outline-none focus:border-blue-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </div>

          {/* Received */}
          <input
            ref={receivedRef}
            type="number"
            min={0}
            value={amountPaid || ""}
            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
            placeholder="Received"
            className="w-28 h-9 px-2 text-base font-bold text-right bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-md focus:border-blue-500 outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />

          {/* Selected Total */}
          <div className="h-9 w-32 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800 px-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Sel.Total</span>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {RUPEE}{selectedTotal.toFixed(2)}
            </span>
          </div>

          {/* Outstanding / Change */}
          <div
            className={`h-9 w-32 rounded-md border px-2 flex items-center justify-between ${
              outstanding > 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200" : "bg-green-50 dark:bg-green-950/30 border-green-200"
            }`}
          >
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {outstanding > 0 ? "Outstd" : "Change"}
            </span>
            <span className={`text-sm font-bold ${outstanding > 0 ? "text-red-700" : "text-green-700"}`}>
              {RUPEE}{Math.abs(outstanding).toFixed(2)}
            </span>
          </div>

          {/* Total (grand) */}
          <div className="flex-1 min-w-[150px] h-9 bg-slate-800 text-white rounded-md px-4 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide opacity-90">Total</span>
            <span className="text-2xl font-black tracking-tight">
              {RUPEE} {grandTotal.toFixed(0)}
            </span>
          </div>

          {/* Save buttons — side by side */}
          <button
            onClick={() => handleSave(false)}
            disabled={saving || cart.length === 0}
            className="h-9 px-3 rounded-md bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save <span className="opacity-70 text-xs">[F9]</span>
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || cart.length === 0}
            className="h-9 px-3 rounded-md bg-slate-700 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Save &amp; Print <span className="opacity-70 text-xs">[F8]</span>
          </button>
        </div>
      </footer>

      {/* ===================== KEYBOARD SHORTCUTS BAR ===================== */}
      <div className="shrink-0 print:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex flex-wrap items-center gap-x-4 gap-y-0.5 px-3 py-1">
        {SHORTCUTS.map((s) => (
          <span key={s.keys} className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
            <kbd className="px-1 py-0.5 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-mono text-[10px] text-gray-700 dark:text-gray-300">
              {s.keys}
            </kbd>
            {s.label}
          </span>
        ))}
        <button
          onClick={clearBill}
          title="New Bill (F2)"
          className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Bill
          <kbd className="px-1 py-0.5 rounded border border-blue-200 bg-blue-50 dark:bg-blue-950/40 font-mono text-[10px]">F2</kbd>
        </button>
      </div>

      {/* ===================== ADD PATIENT (master-entry slide-over) ===================== */}
      <SlideOver
        open={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        title="Add Patient"
        subtitle="Master entry"
        icon={User}
        width="md"
      >
        <PatientMasterForm
          defaultValues={customerQuery.trim() ? { name: customerQuery.trim() } : undefined}
          onSuccess={handlePatientCreated}
          onCancel={() => setPatientModalOpen(false)}
        />
      </SlideOver>

      {/* ===================== ADD DOCTOR (master-entry slide-over) ===================== */}
      <SlideOver
        open={doctorModalOpen}
        onClose={() => setDoctorModalOpen(false)}
        title="Add Doctor"
        subtitle="Master entry"
        icon={Stethoscope}
        width="md"
      >
        <DoctorMasterForm
          defaultValues={doctorQuery.trim() ? { name: doctorQuery.trim() } : undefined}
          onSuccess={handleDoctorCreated}
          onCancel={() => setDoctorModalOpen(false)}
        />
      </SlideOver>

      {/* Hard-copy invoice — hidden on screen, rendered only when printing. */}
      <div className="hidden print:block">
        <InvoiceTemplate
          storeData={storeSettings}
          printMode={storeSettings.printFormat}
          saleData={{
            invoiceNumber: invoiceNo,
            invoiceDate: billDateDisplay,
            invoiceTime: now
              ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "",
            patientName: customer?.name || customerQuery.trim() || "Walk-in Customer",
            patientPhone: customer?.phone || "",
            doctorName: doctor?.name || doctorQuery.trim() || undefined,
            doctorSpecialization: doctor?.specialization,
            doctorReg: doctor?.registrationNumber,
            items: cart.map((it, i) => ({
              sNo: i + 1,
              hsn: it.code || "",
              mfg: it.brand || "",
              description: [it.name, it.brand].filter(Boolean).join(" "),
              batch: it.batch || "-",
              expiry: it.expiry || "-",
              qty: it.qty + (it.lsQty ?? 0),
              mrp: it.mrp,
              rate: it.rate,
              discPercent: it.discountPct,
              gstPercent: it.gstPct,
              amount: it.amount,
            })),
            subtotal,
            totalDiscount: discRupee,
            cgst,
            sgst,
            netAmount: grandTotal,
            paidAmount: amountPaid || grandTotal,
            paymentMode: paymentMethod,
            changeAmount: Math.max(0, received - grandTotal),
          }}
        />
      </div>

      {/* Expiry warning — block expired batches, confirm near-expiry */}
      {batchWarning && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBatchWarning(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg border bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  batchWarning.type === "expired"
                    ? "bg-red-100 text-red-600 dark:bg-red-950/40"
                    : "bg-amber-100 text-amber-600 dark:bg-amber-950/40"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {batchWarning.type === "expired" ? "Can't add — product is expired" : "Product is near expiry"}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Batch{" "}
                  <span className="font-mono font-semibold">{batchWarning.batch.batchNumber}</span>{" "}
                  {batchWarning.type === "expired" ? (
                    <>expired ({batchWarning.batch.expiry}). Expired stock cannot be billed.</>
                  ) : (
                    <>is near expiry ({batchWarning.batch.expiry}). Add it to the bill anyway?</>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              {batchWarning.type === "near" ? (
                <>
                  <button
                    onClick={() => {
                      setBatchWarning(null);
                      setTimeout(() => activeBatchRef.current?.focus(), 0);
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const w = batchWarning;
                      setBatchWarning(null);
                      applyBatch(w.itemId, w.batch);
                    }}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    Add anyway
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setBatchWarning(null);
                    setTimeout(() => activeBatchRef.current?.focus(), 0);
                  }}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

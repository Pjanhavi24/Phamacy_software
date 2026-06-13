"use client";

import { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { X, Search, Loader2, AlertTriangle, PackagePlus, PackageMinus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchRow {
  id: string;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
  mrp: number;
  saleRate: number;
  purchaseRate: number;
}
interface Medicine {
  id: string;
  name: string;
  productCode: number | null;
  mrp: number;
  saleRate: number;
  purchaseRate: number;
}

const IN_REASONS = ["Return", "Excess"];
const OUT_REASONS = ["Excess stock", "Damage", "Expiry", "Stock adjustment"];

function fmtExp(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

// Expiry is typed as MM/YY (e.g. "02/27"). Validate the exact format.
const MMYY_RE = /^(0[1-9]|1[0-2])\/\d{2}$/;
function isValidMMYY(v: string): boolean {
  return MMYY_RE.test(v.trim());
}
// MM/YY → ISO date (first of that month, 20YY).
function mmyyToIso(v: string): string {
  const [mm, yy] = v.trim().split("/");
  return `20${yy}-${mm}-01`;
}
// ISO/date → MM/YY for prefilling from an existing batch.
function isoToMMYY(d: string): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

const fieldCls =
  "h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950";

export function StockMoveModal({
  mode,
  onClose,
  onDone,
}: {
  mode: "in" | "out";
  onClose: () => void;
  onDone: () => void;
}) {
  const isIn = mode === "in";

  const [code, setCode] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<{ id: string; name: string; packing: string }[]>([]);
  const [searchingName, setSearchingName] = useState(false);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);

  const [batchNumber, setBatchNumber] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showBatches, setShowBatches] = useState(false);
  const [expiry, setExpiry] = useState(""); // yyyy-mm (month input) for new batch (stock-in)

  const [qty, setQty] = useState("");
  const [billRate, setBillRate] = useState("");
  const [saleRate, setSaleRate] = useState("");
  const [mrp, setMrp] = useState("");
  const [reason, setReason] = useState(isIn ? IN_REASONS[0] : OUT_REASONS[0]);

  const [saving, setSaving] = useState(false);
  const [barcodePrompt, setBarcodePrompt] = useState(false);
  const batchRef = useRef<HTMLInputElement>(null);

  const reset = (keepCode = false) => {
    if (!keepCode) setCode("");
    setNameQuery("");
    setNameResults([]);
    setNotFound(false);
    setMedicine(null);
    setBatches([]);
    setBatchNumber("");
    setSelectedBatchId(null);
    setExpiry("");
    setQty("");
    setBillRate("");
    setSaleRate("");
    setMrp("");
  };

  const lookup = async (raw?: string) => {
    const c = (raw ?? code).trim();
    if (!c) return;
    setCode(c);
    setNameQuery("");
    setNameResults([]);
    setLooking(true);
    setNotFound(false);
    setMedicine(null);
    setBatches([]);
    try {
      const res = await apiClient.get("/inventory/lookup", { params: { code: c } });
      const med: Medicine = res.data.medicine;
      const bs: BatchRow[] = res.data.batches ?? [];
      setMedicine(med);
      // Show the human-facing item code (incremental productCode), never the DB id.
      setCode(med.productCode != null ? String(med.productCode) : "");
      setBatches(bs);
      setBillRate(String(med.purchaseRate ?? ""));
      setSaleRate(String(med.saleRate ?? ""));
      setMrp(String(med.mrp ?? ""));
      setTimeout(() => batchRef.current?.focus(), 50);
    } catch {
      setNotFound(true);
    } finally {
      setLooking(false);
    }
  };

  // Debounced search-by-name → /medicines/search (searches the whole catalogue).
  useEffect(() => {
    const q = nameQuery.trim();
    if (q.length < 2) {
      setNameResults([]);
      return;
    }
    let cancelled = false;
    setSearchingName(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get("/medicines/search", { params: { q } });
        const rows = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setNameResults(rows.map((r: any) => ({ id: r.id, name: r.name, packing: r.packing ?? "" })));
      } catch {
        if (!cancelled) setNameResults([]);
      } finally {
        if (!cancelled) setSearchingName(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [nameQuery]);

  // stock-out works against available batches only
  const availableBatches = batches.filter((b) => b.availableQty > 0);
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  // True when stocking out more than the selected batch holds.
  const overStock =
    !isIn && !!selectedBatch && Number(qty) > 0 && Number(qty) > selectedBatch.availableQty;
  // Stock-in expiry must be MM/YY when provided.
  const expiryInvalid = isIn && expiry.trim() !== "" && !isValidMMYY(expiry);

  const pickBatch = (b: BatchRow) => {
    setSelectedBatchId(b.id);
    setBatchNumber(b.batchNumber);
    setShowBatches(false);
    if (isIn) {
      setBillRate(String(b.purchaseRate));
      setSaleRate(String(b.saleRate));
      setMrp(String(b.mrp));
      if (b.expiryDate) setExpiry(isoToMMYY(b.expiryDate));
    }
  };

  const submit = async () => {
    if (!medicine) return void toast.error("Look up an item first");
    const q = Number(qty);
    if (!q || q <= 0) return void toast.error("Enter a valid quantity");

    if (isIn) {
      if (!batchNumber.trim()) return void toast.error("Enter a batch number");
      if (expiry.trim() !== "" && !isValidMMYY(expiry)) {
        return void toast.error("Invalid date format — use MM/YY (e.g. 02/27).");
      }
      setSaving(true);
      try {
        await apiClient.post("/inventory/stock-in", {
          medicineId: medicine.id,
          batchNumber: batchNumber.trim(),
          quantity: q,
          // Expiry typed as MM/YY → full date (first of that month).
          expiryDate: expiry.trim() ? mmyyToIso(expiry) : undefined,
          billRate: billRate === "" ? undefined : Number(billRate),
          saleRate: saleRate === "" ? undefined : Number(saleRate),
          mrp: mrp === "" ? undefined : Number(mrp),
          reason,
        });
        toast.success("Stock added");
        onDone();
        setBarcodePrompt(true); // ask about barcode
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Stock-in failed");
      } finally {
        setSaving(false);
      }
    } else {
      if (!selectedBatch) return void toast.error("Select a batch to stock out");
      if (q > selectedBatch.availableQty) {
        return void toast.error(
          `Stock will go negative — only ${selectedBatch.availableQty} available in batch ${selectedBatch.batchNumber}.`,
          { duration: 4000 }
        );
      }
      setSaving(true);
      try {
        await apiClient.post("/inventory/stock-out", {
          batchId: selectedBatch.id,
          quantity: q,
          reason,
        });
        toast.success("Stock removed");
        onDone();
        onClose();
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Stock-out failed", { duration: 4000 });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
            {isIn ? (
              <PackagePlus className="h-5 w-5 text-green-600" />
            ) : (
              <PackageMinus className="h-5 w-5 text-amber-600" />
            )}
            {isIn ? "Stock In" : "Stock Out"}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Item code + name */}
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Item Code</label>
              <div className="relative">
                <input
                  className={fieldCls}
                  value={code}
                  autoFocus
                  placeholder="Code"
                  onChange={(e) => {
                    setCode(e.target.value);
                    setNotFound(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && lookup()}
                  onBlur={() => lookup()}
                />
                {looking && (
                  <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400" />
                )}
              </div>
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Item Name</label>
              {medicine ? (
                <div className="flex h-9 items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                  <span className="truncate">{medicine.name}</span>
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="ml-2 shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                    title="Clear / search again"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className={cn(
                      fieldCls,
                      "pl-7",
                      notFound && "border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/30"
                    )}
                    value={nameQuery}
                    placeholder="Search by name…"
                    onChange={(e) => {
                      setNameQuery(e.target.value);
                      setNotFound(false);
                    }}
                  />
                  {searchingName && (
                    <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400" />
                  )}
                </div>
              )}
              {notFound && !medicine && !nameQuery && (
                <p className="mt-1 text-xs text-red-600">Item not found</p>
              )}
              {!medicine && nameResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-950">
                  {nameResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => lookup(r.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-950/40"
                    >
                      <span className="truncate">{r.name}</span>
                      {r.packing && (
                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{r.packing}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {medicine && (
            <>
              {/* Batch */}
              <div className="relative">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Batch Number {isIn ? "" : "(select an available batch)"}
                </label>
                <input
                  ref={batchRef}
                  className={fieldCls}
                  value={batchNumber}
                  readOnly={!isIn}
                  placeholder={isIn ? "Type or pick a batch" : "Click to choose a batch"}
                  onChange={(e) => {
                    setBatchNumber(e.target.value);
                    const m = batches.find((b) => b.batchNumber === e.target.value);
                    setSelectedBatchId(m?.id ?? null);
                  }}
                  onFocus={() => setShowBatches(true)}
                />

                {/* Existing / available batches section */}
                {showBatches && (
                  <div className="mt-1 max-h-44 overflow-auto rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    {(isIn ? batches : availableBatches).length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-400">
                        {isIn ? "No existing batches — type a new batch number." : "No batches with available stock."}
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-3 gap-2 border-b border-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                          <span>Batch</span>
                          <span>Expiry</span>
                          <span className="text-right">Stock</span>
                        </div>
                        {(isIn ? batches : availableBatches).map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => pickBatch(b)}
                            className={cn(
                              "grid w-full grid-cols-3 gap-2 px-3 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40",
                              selectedBatchId === b.id && "bg-blue-100 dark:bg-blue-900/40"
                            )}
                          >
                            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{b.batchNumber}</span>
                            <span className="text-gray-600 dark:text-gray-400">{fmtExp(b.expiryDate)}</span>
                            <span className="text-right font-medium text-gray-700 dark:text-gray-300">{b.availableQty}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity + (stock-in extras) */}
              {isIn ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Quantity" required>
                      <input className={fieldCls} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
                    </Field>
                    <Field label="Expiry (MM/YY, for a new batch)">
                      <input
                        className={cn(fieldCls, expiryInvalid && "border-red-400 focus:border-red-500 focus:ring-red-200")}
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                      />
                      {expiryInvalid && (
                        <p className="mt-1 text-xs font-medium text-red-600">Invalid date format — use MM/YY (e.g. 02/27).</p>
                      )}
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Bill Rate">
                      <input className={fieldCls} type="number" step="0.01" value={billRate} onChange={(e) => setBillRate(e.target.value)} />
                    </Field>
                    <Field label="Sale Rate">
                      <input className={fieldCls} type="number" step="0.01" value={saleRate} onChange={(e) => setSaleRate(e.target.value)} />
                    </Field>
                    <Field label="MRP">
                      <input className={fieldCls} type="number" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} />
                    </Field>
                  </div>
                </>
              ) : (
                <Field label="Quantity to remove" required>
                  <input
                    className={cn(
                      fieldCls,
                      "max-w-[200px]",
                      overStock && "border-red-400 focus:border-red-500 focus:ring-red-200"
                    )}
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                  {selectedBatch && !overStock && (
                    <p className="mt-1 text-xs text-gray-500">
                      Available in {selectedBatch.batchNumber}: <b>{selectedBatch.availableQty}</b>
                    </p>
                  )}
                  {overStock && selectedBatch && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Cannot stock out more qty — stock will go negative (only {selectedBatch.availableQty} available).
                    </p>
                  )}
                </Field>
              )}

              {/* Reason */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Reason</label>
                <div className="flex flex-wrap gap-4">
                  {(isIn ? IN_REASONS : OUT_REASONS).map((r) => (
                    <label key={r} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        className="h-4 w-4 accent-blue-600"
                        checked={reason === r}
                        onChange={() => setReason(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-800">
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" onClick={onClose}>
            Cancel
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50",
              isIn ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
            )}
            onClick={submit}
            disabled={saving || !medicine || overStock || expiryInvalid}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isIn ? "Stock In" : "Stock Out"}
          </button>
        </div>
      </div>

      {/* Barcode prompt (after a successful stock-in) */}
      {barcodePrompt && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 text-center shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-blue-500" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Stock added successfully</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Print barcode for this stock?</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={() => {
                  setBarcodePrompt(false);
                  reset(true);
                }}
              >
                No
              </button>
              <button
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={() => {
                  toast.info("Barcode printing will be added soon.");
                  setBarcodePrompt(false);
                  reset(true);
                }}
              >
                Yes, print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

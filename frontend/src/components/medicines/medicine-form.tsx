"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { apiClient } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/* ---------------------------------------------------------------------------
 * Item Master entry form — a flat, single-page form (no tabs, no modal).
 * "Medicine" is now a generic "Item"; the item name itself carries the brand,
 * so there is no separate brand field.
 * ------------------------------------------------------------------------- */
// Blank numeric inputs come through as "" — treat them as "not provided".
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

const itemSchema = z.object({
  // Item details
  name: z.string().min(2, "Item name must be at least 2 characters"),
  itemType: z.enum(["general", "medicine"]),
  genericName: z.string().optional(),
  genericCode: z.string().optional(),
  manufacturer: z.string().optional(), // labelled "Company"
  companyCode: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  categoryCode: z.string().optional(),
  packing: z.string().optional(),
  barcode: z.string().optional(), // Product Barcode
  hsnCode: z.string().optional(),

  // Pricing & tax — all optional (blank → 0)
  mrp: z.coerce.number().min(0).optional(),
  purchaseRate: z.coerce.number().min(0).optional(),
  saleRate: z.coerce.number().min(0).optional(),
  gstRate: z.coerce.number().min(0).max(28, "GST must be 0–28"),

  // Stock — levels optional and may be left blank
  looseQtyFactor: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).optional()),
  unit: z.string().optional(),
  minLevel: z.preprocess(emptyToUndef, z.coerce.number().min(0).optional()),
  maxLevel: z.preprocess(emptyToUndef, z.coerce.number().min(0).optional()),
  reorderLevel: z.preprocess(emptyToUndef, z.coerce.number().min(0).optional()),

  // Classification & storage — "schedule" is a simple Yes/No (Yes ⇒ Schedule H)
  scheduleType: z.string().optional(),
  storageInstructions: z.string().optional(),
  isActive: z.boolean(),
});

export type MedicineFormValues = z.infer<typeof itemSchema>;

interface MedicineFormProps {
  defaultValues?: Partial<MedicineFormValues>;
  onSubmit: (values: MedicineFormValues) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  /** Existing company names to suggest while typing. */
  companyOptions?: string[];
}

// Category = system of medicine (the CSV "type" column).
const CATEGORIES: { value: string; label: string }[] = [
  { value: "allopathy", label: "Allopathy" },
  { value: "homeopathy", label: "Homeopathy" },
  { value: "ayurvedic", label: "Ayurvedic" },
  { value: "unani", label: "Unani" },
  { value: "surgical", label: "Surgical" },
  { value: "general", label: "General" },
  { value: "cosmetic", label: "Cosmetic" },
  { value: "other", label: "Other" },
];
const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["Strip", "Bottle", "Tube", "Vial", "Sachet", "Box", "Piece", "Unit"];

const DEFAULT_VALUES: Partial<MedicineFormValues> = {
  itemType: "medicine",
  category: "allopathy",
  gstRate: 12,
  // loose-qty factor & unit intentionally left blank (loose sale off by default)
  // min/max/reorder intentionally left blank (optional)
  scheduleType: "OTC", // "OTC" = schedule No
  isActive: true,
};

const inputCls = "h-9 bg-white text-sm dark:bg-gray-950";

/* --- small flat building blocks ----------------------------------------- */
// Flat section: just a small heading with a hairline divider — no boxed card,
// so the whole form reads as one continuous sheet instead of stacked panels.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-1">
      <h3 className="mb-3 border-b border-gray-200 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Text input that suggests matching existing values as you type. */
function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const v = value ?? "";
  const matches = useMemo(() => {
    const q = v.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => o && o.toLowerCase().includes(q) && o.toLowerCase() !== q)
      .slice(0, 8);
  }, [v, options]);

  return (
    <div className="relative">
      <Input
        className={inputCls}
        value={v}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {matches.map((m) => (
            <button
              type="button"
              key={m}
              onMouseDown={() => {
                onChange(m);
                setOpen(false);
              }}
              className="block w-full truncate px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Code + name picker backed by a master table (companies / generics / categories).
 * - Type a CODE and press Enter → the matching name is auto-filled.
 * - Click / type the NAME → a wide centered popup opens with its own search
 *   box and a results table; picking a row fills both code and name.
 */
type MasterKind = "companies" | "generics" | "categories";
interface MasterRow {
  id: string;
  code: string | number;
  name: string;
}
const KIND_LABEL: Record<MasterKind, string> = {
  companies: "Company",
  generics: "Generic Group",
  categories: "Category",
};
function MasterPicker({
  kind,
  code,
  name,
  onPick,
  placeholder,
}: {
  kind: MasterKind;
  code: string;
  name: string;
  onPick: (code: string, name: string) => void;
  placeholder?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async (search: string): Promise<MasterRow[]> => {
    const res = await apiClient.get(`/masters/${kind}`, { params: { search, limit: 50 } });
    return (res.data?.items ?? []) as MasterRow[];
  };

  // Search inside the popup (debounced). Results appear only once the user
  // types something — the list does not open with the full table by default.
  useEffect(() => {
    if (!modalOpen) return;
    if (query.trim() === "") {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const items = await fetchRows(query.trim());
        if (!cancelled) setRows(items);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, modalOpen, kind]);

  const openModal = () => {
    // Start empty so the table opens only after the user types.
    setQuery("");
    setRows([]);
    setModalOpen(true);
  };

  const lookupByCode = async () => {
    const c = (code ?? "").trim();
    if (!c) return;
    try {
      const items = await fetchRows(c);
      const exact = items.find((i) => String(i.code).toLowerCase() === c.toLowerCase());
      if (exact) onPick(String(exact.code), exact.name);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Input
          className="h-9 w-20 shrink-0 bg-white text-center text-sm dark:bg-gray-950"
          value={code}
          placeholder="Code"
          autoComplete="off"
          onChange={(e) => onPick(e.target.value, name)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lookupByCode();
            }
          }}
          onBlur={lookupByCode}
        />
        <Input
          className={`${inputCls} flex-1 cursor-pointer`}
          value={name}
          placeholder={placeholder}
          autoComplete="off"
          readOnly
          onFocus={openModal}
          onClick={openModal}
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-10">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            {/* header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Select {KIND_LABEL[kind]}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
            {/* search */}
            <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <Input
                autoFocus
                className={inputCls}
                value={query}
                placeholder={`Search ${KIND_LABEL[kind].toLowerCase()} by name or code…`}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {/* results */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-100 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="w-28 px-3 py-2 text-left font-semibold">Code</th>
                    <th className="px-3 py-2 text-left font-semibold">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {query.trim() === "" ? (
                    <tr><td colSpan={2} className="px-3 py-3 text-gray-400">Type to search…</td></tr>
                  ) : loading && rows.length === 0 ? (
                    <tr><td colSpan={2} className="px-3 py-3 text-gray-400">Searching…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={2} className="px-3 py-3 text-gray-400">No matches.</td></tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => {
                          onPick(String(r.code), r.name);
                          setModalOpen(false);
                        }}
                        className="cursor-pointer border-t border-gray-100 hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-950/40"
                      >
                        <td className="px-3 py-1.5 font-mono text-gray-600 dark:text-gray-400">{r.code}</td>
                        <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200">{r.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MedicineForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  companyOptions = [],
}: MedicineFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const purchaseRate = watch("purchaseRate");
  const saleRate = watch("saleRate");
  const margin =
    purchaseRate && saleRate ? (((saleRate - purchaseRate) / purchaseRate) * 100).toFixed(1) : "0.0";

  // Default the sale rate to MRP for new items.
  const mrp = watch("mrp");
  useEffect(() => {
    if (mrp && !defaultValues?.saleRate) setValue("saleRate", mrp);
  }, [mrp, defaultValues?.saleRate, setValue]);

  const itemType = watch("itemType");
  const isMedicine = itemType === "medicine";
  const scheduleType = watch("scheduleType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ---- Item Details ---- */}
      <Section title="Item Details">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Item Name" required error={errors.name?.message} className="sm:col-span-2 lg:col-span-2">
            <Input className={inputCls} {...register("name")} placeholder="e.g. Crocin Advance 500mg" />
          </Field>
          <Field label="Type" required>
            <Controller
              name="itemType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medicine">Medicine</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          {isMedicine && (
            <Field label="Generic Group" className="sm:col-span-2 lg:col-span-1">
              <MasterPicker
                kind="generics"
                code={watch("genericCode") ?? ""}
                name={watch("genericName") ?? ""}
                onPick={(c, n) => {
                  setValue("genericCode", c);
                  setValue("genericName", n);
                }}
                placeholder="e.g. Paracetamol"
              />
            </Field>
          )}

          {/* Company — small code box to the left of the name */}
          <Field label="Company" className="lg:col-span-1">
            <MasterPicker
              kind="companies"
              code={watch("companyCode") ?? ""}
              name={watch("manufacturer") ?? ""}
              onPick={(c, n) => {
                setValue("companyCode", c);
                setValue("manufacturer", n);
              }}
              placeholder="Company name"
            />
          </Field>

          {/* Category — small code box to the left of the name */}
          <Field label="Category" required error={errors.category?.message}>
            <MasterPicker
              kind="categories"
              code={watch("categoryCode") ?? ""}
              name={watch("category") ?? ""}
              onPick={(c, n) => {
                setValue("categoryCode", c);
                setValue("category", n);
              }}
              placeholder="Category name"
            />
          </Field>

          <Field label="Packing">
            <Input className={inputCls} {...register("packing")} placeholder="e.g. 10x10" />
          </Field>
          <Field label="Product Barcode">
            <Input className={inputCls} {...register("barcode")} placeholder="Scan or enter barcode" />
          </Field>
          <Field label="HSN Code">
            <Input className={inputCls} {...register("hsnCode")} placeholder="e.g. 30041090" />
          </Field>
        </div>
      </Section>

      {/* ---- Pricing & Tax ---- */}
      <Section title="Pricing & Tax">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="MRP (₹)" error={errors.mrp?.message}>
            <Input className={inputCls} type="number" step="0.01" {...register("mrp")} placeholder="Optional" />
          </Field>
          <Field label="Purchase Rate (₹)" error={errors.purchaseRate?.message}>
            <Input className={inputCls} type="number" step="0.01" {...register("purchaseRate")} placeholder="Optional" />
          </Field>
          <Field label="Sale Rate (₹)" error={errors.saleRate?.message}>
            <Input className={inputCls} type="number" step="0.01" {...register("saleRate")} placeholder="Optional" />
          </Field>
          <Field label="Margin (auto)">
            <div className="flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-green-600 dark:border-gray-800 dark:bg-gray-950">
              {margin}%
            </div>
          </Field>
          <Field label="GST Rate (%)" required error={errors.gstRate?.message}>
            <Controller
              name="gstRate"
              control={control}
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </Section>

      {/* ---- Loose sale (separate from stock levels) ---- */}
      <Section title="Loose Sale">
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Set a loose-quantity factor only if this item can be sold in loose units
          (e.g. 10 = 10 tablets per strip). Leave blank to disable loose sale.
        </p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Loose Quantity Factor" error={errors.looseQtyFactor?.message}>
            <Input className={inputCls} type="number" min={1} placeholder="Optional" {...register("looseQtyFactor")} />
          </Field>
          <Field label="Unit" error={errors.unit?.message}>
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className={inputCls}><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </Section>

      {/* ---- Stock levels ---- */}
      <Section title="Stock Levels">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Minimum Level" error={errors.minLevel?.message}>
            <Input className={inputCls} type="number" {...register("minLevel")} placeholder="Optional" />
          </Field>
          <Field label="Maximum Level" error={errors.maxLevel?.message}>
            <Input className={inputCls} type="number" {...register("maxLevel")} placeholder="Optional" />
          </Field>
          <Field label="Reorder Level" error={errors.reorderLevel?.message}>
            <Input className={inputCls} type="number" {...register("reorderLevel")} placeholder="Optional" />
          </Field>
        </div>
      </Section>

      {/* ---- Classification & Storage ---- */}
      <Section title="Classification & Storage">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {isMedicine && (
            <Field label="Schedule" error={errors.scheduleType?.message}>
              <Controller
                name="scheduleType"
                control={control}
                render={({ field }) => {
                  const isYes = !!field.value && field.value !== "OTC";
                  return (
                    <div className="flex h-9 items-center gap-6">
                      {[
                        { v: "H", l: "Yes" },
                        { v: "OTC", l: "No" },
                      ].map((o) => (
                        <label
                          key={o.v}
                          className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <input
                            type="radio"
                            className="h-4 w-4 accent-blue-600"
                            checked={o.v === "H" ? isYes : !isYes}
                            onChange={() => field.onChange(o.v)}
                          />
                          {o.l}
                        </label>
                      ))}
                    </div>
                  );
                }}
              />
            </Field>
          )}
          <div className="flex items-center gap-3 pt-6">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="isActive" />
              )}
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              Active (available for sale)
            </label>
          </div>
          <Field label="Storage Instructions" className="sm:col-span-2 lg:col-span-3">
            <Textarea
              {...register("storageInstructions")}
              placeholder="e.g. Store below 25°C. Keep away from moisture and direct sunlight."
              rows={2}
            />
          </Field>
        </div>

        {isMedicine && !!scheduleType && scheduleType !== "OTC" && (
          <div className="mt-3 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300">
            <strong>Note:</strong> Scheduled items require a valid prescription before dispensing.
          </div>
        )}
      </Section>

      {/* ---- Footer ---- */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel ?? "Save Item"}
        </Button>
      </div>
    </form>
  );
}

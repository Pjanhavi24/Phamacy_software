"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useWorkspace } from "@/components/workspace/workspace-context";
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
  SlideOver,
  SearchInput,
  ds,
} from "@/components/design-system";
import { FilterSheet, FilterField } from "@/components/common/filter-sheet";
import {
  Receipt,
  Printer,
  Pencil,
  X,
  RotateCcw,
  MessageCircle,
  Plus,
  Download,
  RefreshCw,
  ShoppingCart,
  Filter,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
interface SaleItem {
  medicineName: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
}

interface Sale {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  doctorName: string;
  billAccount: string;
  date: string;
  itemCount: number;
  salesAmount: number; // gross
  discount: number;
  totalAmount: number; // net payable
  paymentMethod: string;
  orderType: string;
  status: string;
  user: string;
  items?: SaleItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d: unknown): string {
  if (!d) return "";
  const dt = new Date(String(d));
  if (isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

// Normalise a backend Sale record (GET /sales) into the table's row shape.
function normalize(raw: Record<string, any>, idx: number): Sale {
  const items: any[] = Array.isArray(raw.items) ? raw.items : [];
  const gross = Number(raw.totalAmount ?? 0);
  const discount = Number(raw.discountAmount ?? 0);
  const net = Number(raw.netAmount ?? gross - discount);
  return {
    id: String(raw.id ?? idx),
    invoiceNo: String(raw.invoiceNumber ?? raw.invoiceNo ?? `SL-${idx}`),
    customerId: String(raw.customer?.customerCode ?? raw.customerId ?? ""),
    customerName: String(raw.customerName ?? raw.customer?.name ?? "Walk-in"),
    doctorName: String(raw.doctorName ?? ""),
    billAccount: "",
    date: formatDate(raw.saleDate ?? raw.createdAt),
    itemCount: items.length,
    salesAmount: gross,
    discount,
    totalAmount: net,
    paymentMethod: String(raw.paymentMethod ?? "CASH").toUpperCase(),
    orderType: raw.customerId || raw.customer ? "PATIENT" : "WALKIN",
    status: String(raw.status ?? "COMPLETED").toUpperCase(),
    user: "",
    items: items.map((it) => ({
      medicineName: String(it.medicine?.name ?? it.medicineName ?? "Item"),
      qty: Number(it.quantity ?? 0),
      rate: Number(it.saleRate ?? it.rate ?? 0),
      gstRate: Number(it.gstRate ?? 0),
      amount: Number(it.amount ?? 0),
    })),
  };
}

const COLUMNS: {
  key: keyof Sale | "options";
  label: string;
  filter: boolean;
  align?: "right";
}[] = [
  { key: "invoiceNo", label: "Invoice", filter: true },
  { key: "customerName", label: "Patient", filter: true },
  { key: "doctorName", label: "Doctor", filter: true },
  { key: "date", label: "Date", filter: true },
  { key: "totalAmount", label: "Total Amt", filter: false, align: "right" },
  { key: "discount", label: "Disc", filter: false, align: "right" },
  { key: "salesAmount", label: "Sales Amt", filter: false, align: "right" },
  { key: "user", label: "User", filter: true },
  { key: "options", label: "Options", filter: false },
];

// ─── Detail slide-over ───────────────────────────────────────────────────────
function SaleDetail({
  sale,
  onClose,
  onEdit,
}: {
  sale: Sale | null;
  onClose: () => void;
  onEdit?: () => void;
}) {
  if (!sale) return null;
  return (
    <SlideOver
      open={!!sale}
      onClose={onClose}
      title={`Sale ${sale.invoiceNo}`}
      subtitle={sale.date}
      icon={Receipt}
      width="lg"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Patient</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{sale.customerName || "Walk-in"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Doctor</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{sale.doctorName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Payment</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{sale.paymentMethod}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{sale.status}</p>
          </div>
        </div>

        {sale.items && sale.items.length > 0 && (
          <Panel className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>{it.medicineName}</TableCell>
                    <TableCell className="text-right">{it.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.rate)}</TableCell>
                    <TableCell className="text-right">{it.gstRate}%</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(it.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Disc {formatCurrency(sale.discount)} · Gross {formatCurrency(sale.salesAmount)}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(sale.totalAmount)}</p>
          </div>
        </div>

        {onEdit && (
          <div className="flex justify-end border-t border-gray-200 pt-3 dark:border-gray-800">
            <button className={ds.btnPrimary} onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Edit in Billing
            </button>
          </div>
        )}
      </div>
    </SlideOver>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const router = useRouter();
  const { openModule } = useWorkspace();
  const [billNo, setBillNo] = useState("");
  const [custId, setCustId] = useState("");
  const [nameQ, setNameQ] = useState("");
  const [dateQ, setDateQ] = useState("");
  const [selected, setSelected] = useState<Sale | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const { data: sales = [], isLoading, isFetching, refetch } = useQuery<Sale[]>({
    queryKey: ["sales"],
    queryFn: () =>
      apiClient.get("/sales", { params: { limit: 200 } }).then((r) => {
        const d = r.data;
        const arr: Record<string, any>[] = Array.isArray(d?.sales)
          ? d.sales
          : Array.isArray(d)
          ? d
          : Array.isArray(d?.data)
          ? d.data
          : [];
        return arr.map(normalize);
      }),
  });

  const activeFilterCount = [billNo, custId, nameQ, dateQ].filter((v) => v.trim()).length;

  // Independent column filters (AND): bill no, customer id, name, date.
  const filtered = useMemo(() => {
    const bn = billNo.trim().toLowerCase();
    const ci = custId.trim().toLowerCase();
    const nm = nameQ.trim().toLowerCase();
    const dt = dateQ.trim().toLowerCase();
    return sales.filter(
      (s) =>
        (!bn || (s.invoiceNo ?? "").toLowerCase().includes(bn)) &&
        (!ci || (s.customerId ?? "").toLowerCase().includes(ci)) &&
        (!nm || (s.customerName ?? "").toLowerCase().includes(nm)) &&
        (!dt || (s.date ?? "").toLowerCase().includes(dt))
    );
  }, [sales, billNo, custId, nameQ, dateQ]);

  const totals = useMemo(
    () => ({
      salesAmt: filtered.reduce((a, s) => a + s.salesAmount, 0),
      disc: filtered.reduce((a, s) => a + s.discount, 0),
      totalAmt: filtered.reduce((a, s) => a + s.totalAmount, 0),
      roundOff: 0,
    }),
    [filtered]
  );

  // Default to the first bill, and keep the selection within range.
  useEffect(() => {
    setSelectedIndex((i) => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)));
  }, [filtered.length]);
  useEffect(() => {
    setSelectedIndex(0);
  }, [isLoading]);

  // Scroll the highlighted bill into view as it moves.
  useEffect(() => {
    rowRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Open a saved bill in a NEW Billing tab for editing.
  const openForEdit = useCallback(
    async (s: Sale) => {
      try {
        const res = await apiClient.get(`/sales/${s.id}`);
        const sale = res.data?.sale ?? res.data ?? {};
        const items = (Array.isArray(sale.items) ? sale.items : []).map((it: any) => ({
          medicineId: it.medicineId,
          name: it.medicine?.name ?? "Item",
          code: it.medicine?.productCode != null ? String(it.medicine.productCode) : (it.medicine?.barcode ?? ""),
          batch: it.batch?.batchNumber ?? "",
          expiry: it.batch?.expiryDate ?? "",
          qty: Number(it.quantity ?? 1),
          mrp: Number(it.mrp ?? 0),
          rate: Number(it.saleRate ?? 0),
          gstPct: Number(it.gstRate ?? 0),
          discountPct: Number(it.discountPct ?? 0),
        }));
        const payload = {
          saleId: sale.id ?? s.id,
          invoiceNumber: sale.invoiceNumber ?? s.invoiceNo,
          customerId: sale.customerId ?? null,
          customerName: sale.customerName ?? sale.customer?.name ?? s.customerName ?? "",
          doctorName: sale.doctorName ?? s.doctorName ?? "",
          paymentMethod: String(sale.paymentMethod ?? "cash").toLowerCase(),
          items,
        };
        sessionStorage.setItem("pharma_edit_sale", JSON.stringify(payload));
        openModule("billing");
      } catch {
        toast.error("Could not load the bill for editing.");
      }
    },
    [openModule]
  );

  // Print a SINGLE patient bill (not the whole page). Fetches the full sale,
  // renders a compact invoice into a hidden iframe and prints only that.
  const printBill = useCallback(async (s: Sale) => {
    let sale: Record<string, any> = s;
    try {
      const res = await apiClient.get(`/sales/${s.id}`);
      sale = res.data?.sale ?? res.data ?? s;
    } catch {
      // fall back to the row data we already have
    }

    const esc = (v: unknown) =>
      String(v ?? "").replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
      );
    const money = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

    const items: any[] = Array.isArray(sale.items) ? sale.items : s.items ?? [];
    const gross = Number(sale.totalAmount ?? s.salesAmount ?? 0);
    const discount = Number(sale.discountAmount ?? s.discount ?? 0);
    const net = Number(sale.netAmount ?? s.totalAmount ?? gross - discount);
    const invoiceNo = esc(sale.invoiceNumber ?? s.invoiceNo);
    const customer = esc(sale.customerName ?? sale.customer?.name ?? s.customerName ?? "Walk-in");
    const doctor = esc(sale.doctorName ?? s.doctorName ?? "");
    const date = esc(formatDate(sale.saleDate ?? sale.createdAt ?? s.date));
    const payment = esc(String(sale.paymentMethod ?? s.paymentMethod ?? "CASH").toUpperCase());

    const rows = items
      .map((it, i) => {
        const name = esc(it.medicine?.name ?? it.medicineName ?? "Item");
        const batch = esc(it.batch?.batchNumber ?? it.batch ?? "");
        const qty = Number(it.quantity ?? it.qty ?? 0);
        const rate = Number(it.saleRate ?? it.rate ?? 0);
        const amount = Number(it.amount ?? qty * rate);
        return `<tr>
          <td>${i + 1}</td>
          <td class="l">${name}${batch ? `<div class="sub">B: ${batch}</div>` : ""}</td>
          <td class="r">${qty}</td>
          <td class="r">${money(rate)}</td>
          <td class="r">${money(amount)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${invoiceNo}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; margin: 0; padding: 16px; font-size: 12px; }
        h1 { font-size: 16px; margin: 0 0 2px; }
        .muted { color: #555; font-size: 11px; }
        .head { text-align: center; border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 8px; }
        .meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-bottom: 8px; font-size: 11px; }
        .meta b { color: #000; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 6px; border-bottom: 1px solid #eee; text-align: center; vertical-align: top; }
        th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
        td.l, th.l { text-align: left; }
        td.r, th.r { text-align: right; }
        .sub { color: #888; font-size: 9px; }
        .totals { margin-top: 10px; margin-left: auto; width: 200px; font-size: 12px; }
        .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
        .totals .grand { border-top: 1px solid #999; margin-top: 4px; padding-top: 4px; font-weight: 700; font-size: 13px; }
        .foot { text-align: center; margin-top: 16px; color: #777; font-size: 10px; }
      </style></head><body>
      <div class="head">
        <h1>PharmaERP</h1>
        <div class="muted">Tax Invoice</div>
      </div>
      <div class="meta">
        <span><b>Invoice:</b> ${invoiceNo}</span>
        <span><b>Date:</b> ${date}</span>
        <span><b>Patient:</b> ${customer}</span>
        ${doctor ? `<span><b>Doctor:</b> ${doctor}</span>` : ""}
        <span><b>Payment:</b> ${payment}</span>
      </div>
      <table>
        <thead><tr><th>#</th><th class="l">Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted">No items</td></tr>`}</tbody>
      </table>
      <div class="totals">
        <div><span>Gross</span><span>${money(gross)}</span></div>
        <div><span>Discount</span><span>- ${money(discount)}</span></div>
        <div class="grand"><span>Net Payable</span><span>${money(net)}</span></div>
      </div>
      <div class="foot">Thank you for your visit • Get well soon</div>
      </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      toast.error("Could not open the print view.");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const win = iframe.contentWindow!;
    const cleanup = () => setTimeout(() => iframe.remove(), 500);
    win.onafterprint = cleanup;
    setTimeout(() => {
      win.focus();
      win.print();
      cleanup();
    }, 150);
  }, []);

  // Keyboard navigation: ↑/↓ move the highlight, Enter views the bill.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (selected) return; // detail panel open — don't steal its keys
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const s = filtered[selectedIndex];
        if (s) setSelected(s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedIndex, selected]);

  const exportCSV = () => {
    const rows = [
      COLUMNS.filter((c) => c.key !== "options").map((c) => c.label),
      ...filtered.map((s) =>
        COLUMNS.filter((c) => c.key !== "options").map((c) => String(s[c.key as keyof Sale] ?? ""))
      ),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const whatsApp = (s: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = encodeURIComponent(
      `Thank you for your purchase!\nInvoice: ${s.invoiceNo}\nAmount: ${formatCurrency(s.totalAmount)}\nDate: ${s.date}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const iconBtn =
    "flex h-7 w-7 items-center justify-center rounded text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800";

  return (
    <PageContainer className="flex h-full flex-col space-y-2">
      <PageHeader
        title="Sales Orders"
        subtitle="Sales history & invoices"
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700">
              {filtered.length} records
            </span>
            <FilterSheet
              activeCount={activeFilterCount}
              recordCount={`${filtered.length} records`}
              onClear={() => { setBillNo(""); setCustId(""); setNameQ(""); setDateQ(""); }}
            >
              <FilterField label="Bill No">
                <SearchInput value={billNo} onChange={setBillNo} placeholder="Bill No" />
              </FilterField>
              <FilterField label="Customer ID">
                <SearchInput value={custId} onChange={setCustId} placeholder="ID" />
              </FilterField>
              <FilterField label="Patient Name">
                <SearchInput value={nameQ} onChange={setNameQ} placeholder="Name" />
              </FilterField>
              <FilterField label="Date">
                <SearchInput value={dateQ} onChange={setDateQ} placeholder="dd/mm/yy" />
              </FilterField>
            </FilterSheet>
          </div>
        }
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table className="text-xs [&_td]:py-1 [&_th]:h-8">
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead
                    key={String(c.key)}
                    className={cn(c.align === "right" && "text-right")}
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="p-0">
                    <Spinner />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="p-0">
                    <TableEmpty
                      icon={ShoppingCart}
                      title="No sales found"
                      description="Try a different customer name or date."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s, idx) => (
                  <TableRow
                    key={s.id}
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
                      setSelected(s);
                    }}
                  >
                    <TableCell className="whitespace-nowrap font-mono font-medium text-blue-600">
                      {s.invoiceNo}
                    </TableCell>
                    <TableCell>{s.customerName || "Walk-in"}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{s.doctorName}</TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {s.date}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {s.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-gray-600 dark:text-gray-400">
                      {s.discount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-gray-600 dark:text-gray-400">
                      {s.salesAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{s.user}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <button
                          className={iconBtn}
                          title="Print bill"
                          onClick={(e) => {
                            e.stopPropagation();
                            printBill(s);
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={iconBtn}
                          title="Edit in new billing tab"
                          onClick={(e) => {
                            e.stopPropagation();
                            openForEdit(s);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={cn(iconBtn, "hover:text-red-600")}
                          title="Cancel"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={iconBtn}
                          title="Return"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={cn(iconBtn, "text-green-600 hover:text-green-700")}
                          title="WhatsApp"
                          onClick={(e) => whatsApp(s, e)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-1.5">
          <div className="flex items-center gap-x-3 whitespace-nowrap text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              Sales Amt:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(totals.salesAmt)}
              </span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Total Return (Ctrl+E):{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(0)}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Total Disc:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(totals.disc)}
              </span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Ex Discount:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(0)}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Round Off:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(totals.roundOff)}
              </span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Total Amt:{" "}
              <span className="font-bold text-blue-700">
                {formatCurrency(totals.totalAmt + totals.roundOff)}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button className={cn(ds.btnPrimary, "h-7 px-2.5 text-xs")} onClick={() => router.push("/billing")}>
              <Plus className="h-3.5 w-3.5" /> Create New
            </button>
            <button className={cn(ds.btnOutline, "h-7 px-2.5 text-xs")} onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button className={cn(ds.btnOutline, "h-7 px-2.5 text-xs")} onClick={() => refetch()}>
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>
      </Panel>

      <SaleDetail
        sale={selected}
        onClose={() => setSelected(null)}
        onEdit={
          selected
            ? () => {
                const s = selected;
                setSelected(null);
                openForEdit(s);
              }
            : undefined
        }
      />

    </PageContainer>
  );
}

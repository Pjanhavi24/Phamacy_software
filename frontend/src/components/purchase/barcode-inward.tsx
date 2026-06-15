"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BarcodeItem {
  id: string;
  name: string;
  code: string;
  batch: string;
  expiry: string;
  mrp: number;
  qty: number; // received qty (default barcode count)
}

// A simple Code128-like visual barcode as inline SVG bars (prints reliably).
function barcodeSvg(value: string, width = 180, height = 38): string {
  const v = value || "000000";
  const bw = 2;
  let x = 0;
  let bars = "";
  for (const ch of v) {
    const code = ch.charCodeAt(0) % 16;
    const bits = [1, code % 2, (code >> 1) % 2, (code >> 2) % 2, (code >> 3) % 2, 0];
    for (const bit of bits) {
      if (bit) bars += `<rect x="${x}" y="0" width="${bw}" height="${height}" fill="#000"/>`;
      x += bw;
    }
  }
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${x} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function labelHtml(it: BarcodeItem): string {
  const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  return `<div class="label">
    <div class="name">${esc(it.name)}</div>
    <div class="bc">${barcodeSvg(it.code)}</div>
    <div class="code">${esc(it.code)}</div>
    <div class="meta"><span>B: ${esc(it.batch || "-")}</span><span>Exp: ${esc(it.expiry || "-")}</span></div>
    <div class="mrp">MRP &#8377;${Number(it.mrp || 0).toFixed(2)}</div>
  </div>`;
}

/** Print barcode labels (one per unit qty) for the given items via a hidden iframe. */
export function printBarcodeLabels(items: BarcodeItem[]): void {
  const labels = items.flatMap((it) => Array.from({ length: Math.max(0, it.qty) }, () => labelHtml(it))).join("");
  if (!labels) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Barcodes</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-wrap:wrap;gap:6px;padding:8px}
    .label{width:200px;border:1px solid #ddd;border-radius:4px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:2px}
    .name{font-weight:700;font-size:10px;text-align:center;line-height:1.1}
    .bc svg{display:block}
    .code{font-size:8px;letter-spacing:1px;color:#333}
    .meta{display:flex;gap:8px;font-size:8px;color:#555}
    .mrp{font-size:9px;font-weight:700}
    @media print{.label{break-inside:avoid}}
  </style></head><body>${labels}</body></html>`;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open(); doc.write(html); doc.close();
  const win = iframe.contentWindow!;
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.onafterprint = cleanup;
  setTimeout(() => { win.focus(); win.print(); cleanup(); }, 200);
}

/**
 * Full Inward Barcode window. Per-item: choose Print Barcode (Yes/No) and how
 * many labels to print. Keyboard: ↑/↓ move rows; in the qty input Enter commits
 * and moves to the next row. Top-right prints the chosen labels.
 */
export function FullInwardBarcodeDialog({
  items,
  open,
  onClose,
}: {
  items: BarcodeItem[];
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<Array<BarcodeItem & { print: boolean; printQty: number }>>([]);
  const [sel, setSel] = useState(0);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setRows(items.map((it) => ({ ...it, print: true, printQty: it.qty })));
      setSel(0);
    }
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "Escape") { onClose(); return; }
      if (el && el.tagName === "INPUT") return; // qty input handles its own keys
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(i + 1, rows.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, rows.length, onClose]);

  if (!open || !mounted) return null;

  const setRow = (i: number, patch: Partial<{ print: boolean; printQty: number }>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const doPrint = () => {
    const toPrint = rows.filter((r) => r.print && r.printQty > 0).map((r) => ({ ...r, qty: r.printQty }));
    printBarcodeLabels(toPrint);
  };


  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Full Inward — Print Barcodes</h3>
          <div className="flex items-center gap-2">
            <button onClick={doPrint} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              <Printer className="h-3.5 w-3.5" /> Print Barcode
            </button>
            <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-gray-100 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="w-10 px-2 py-2 text-left">Sr</th>
                <th className="px-2 py-2 text-left">Item Name</th>
                <th className="w-28 px-2 py-2 text-left">Batch</th>
                <th className="w-14 px-2 py-2 text-right">Qty</th>
                <th className="w-28 px-2 py-2 text-center">Print Barcode</th>
                <th className="w-24 px-2 py-2 text-center">Barcode Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSel(i)}
                    className={cn(
                      "border-b border-gray-100 dark:border-gray-800",
                      r.print === false ? "bg-red-50 dark:bg-red-950/30" : i === sel ? "bg-blue-50/70 dark:bg-blue-950/30" : ""
                    )}
                  >
                    <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-2 py-1.5 font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-600 dark:text-gray-400">{r.batch || "—"}</td>
                    <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{r.qty}</td>
                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-3">
                        {(["Yes", "No"] as const).map((opt) => (
                          <label key={opt} className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`print-${r.id}`}
                              className="h-3.5 w-3.5 accent-blue-600"
                              checked={r.print === (opt === "Yes")}
                              onChange={() => setRow(i, { print: opt === "Yes" })}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={(el) => { qtyRefs.current[i] = el; }}
                        type="number"
                        min={0}
                        max={r.qty}
                        value={r.print ? r.printQty : 0}
                        disabled={!r.print}
                        onChange={(e) => setRow(i, { printQty: Math.max(0, parseInt(e.target.value) || 0) })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const next = Math.min(i + 1, rows.length - 1);
                            setSel(next);
                            setTimeout(() => qtyRefs.current[next]?.focus(), 20);
                          }
                        }}
                        className="h-7 w-16 rounded border border-gray-300 bg-white px-1.5 text-center text-xs disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}

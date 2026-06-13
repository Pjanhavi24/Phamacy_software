"use client";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ReportFiltersComponent, ReportFilters } from "@/components/reports/report-filters";
import { ExportToolbar, exportCSV } from "@/components/reports/export-toolbar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/design-system";
import { ShoppingCart } from "lucide-react";
import { format, subDays } from "date-fns";

const MOCK_PURCHASES = Array.from({ length: 25 }, (_, i) => ({
  id: `PO-${500 + i}`,
  date: format(subDays(new Date(), 24 - i), "yyyy-MM-dd"),
  supplier: ["MedCare Pharma", "HealthLine Dist", "PharmaPlus", "DrugSupply Co", "MedStock Ltd"][i % 5],
  medicine: ["Paracetamol 500mg", "Amoxicillin 250mg", "Metformin 500mg", "Atorvastatin 10mg", "Cetirizine 10mg"][i % 5],
  batch: `BT${2024 + (i % 3)}${String(i % 12 + 1).padStart(2, "0")}`,
  qty: (i % 20) + 10,
  purchaseRate: [45, 38, 28, 95, 18][i % 5],
  mrp: [120, 85, 65, 210, 45][i % 5],
  taxableValue: [45, 38, 28, 95, 18][i % 5] * ((i % 20) + 10),
  cgst: [45, 38, 28, 95, 18][i % 5] * ((i % 20) + 10) * 0.06,
  sgst: [45, 38, 28, 95, 18][i % 5] * ((i % 20) + 10) * 0.06,
  igst: 0,
  total: [45, 38, 28, 95, 18][i % 5] * ((i % 20) + 10) * 1.12,
  store: i % 2 === 0 ? "Main Store" : "Branch 1",
  invoiceNo: `SI-${9000 + i}`,
}));

const chartData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  purchase: Math.floor(Math.random() * 80000) + 20000,
  gst: Math.floor(Math.random() * 10000) + 2000,
}));

export default function PurchaseReportPage() {
  const today = new Date();
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    endDate: today,
  });
  const [applied, setApplied] = useState(true);

  const filtered = useMemo(() => {
    return MOCK_PURCHASES.filter((r) => {
      if (filters.supplier && !r.supplier.toLowerCase().includes(filters.supplier.toLowerCase())) return false;
      if (filters.medicine && !r.medicine.toLowerCase().includes(filters.medicine.toLowerCase())) return false;
      if (filters.store && filters.store !== "all" && r.store !== filters.store) return false;
      return true;
    });
  }, [filters, applied]);

  const totals = useMemo(() => ({
    purchase: filtered.reduce((s, r) => s + r.total, 0),
    gst: filtered.reduce((s, r) => s + r.cgst + r.sgst, 0),
    taxable: filtered.reduce((s, r) => s + r.taxableValue, 0),
    invoices: filtered.length,
  }), [filtered]);

  return (
    <PageContainer>
      <PageHeader
        title="Purchase Report"
        subtitle="Detailed purchase analysis and supplier-wise breakdown"
        icon={ShoppingCart}
        actions={
          <ExportToolbar
            onExportCSV={() => exportCSV(filtered as unknown as Record<string, unknown>[], "purchase-report.csv")}
            onExportExcel={() => exportCSV(filtered as unknown as Record<string, unknown>[], "purchase-report.csv")}
            onExportPDF={() => window.print()}
          />
        }
      />

      <ReportFiltersComponent
        filters={filters}
        onChange={setFilters}
        showSupplier
        showMedicine
        showStore
        onApply={() => setApplied(!applied)}
        onReset={() => setFilters({ startDate: undefined, endDate: undefined })}
      />

      <Panel className="overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Purchase Details ({filtered.length} records)</h2>
        </div>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id}</TableCell>
                    <TableCell className="text-xs">{row.date}</TableCell>
                    <TableCell className="text-xs">{row.supplier}</TableCell>
                    <TableCell className="text-xs">{row.medicine}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{row.batch}</TableCell>
                    <TableCell className="text-xs">{row.qty}</TableCell>
                    <TableCell className="text-right text-xs">&#8377;{row.purchaseRate}</TableCell>
                    <TableCell className="text-right text-xs">&#8377;{row.taxableValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">&#8377;{row.cgst.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">&#8377;{row.sgst.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">&#8377;{row.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </Panel>
    </PageContainer>
  );
}

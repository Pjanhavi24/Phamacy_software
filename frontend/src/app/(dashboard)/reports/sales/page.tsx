"use client";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ReportFiltersComponent, ReportFilters } from "@/components/reports/report-filters";
import { ExportToolbar, exportCSV } from "@/components/reports/export-toolbar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/design-system";
import { TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";

const MOCK_SALES = Array.from({ length: 30 }, (_, i) => ({
  id: `INV-${1000 + i}`,
  date: format(subDays(new Date(), 29 - i), "yyyy-MM-dd"),
  customer: ["Rahul Sharma", "Priya Patel", "Walk-in", "Amit Singh", "Sunita Devi"][i % 5],
  medicine: ["Paracetamol 500mg", "Amoxicillin 250mg", "Metformin 500mg", "Atorvastatin 10mg", "Cetirizine 10mg"][i % 5],
  qty: (i % 10) + 1,
  mrp: [120, 85, 65, 210, 45][i % 5],
  discount: i % 3 === 0 ? 10 : 0,
  taxableValue: [100, 72, 55, 178, 38][i % 5] * ((i % 10) + 1),
  cgst: [6, 4.32, 3.3, 10.7, 2.28][i % 5] * ((i % 10) + 1),
  sgst: [6, 4.32, 3.3, 10.7, 2.28][i % 5] * ((i % 10) + 1),
  igst: 0,
  total: [112, 80.64, 61.6, 199.4, 42.56][i % 5] * ((i % 10) + 1),
  store: i % 2 === 0 ? "Main Store" : "Branch 1",
}));

const chartData = Array.from({ length: 15 }, (_, i) => ({
  date: format(subDays(new Date(), 14 - i), "dd MMM"),
  sales: Math.floor(Math.random() * 15000) + 5000,
  gst: Math.floor(Math.random() * 2000) + 500,
}));

export default function SalesReportPage() {
  const today = new Date();
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    endDate: today,
  });
  const [applied, setApplied] = useState(true);

  const filtered = useMemo(() => {
    return MOCK_SALES.filter((r) => {
      if (filters.customer && !r.customer.toLowerCase().includes(filters.customer.toLowerCase())) return false;
      if (filters.medicine && !r.medicine.toLowerCase().includes(filters.medicine.toLowerCase())) return false;
      if (filters.store && filters.store !== "all" && r.store !== filters.store) return false;
      return true;
    });
  }, [filters, applied]);

  const totals = useMemo(() => ({
    sales: filtered.reduce((s, r) => s + r.total, 0),
    gst: filtered.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0),
    discount: filtered.reduce((s, r) => s + (r.mrp * r.qty * r.discount) / 100, 0),
    invoices: filtered.length,
  }), [filtered]);

  const handleExportCSV = () => exportCSV(filtered as unknown as Record<string, unknown>[], "sales-report.csv");

  return (
    <PageContainer>
      <PageHeader
        title="Sales Report"
        subtitle="Detailed sales analysis and GST breakdown"
        icon={TrendingUp}
        actions={
          <ExportToolbar onExportCSV={handleExportCSV} onExportExcel={handleExportCSV} onExportPDF={() => window.print()} />
        }
      />

      <ReportFiltersComponent
        filters={filters}
        onChange={setFilters}
        showCustomer
        showMedicine
        showStore
        onApply={() => setApplied(!applied)}
        onReset={() => setFilters({ startDate: undefined, endDate: undefined })}
      />

      <Panel className="overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sales Details ({filtered.length} records)</h2>
        </div>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Store</TableHead>
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
                    <TableCell className="text-xs">{row.customer}</TableCell>
                    <TableCell className="text-xs">{row.medicine}</TableCell>
                    <TableCell className="text-xs">{row.qty}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{row.store}</Badge></TableCell>
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

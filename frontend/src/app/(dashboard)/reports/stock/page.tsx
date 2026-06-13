"use client";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportToolbar, exportCSV } from "@/components/reports/export-toolbar";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/design-system";
import { FilterSheet, FilterField } from "@/components/common/filter-sheet";
import { Boxes } from "lucide-react";

const STOCK_DATA = [
  { id: 1, name: "Paracetamol 500mg", category: "Tablet", batch: "BT202501", expiry: "2027-06", qty: 450, purchaseRate: 45, mrp: 120, store: "Main Store", status: "Good" },
  { id: 2, name: "Amoxicillin 250mg", category: "Capsule", batch: "BT202502", expiry: "2026-12", qty: 120, purchaseRate: 38, mrp: 85, store: "Main Store", status: "Good" },
  { id: 3, name: "Metformin 500mg", category: "Tablet", batch: "BT202503", expiry: "2026-08", qty: 30, purchaseRate: 28, mrp: 65, store: "Branch 1", status: "Low" },
  { id: 4, name: "Atorvastatin 10mg", category: "Tablet", batch: "BT202504", expiry: "2026-03", qty: 15, purchaseRate: 95, mrp: 210, store: "Main Store", status: "Expiring" },
  { id: 5, name: "Cetirizine 10mg", category: "Tablet", batch: "BT202505", expiry: "2027-09", qty: 200, purchaseRate: 18, mrp: 45, store: "Branch 1", status: "Good" },
  { id: 6, name: "Pantoprazole 40mg", category: "Tablet", batch: "BT202506", expiry: "2027-01", qty: 90, purchaseRate: 55, mrp: 140, store: "Main Store", status: "Good" },
  { id: 7, name: "Azithromycin 500mg", category: "Tablet", batch: "BT202507", expiry: "2026-06", qty: 8, purchaseRate: 72, mrp: 165, store: "Main Store", status: "Expiring" },
  { id: 8, name: "Metronidazole 400mg", category: "Tablet", batch: "BT202508", expiry: "2028-03", qty: 350, purchaseRate: 22, mrp: 55, store: "Branch 1", status: "Good" },
  { id: 9, name: "Cough Syrup 100ml", category: "Syrup", batch: "BT202509", expiry: "2026-11", qty: 45, purchaseRate: 68, mrp: 150, store: "Main Store", status: "Good" },
  { id: 10, name: "Betadine 100ml", category: "Ointment", batch: "BT202510", expiry: "2027-05", qty: 25, purchaseRate: 110, mrp: 245, store: "Branch 1", status: "Low" },
].map((r) => ({
  ...r,
  purchaseValue: r.qty * r.purchaseRate,
  mrpValue: r.qty * r.mrp,
  profitPotential: r.qty * (r.mrp - r.purchaseRate),
  margin: (((r.mrp - r.purchaseRate) / r.mrp) * 100).toFixed(1),
}));

const CATEGORY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function StockReportPage() {
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => STOCK_DATA.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (storeFilter !== "all" && r.store !== storeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    return true;
  }), [search, storeFilter, statusFilter, categoryFilter]);

  const totals = useMemo(() => ({
    mrpValue: filtered.reduce((s, r) => s + r.mrpValue, 0),
    purchaseValue: filtered.reduce((s, r) => s + r.purchaseValue, 0),
    profit: filtered.reduce((s, r) => s + r.profitPotential, 0),
    items: filtered.length,
  }), [filtered]);

  const categoryChart = useMemo(() => {
    const map: Record<string, number> = {};
    STOCK_DATA.forEach((r) => { map[r.category] = (map[r.category] || 0) + r.mrpValue; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, []);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { Good: "bg-green-100 dark:bg-green-950/40 text-green-700", Low: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700", Expiring: "bg-red-100 dark:bg-red-950/40 text-red-700" };
    return <Badge className={`text-xs ${map[s] || ""}`}>{s}</Badge>;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Stock Report & Valuation"
        subtitle="Current stock levels, MRP value, and profit potential"
        icon={Boxes}
      />

      <div className="flex items-center gap-2">
        <Input className="h-9 text-sm max-w-sm" placeholder="Search medicine..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="ml-auto flex items-center gap-2">
        <FilterSheet
          activeCount={[storeFilter, statusFilter, categoryFilter].filter((v) => v !== "all").length}
          recordCount={`${filtered.length} items`}
          onClear={() => { setStoreFilter("all"); setStatusFilter("all"); setCategoryFilter("all"); }}
        >
          <FilterField label="Store">
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                <SelectItem value="Main Store">Main Store</SelectItem>
                <SelectItem value="Branch 1">Branch 1</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Stock Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Low">Low Stock</SelectItem>
                <SelectItem value="Expiring">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Category">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Tablet">Tablet</SelectItem>
                <SelectItem value="Syrup">Syrup</SelectItem>
                <SelectItem value="Ointment">Ointment</SelectItem>
                <SelectItem value="Capsule">Capsule</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </FilterSheet>
        <ExportToolbar
          onExportCSV={() => exportCSV(filtered as unknown as Record<string, unknown>[], "stock-report.csv")}
          onExportExcel={() => exportCSV(filtered as unknown as Record<string, unknown>[], "stock-report.csv")}
          onExportPDF={() => window.print()}
        />
        </div>
      </div>

      <Panel className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Stock Details ({filtered.length} items)</h2>
          </div>
          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Purchase Val.</TableHead>
                    <TableHead className="text-right">MRP Val.</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                        No stock matches the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium whitespace-nowrap">{r.name}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.category}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.expiry}</TableCell>
                      <TableCell className="text-right text-xs">{r.qty}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">&#8377;{r.purchaseValue.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">&#8377;{r.mrpValue.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-green-600">&#8377;{r.profitPotential.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs">{r.margin}%</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {filtered.length > 0 && (
                  <TableFooter>
                    <TableRow className="bg-gray-50 font-semibold dark:bg-gray-900/50">
                      <TableCell colSpan={3} className="text-xs">Total — {totals.items} item(s)</TableCell>
                      <TableCell className="text-right text-xs">{filtered.reduce((s, r) => s + r.qty, 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">&#8377;{totals.purchaseValue.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">&#8377;{totals.mrpValue.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-green-600">&#8377;{totals.profit.toLocaleString("en-IN")}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
      </Panel>
    </PageContainer>
  );
}

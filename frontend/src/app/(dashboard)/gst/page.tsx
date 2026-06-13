"use client";

import { useState } from "react";
import {
  FileJson,
  FileSpreadsheet,
  Printer,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/design-system";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// ---- Types ----
interface GSTInvoice {
  invoiceNo: string;
  date: string;
  customer: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  rate: string;
}

interface GSTR3BRow {
  description: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
}

// ---- Mock Data ----
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const mockGSTR1: GSTInvoice[] = [
  { invoiceNo: "PHR-1001", date: "01/06/2026", customer: "Rajesh Kumar", taxableValue: 1060, cgst: 53, sgst: 53, igst: 0, total: 1166, rate: "10%" },
  { invoiceNo: "PHR-1002", date: "01/06/2026", customer: "City Hospital", taxableValue: 8500, cgst: 425, sgst: 425, igst: 0, total: 9350, rate: "10%" },
  { invoiceNo: "PHR-1003", date: "02/06/2026", customer: "Walk-in", taxableValue: 280, cgst: 7, sgst: 7, igst: 0, total: 294, rate: "5%" },
  { invoiceNo: "PHR-1004", date: "02/06/2026", customer: "Sunita Sharma", taxableValue: 420, cgst: 21, sgst: 21, igst: 0, total: 462, rate: "10%" },
  { invoiceNo: "PHR-1005", date: "03/06/2026", customer: "Amit Verma", taxableValue: 2850, cgst: 142.5, sgst: 142.5, igst: 0, total: 3135, rate: "10%" },
  { invoiceNo: "PHR-1006", date: "03/06/2026", customer: "Priya Singh", taxableValue: 650, cgst: 32.5, sgst: 32.5, igst: 0, total: 715, rate: "10%" },
  { invoiceNo: "PHR-1007", date: "04/06/2026", customer: "State Pharmacy", taxableValue: 15200, cgst: 0, sgst: 0, igst: 1520, total: 16720, rate: "10%" },
  { invoiceNo: "PHR-1008", date: "04/06/2026", customer: "Walk-in", taxableValue: 190, cgst: 4.75, sgst: 4.75, igst: 0, total: 199.5, rate: "5%" },
  { invoiceNo: "PHR-1009", date: "05/06/2026", customer: "Deepak Joshi", taxableValue: 1680, cgst: 84, sgst: 84, igst: 0, total: 1848, rate: "10%" },
  { invoiceNo: "PHR-1010", date: "05/06/2026", customer: "Meena Patel", taxableValue: 490, cgst: 24.5, sgst: 24.5, igst: 0, total: 539, rate: "10%" },
];

const mockGSTR3B: GSTR3BRow[] = [
  { description: "Outward Taxable Supplies (5% GST)", taxableValue: 12400, igst: 0, cgst: 310, sgst: 310 },
  { description: "Outward Taxable Supplies (12% GST)", taxableValue: 8200, igst: 0, cgst: 492, sgst: 492 },
  { description: "Outward Taxable Supplies (18% GST)", taxableValue: 3600, igst: 0, cgst: 324, sgst: 324 },
  { description: "Zero-Rated / Exempt Supplies", taxableValue: 2100, igst: 0, cgst: 0, sgst: 0 },
  { description: "Inter-State Supplies (IGST)", taxableValue: 15200, igst: 1520, cgst: 0, sgst: 0 },
];

const summaryData = {
  totalTaxable: 41500,
  cgst: 1232,
  sgst: 1232,
  igst: 1520,
  totalGST: 3984,
  inputTaxCredit: 1840,
  netTaxLiability: 2144,
};

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

export default function GSTPage() {
  const currentDate = new Date();
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState(String(currentDate.getFullYear()));

  // In production: fetch from GET /api/v1/reports/gst?month={month}&year={year}

  const totalTaxable = mockGSTR1.reduce((s, r) => s + r.taxableValue, 0);
  const totalCGST = mockGSTR1.reduce((s, r) => s + r.cgst, 0);
  const totalSGST = mockGSTR1.reduce((s, r) => s + r.sgst, 0);
  const totalIGST = mockGSTR1.reduce((s, r) => s + r.igst, 0);
  const totalInvoice = mockGSTR1.reduce((s, r) => s + r.total, 0);

  const years = Array.from({ length: 5 }, (_, i) => String(currentDate.getFullYear() - i));

  return (
    <PageContainer>
      <PageHeader
        title="GST Reports"
        subtitle="GSTR-1, GSTR-3B and GST summary"
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-2" size="sm">
              <FileJson className="w-4 h-4" />
              JSON
            </Button>
            <Button variant="outline" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-2" size="sm">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-2" size="sm">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="gstr1">
        <TabsList className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <TabsTrigger value="gstr1" className="data-[state=active]:bg-blue-600 text-gray-500 dark:text-gray-400 data-[state=active]:text-white">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b" className="data-[state=active]:bg-blue-600 text-gray-500 dark:text-gray-400 data-[state=active]:text-white">GSTR-3B</TabsTrigger>
          <TabsTrigger value="summary" className="data-[state=active]:bg-blue-600 text-gray-500 dark:text-gray-400 data-[state=active]:text-white">GST Summary</TabsTrigger>
        </TabsList>

        {/* GSTR-1 */}
        <TabsContent value="gstr1" className="mt-4">
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-gray-900 dark:text-gray-100 text-base">
                  GSTR-1 — {MONTHS[parseInt(month) - 1]} {year}
                </CardTitle>
                <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-xs">
                  {mockGSTR1.length} Invoices
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-200 text-xs">Invoice #</TableHead>
                      <TableHead className="text-gray-200 text-xs">Date</TableHead>
                      <TableHead className="text-gray-200 text-xs">Customer</TableHead>
                      <TableHead className="text-gray-200 text-xs">GST Rate</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">Taxable Value</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">CGST</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">SGST</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">IGST</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockGSTR1.map((row) => (
                      <TableRow key={row.invoiceNo} className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm font-mono">{row.invoiceNo}</TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{row.date}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{row.customer}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs">{row.rate}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm text-right">{formatINR(row.taxableValue)}</TableCell>
                        <TableCell className="text-blue-400 text-sm text-right">
                          {row.cgst > 0 ? formatINR(row.cgst) : <span className="text-gray-600 dark:text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-blue-600 text-sm text-right">
                          {row.sgst > 0 ? formatINR(row.sgst) : <span className="text-gray-600 dark:text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-amber-400 text-sm text-right">
                          {row.igst > 0 ? formatINR(row.igst) : <span className="text-gray-600 dark:text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100 text-sm font-semibold text-right">{formatINR(row.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Totals row */}
              <div className="flex justify-end border-t border-gray-200 dark:border-gray-800 px-4 py-3">
                <div className="grid grid-cols-5 gap-8 text-sm">
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Taxable</p>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">{formatINR(totalTaxable)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">CGST</p>
                    <p className="text-blue-400 font-semibold">{formatINR(totalCGST)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">SGST</p>
                    <p className="text-blue-600 font-semibold">{formatINR(totalSGST)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">IGST</p>
                    <p className="text-amber-400 font-semibold">{formatINR(totalIGST)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                    <p className="text-green-400 font-bold">{formatINR(totalInvoice)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GSTR-3B */}
        <TabsContent value="gstr3b" className="mt-4">
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-900 dark:text-gray-100 text-base">
                GSTR-3B — {MONTHS[parseInt(month) - 1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-200 text-xs">Nature of Supply</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">Taxable Value</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">IGST</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">CGST</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">SGST</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">Total GST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockGSTR3B.map((row, i) => (
                      <TableRow key={i} className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{row.description}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm text-right">{formatINR(row.taxableValue)}</TableCell>
                        <TableCell className="text-amber-400 text-sm text-right">
                          {row.igst > 0 ? formatINR(row.igst) : <span className="text-gray-600 dark:text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-blue-400 text-sm text-right">
                          {row.cgst > 0 ? formatINR(row.cgst) : <span className="text-gray-600 dark:text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-blue-600 text-sm text-right">
                          {row.sgst > 0 ? formatINR(row.sgst) : <span className="text-gray-600 dark:text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100 font-semibold text-sm text-right">
                          {formatINR(row.igst + row.cgst + row.sgst)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Total Tax Liability (Output)</p>
                    <p className="text-red-400 text-xl font-bold mt-1">{formatINR(summaryData.totalGST)}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Input Tax Credit (ITC)</p>
                    <p className="text-green-400 text-xl font-bold mt-1">{formatINR(summaryData.inputTaxCredit)}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Net Tax Payable</p>
                    <p className="text-gray-900 dark:text-gray-100 text-xl font-bold mt-1">{formatINR(summaryData.netTaxLiability)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Summary */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Output Tax */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100 text-base">Output Tax (Collected from Sales)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Taxable Value of Sales", value: summaryData.totalTaxable, color: "text-gray-900" },
                  { label: "CGST @ 5%/6%/9%", value: summaryData.cgst, color: "text-blue-400" },
                  { label: "SGST @ 5%/6%/9%", value: summaryData.sgst, color: "text-blue-600" },
                  { label: "IGST", value: summaryData.igst, color: "text-amber-400" },
                  { label: "Total Output GST", value: summaryData.totalGST, color: "text-green-400", bold: true },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center justify-between py-2 ${item.bold ? "border-t border-gray-200 dark:border-gray-800 font-semibold" : ""}`}>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{item.label}</span>
                    <span className={`text-sm font-medium ${item.color}`}>{formatINR(item.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Input Tax Credit */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100 text-base">Input Tax Credit & Net Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "ITC on Purchases (CGST)", value: 920, color: "text-blue-400" },
                  { label: "ITC on Purchases (SGST)", value: 920, color: "text-blue-600" },
                  { label: "Total ITC Available", value: summaryData.inputTaxCredit, color: "text-cyan-400", bold: false },
                  { label: "Total Output GST", value: summaryData.totalGST, color: "text-green-400" },
                  { label: "Net Tax Payable (Output - ITC)", value: summaryData.netTaxLiability, color: "text-red-400", bold: true },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center justify-between py-2 ${item.bold ? "border-t border-gray-200 dark:border-gray-800 font-semibold" : ""}`}>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{item.label}</span>
                    <span className={`text-sm font-medium ${item.color}`}>{formatINR(item.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* HSN Summary */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100 text-base">HSN-wise Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-200 text-xs">HSN Code</TableHead>
                      <TableHead className="text-gray-200 text-xs">Description</TableHead>
                      <TableHead className="text-gray-200 text-xs text-center">GST Rate</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">Qty (Units)</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">Taxable Value</TableHead>
                      <TableHead className="text-gray-200 text-xs text-right">Total GST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { hsn: "3004", desc: "Medicaments (antibiotics)", rate: "12%", qty: 1240, taxable: 18400, gst: 2208 },
                      { hsn: "3004", desc: "Medicaments (vitamins)", rate: "5%", qty: 860, taxable: 9200, gst: 460 },
                      { hsn: "3003", desc: "Other pharmaceutical preps", rate: "18%", qty: 420, taxable: 5800, gst: 1044 },
                      { hsn: "3006", desc: "Pharmaceutical goods (misc)", rate: "12%", qty: 340, taxable: 4100, gst: 492 },
                      { hsn: "9018", desc: "Medical instruments/devices", rate: "12%", qty: 80, taxable: 4000, gst: 480 },
                    ].map((r, i) => (
                      <TableRow key={i} className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm font-mono">{r.hsn}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{r.desc}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs">{r.rate}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400 text-sm text-right">{r.qty.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm text-right">{formatINR(r.taxable)}</TableCell>
                        <TableCell className="text-green-400 text-sm font-medium text-right">{formatINR(r.gst)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

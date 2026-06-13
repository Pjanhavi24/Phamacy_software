"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExportToolbar, exportCSV, exportJSON } from "@/components/reports/export-toolbar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/design-system";
import { CheckCircle2, Receipt } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const QUARTERS = ["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"];

const GSTR1_DATA = Array.from({ length: 20 }, (_, i) => ({
  invoiceNo: `INV-${1000 + i}`,
  invoiceDate: `2026-05-${String(i + 1).padStart(2, "0")}`,
  customerGSTIN: i % 3 === 0 ? `29ABCDE${1234 + i}F1Z5` : "",
  customerName: ["Rahul Sharma", "Walk-in", "City Hospital", "HealthCare Pvt", "Priya Patel"][i % 5],
  placeOfSupply: "Karnataka",
  invoiceValue: [1120, 896, 616, 1994, 425][i % 5] * ((i % 3) + 1),
  taxableValue: [1000, 800, 550, 1780, 380][i % 5] * ((i % 3) + 1),
  cgst: [60, 48, 33, 106.8, 22.8][i % 5] * ((i % 3) + 1),
  sgst: [60, 48, 33, 106.8, 22.8][i % 5] * ((i % 3) + 1),
  igst: 0,
  gstRate: [12, 12, 12, 12, 12][i % 5],
  type: i % 4 === 0 ? "B2B" : "B2C",
}));

const GSTR3B_DATA = {
  outwardSupplies: {
    taxableValue: 285600,
    integratedTax: 0,
    centralTax: 17136,
    stateTax: 17136,
    cess: 0,
  },
  inwardSuppliesReverseCharge: {
    taxableValue: 0,
    integratedTax: 0,
    centralTax: 0,
    stateTax: 0,
    cess: 0,
  },
  itcAvailed: {
    integratedTax: 0,
    centralTax: 12500,
    stateTax: 12500,
    cess: 0,
  },
  taxPayable: {
    integratedTax: 0,
    centralTax: 4636,
    stateTax: 4636,
    cess: 0,
  },
  taxPaid: {
    throughItc: { cgst: 12500, sgst: 12500, igst: 0 },
    throughCash: { cgst: 4636, sgst: 4636, igst: 0 },
  },
};

const SUMMARY_DATA = [
  { rate: "5%", taxable: 45000, cgst: 1125, sgst: 1125, igst: 0, total: 47250 },
  { rate: "12%", taxable: 180000, cgst: 10800, sgst: 10800, igst: 0, total: 201600 },
  { rate: "18%", taxable: 60600, cgst: 5454, sgst: 5454, igst: 0, total: 71508 },
  { rate: "0%", taxable: 15200, cgst: 0, sgst: 0, igst: 0, total: 15200 },
];

export default function GSTReportPage() {
  const [month, setMonth] = useState("4");
  const [year, setYear] = useState("2026");
  const [quarter, setQuarter] = useState("1");

  const gstr1Json = {
    gstin: "29AAACR5055K1Z5",
    fp: `${String(parseInt(month) + 1).padStart(2, "0")}${year}`,
    b2b: GSTR1_DATA.filter((r) => r.type === "B2B").map((r) => ({
      ctin: r.customerGSTIN,
      inv: [{ inum: r.invoiceNo, idt: r.invoiceDate, val: r.invoiceValue, pos: "29", rchrg: "N", inv_typ: "R",
        itms: [{ num: 1, itm_det: { txval: r.taxableValue, rt: r.gstRate, camt: r.cgst, samt: r.sgst, iamt: r.igst } }] }],
    })),
    b2cs: GSTR1_DATA.filter((r) => r.type === "B2C").map((r) => ({
      typ: "OE", pos: "29", rt: r.gstRate, txval: r.taxableValue, camt: r.cgst, samt: r.sgst, iamt: r.igst,
    })),
  };

  return (
    <PageContainer>
      <PageHeader
        title="GST Reports"
        subtitle="GSTR-1, GSTR-3B and GST Summary Reports"
        icon={Receipt}
        actions={
          <Badge className="bg-green-100 dark:bg-green-950/40 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />GSTIN: 29AAACR5055K1Z5</Badge>
        }
      />

      <Panel className="flex gap-4 items-end p-4">
        <div>
          <Label className="text-xs">Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)} className="text-xs">{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025" className="text-xs">2025-26</SelectItem>
              <SelectItem value="2026" className="text-xs">2026-27</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Quarter (for 3B)</Label>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{QUARTERS.map((q, i) => <SelectItem key={i} value={String(i + 1)} className="text-xs">{q}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Panel>

      <Tabs defaultValue="gstr1">
        <TabsList>
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
          <TabsTrigger value="summary">GST Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr1" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{GSTR1_DATA.length} outward supply invoices</p>
            <ExportToolbar
              showJSON
              onExportJSON={() => exportJSON(gstr1Json, `GSTR1_${month}_${year}.json`)}
              onExportExcel={() => exportCSV(GSTR1_DATA as unknown as Record<string, unknown>[], "GSTR1.csv")}
              onExportCSV={() => exportCSV(GSTR1_DATA as unknown as Record<string, unknown>[], "GSTR1.csv")}
              title="Download GSTR-1"
            />
          </div>
          <Panel className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-right">Invoice Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {GSTR1_DATA.map((r) => (
                      <TableRow key={r.invoiceNo}>
                        <TableCell className="font-mono text-xs">{r.invoiceNo}</TableCell>
                        <TableCell className="text-xs">{r.invoiceDate}</TableCell>
                        <TableCell className="text-xs">{r.customerName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.customerGSTIN || "-"}</TableCell>
                        <TableCell><Badge variant={r.type === "B2B" ? "default" : "secondary"} className="text-xs">{r.type}</Badge></TableCell>
                        <TableCell className="text-xs">{r.gstRate}%</TableCell>
                        <TableCell className="text-right text-xs">&#8377;{r.taxableValue.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">&#8377;{r.cgst.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">&#8377;{r.sgst.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">&#8377;{r.igst.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs font-medium">&#8377;{r.invoiceValue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 dark:bg-gray-800/50 font-semibold">
                      <TableCell colSpan={6} className="text-xs">Total</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR1_DATA.reduce((s, r) => s + r.taxableValue, 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR1_DATA.reduce((s, r) => s + r.cgst, 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR1_DATA.reduce((s, r) => s + r.sgst, 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs">&#8377;0.00</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR1_DATA.reduce((s, r) => s + r.invoiceValue, 0).toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
          </Panel>
        </TabsContent>

        <TabsContent value="gstr3b" className="space-y-4">
          <div className="flex justify-end">
            <ExportToolbar
              onExportExcel={() => {}}
              onExportPDF={() => window.print()}
              title="Download GSTR-3B"
            />
          </div>
          <div className="grid gap-4">
            <Panel className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">3.1 Outward Taxable Supplies</h3>
              </div>
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nature</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">Integrated Tax</TableHead>
                      <TableHead className="text-right">Central Tax</TableHead>
                      <TableHead className="text-right">State/UT Tax</TableHead>
                      <TableHead className="text-right">Cess</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["(a) Outward taxable supplies (other than zero rated, nil and exempted)", GSTR3B_DATA.outwardSupplies],
                      ["(b) Outward taxable supplies (zero rated)", { taxableValue: 0, integratedTax: 0, centralTax: 0, stateTax: 0, cess: 0 }],
                      ["(c) Other outward supplies (Nil rated, exempted)", { taxableValue: 0, integratedTax: 0, centralTax: 0, stateTax: 0, cess: 0 }],
                    ].map(([label, vals]) => (
                      <TableRow key={label as string}>
                        <TableCell className="text-xs">{label as string}</TableCell>
                        {["taxableValue","integratedTax","centralTax","stateTax","cess"].map((k) => (
                          <TableCell key={k} className="text-right text-xs">&#8377;{((vals as Record<string,number>)[k]).toLocaleString("en-IN")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">4. Eligible ITC</h3>
              </div>
              <div className="p-4">
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">6. Payment of Tax</h3>
              </div>
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST/UTGST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs">Tax payable</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR3B_DATA.taxPayable.integratedTax}</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR3B_DATA.taxPayable.centralTax.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR3B_DATA.taxPayable.stateTax.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Paid through ITC</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR3B_DATA.taxPaid.throughItc.igst}</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR3B_DATA.taxPaid.throughItc.cgst.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs">&#8377;{GSTR3B_DATA.taxPaid.throughItc.sgst.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                    <TableRow className="bg-green-50 dark:bg-green-950/40">
                      <TableCell className="text-xs font-semibold">Paid through Cash</TableCell>
                      <TableCell className="text-right text-xs font-semibold">&#8377;{GSTR3B_DATA.taxPaid.throughCash.igst}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">&#8377;{GSTR3B_DATA.taxPaid.throughCash.cgst.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">&#8377;{GSTR3B_DATA.taxPaid.throughCash.sgst.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="flex justify-end">
            <ExportToolbar
              onExportCSV={() => exportCSV(SUMMARY_DATA as unknown as Record<string, unknown>[], "gst-summary.csv")}
              onExportExcel={() => exportCSV(SUMMARY_DATA as unknown as Record<string, unknown>[], "gst-summary.csv")}
              title="Export Summary"
            />
          </div>
          <Panel className="overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">GST Summary by Rate</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GST Rate</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SUMMARY_DATA.map((r) => (
                    <TableRow key={r.rate}>
                      <TableCell><Badge variant="outline">{r.rate}</Badge></TableCell>
                      <TableCell className="text-right">&#8377;{r.taxable.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">&#8377;{r.cgst.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">&#8377;{r.sgst.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">&#8377;{r.igst.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right font-medium">&#8377;{r.total.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

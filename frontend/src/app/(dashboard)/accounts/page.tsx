"use client";

import {
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  IndianRupee,
  BarChart2,
  Wallet,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, Panel } from "@/components/design-system";

// ---- Types ----
interface DayBookEntry {
  id: number;
  date: string;
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  type: "opening" | "receipt" | "payment";
}

interface CashEntry {
  id: number;
  date: string;
  particulars: string;
  voucherNo: string;
  debit: number;
  credit: number;
  balance: number;
}

interface SupplierLedgerRow {
  id: number;
  supplier: string;
  openingBalance: number;
  totalPurchase: number;
  totalPayment: number;
  closingBalance: number;
}

interface PnLItem {
  label: string;
  value: number;
  type: "income" | "expense" | "profit" | "section";
  indent?: boolean;
}

// ---- Mock Data (replace with GET /api/v1/reports/sales) ----
const dayBookEntries: DayBookEntry[] = [
  { id: 1, date: "01/06/2026", voucherNo: "OB-001", particulars: "Opening Balance", debit: 0, credit: 0, balance: 12500, type: "opening" },
  { id: 2, date: "01/06/2026", voucherNo: "INV-1042", particulars: "Cash Sale — Rajesh Kumar", debit: 2850, credit: 0, balance: 15350, type: "receipt" },
  { id: 3, date: "01/06/2026", voucherNo: "PO-204", particulars: "Purchase Payment — M/s Sun Pharma", debit: 0, credit: 8500, balance: 6850, type: "payment" },
  { id: 4, date: "01/06/2026", voucherNo: "INV-1043", particulars: "Cash Sale — Walk-in", debit: 1200, credit: 0, balance: 8050, type: "receipt" },
  { id: 5, date: "01/06/2026", voucherNo: "INV-1044", particulars: "UPI Collection — Sunita Sharma", debit: 3600, credit: 0, balance: 11650, type: "receipt" },
  { id: 6, date: "01/06/2026", voucherNo: "EXP-88", particulars: "Expense — Rent", debit: 0, credit: 5000, balance: 6650, type: "payment" },
  { id: 7, date: "01/06/2026", voucherNo: "INV-1045", particulars: "Cash Sale — Walk-in", debit: 450, credit: 0, balance: 7100, type: "receipt" },
];

const cashLedgerEntries: CashEntry[] = [
  { id: 1, date: "28/05/2026", particulars: "Cash Sales", voucherNo: "INV-1038", debit: 3200, credit: 0, balance: 9800 },
  { id: 2, date: "29/05/2026", particulars: "Purchase Payment", voucherNo: "PO-204", debit: 0, credit: 12000, balance: -2200 },
  { id: 3, date: "29/05/2026", particulars: "Cash Sales", voucherNo: "INV-1039", debit: 5100, credit: 0, balance: 2900 },
  { id: 4, date: "30/05/2026", particulars: "Cash Sales", voucherNo: "INV-1040", debit: 4750, credit: 0, balance: 7650 },
  { id: 5, date: "31/05/2026", particulars: "Expense Payment", voucherNo: "EXP-87", debit: 0, credit: 2000, balance: 5650 },
  { id: 6, date: "01/06/2026", particulars: "Cash Sales", voucherNo: "INV-1042", debit: 2850, credit: 0, balance: 8500 },
  { id: 7, date: "01/06/2026", particulars: "UPI Collection", voucherNo: "INV-1044", debit: 3600, credit: 0, balance: 12100 },
];

const supplierLedger: SupplierLedgerRow[] = [
  { id: 1, supplier: "M/s Sun Pharma", openingBalance: 24500, totalPurchase: 48000, totalPayment: 38500, closingBalance: 34000 },
  { id: 2, supplier: "Cipla Distributors", openingBalance: 8000, totalPurchase: 22000, totalPayment: 22000, closingBalance: 8000 },
  { id: 3, supplier: "Mankind Pharma", openingBalance: 0, totalPurchase: 15500, totalPayment: 10000, closingBalance: 5500 },
  { id: 4, supplier: "Abbott Healthcare", openingBalance: 12000, totalPurchase: 9000, totalPayment: 21000, closingBalance: 0 },
];

const pnlData: PnLItem[] = [
  { label: "REVENUE", value: 0, type: "section" },
  { label: "Gross Sales", value: 284500, type: "income", indent: true },
  { label: "Less: Returns & Discounts", value: -4200, type: "expense", indent: true },
  { label: "Net Revenue", value: 280300, type: "profit" },
  { label: "COST OF GOODS SOLD", value: 0, type: "section" },
  { label: "Opening Stock", value: 182000, type: "expense", indent: true },
  { label: "Add: Purchases", value: 198000, type: "expense", indent: true },
  { label: "Less: Closing Stock", value: -193800, type: "income", indent: true },
  { label: "Total COGS", value: 186200, type: "expense" },
  { label: "GROSS PROFIT", value: 94100, type: "profit" },
  { label: "OPERATING EXPENSES", value: 0, type: "section" },
  { label: "Staff Salary", value: 28000, type: "expense", indent: true },
  { label: "Rent", value: 12000, type: "expense", indent: true },
  { label: "Electricity & Utilities", value: 3200, type: "expense", indent: true },
  { label: "Miscellaneous Expenses", value: 1850, type: "expense", indent: true },
  { label: "Total Operating Expenses", value: 45050, type: "expense" },
  { label: "NET PROFIT", value: 49050, type: "profit" },
];

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Math.abs(v));
}

function CashCard({ title, value, sub, icon: Icon, positive }: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">{title}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1.5">{value}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{sub}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${positive === false ? "text-red-500" : positive ? "text-green-600" : "text-blue-600"}`} />
        </div>
      </div>
    </Panel>
  );
}

function DayBookTab() {
  const totalDebit = dayBookEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = dayBookEntries.reduce((s, e) => s + e.credit, 0);
  const closingBalance = dayBookEntries[dayBookEntries.length - 1]?.balance ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 items-center">
          <Input type="date" className="w-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100" defaultValue="2026-06-01" />
          <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-1">
            <Filter className="h-4 w-4" />Filter
          </Button>
        </div>
        <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-1">
          <Download className="h-4 w-4" />Export
        </Button>
      </div>

      <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-200 text-xs">Date</TableHead>
                  <TableHead className="text-gray-200 text-xs">Voucher #</TableHead>
                  <TableHead className="text-gray-200 text-xs">Particulars</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Debit (Dr)</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Credit (Cr)</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{entry.date}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm font-mono">{entry.voucherNo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{entry.particulars}</span>
                        {entry.type !== "opening" && (
                          <Badge
                            className={`text-xs px-1.5 py-0 ${
                              entry.type === "receipt"
                                ? "bg-green-100 dark:bg-green-950/40 text-green-700 border-green-200"
                                : "bg-red-100 dark:bg-red-950/40 text-red-700 border-red-200"
                            }`}
                            variant="outline"
                          >
                            {entry.type === "receipt" ? "Receipt" : "Payment"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-green-600 text-sm text-right">
                      {entry.debit > 0 ? formatINR(entry.debit) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-red-500 text-sm text-right">
                      {entry.credit > 0 ? formatINR(entry.credit) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${entry.balance < 0 ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>
                        {formatINR(entry.balance)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
            <div className="flex justify-end gap-8">
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total Receipts</p>
                <p className="text-green-600 text-sm font-bold">{formatINR(totalDebit)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total Payments</p>
                <p className="text-red-500 text-sm font-bold">{formatINR(totalCredit)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Closing Balance</p>
                <p className="text-gray-900 dark:text-gray-100 text-sm font-bold">{formatINR(closingBalance)}</p>
              </div>
            </div>
          </div>
      </Panel>
    </div>
  );
}

function CashLedgerTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 items-center">
          <Input type="date" className="w-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100" defaultValue="2026-05-28" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
          <Input type="date" className="w-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100" defaultValue="2026-06-01" />
          <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-1">
            <Filter className="h-4 w-4" />Filter
          </Button>
        </div>
        <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 gap-1">
          <Download className="h-4 w-4" />Export
        </Button>
      </div>

      <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-200 text-xs">Date</TableHead>
                  <TableHead className="text-gray-200 text-xs">Particulars</TableHead>
                  <TableHead className="text-gray-200 text-xs">Voucher No.</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Debit</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Credit</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashLedgerEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{entry.date}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{entry.particulars}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm font-mono">{entry.voucherNo}</TableCell>
                    <TableCell className="text-green-600 text-sm text-right">
                      {entry.debit > 0 ? formatINR(entry.debit) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-red-500 text-sm text-right">
                      {entry.credit > 0 ? formatINR(entry.credit) : <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${entry.balance < 0 ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>
                        {formatINR(entry.balance)}{entry.balance < 0 ? " Cr" : " Dr"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </Panel>
    </div>
  );
}

function PLSummaryTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* P&L Statement */}
      <Panel className="lg:col-span-2 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-gray-900 dark:text-gray-100 text-base font-semibold">Profit &amp; Loss Statement — June 2026</h2>
        </div>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-200 text-xs">Particulars</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pnlData.map((item, i) => {
                  if (item.type === "section") {
                    return (
                      <TableRow key={i} className="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <TableCell colSpan={2} className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider py-2">
                          {item.label}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  if (item.type === "profit") {
                    return (
                      <TableRow key={i} className="border-gray-200 dark:border-gray-800 border-t-2 border-t-gray-300 dark:border-t-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <TableCell className="text-gray-900 dark:text-gray-100 font-bold text-sm">{item.label}</TableCell>
                        <TableCell className={`text-right font-bold text-sm ${item.value >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {item.value < 0 ? "(" : ""}{formatINR(item.value)}{item.value < 0 ? ")" : ""}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={i} className="border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <TableCell className={`text-sm ${item.indent ? "text-gray-500 dark:text-gray-400 pl-8" : "text-gray-700 dark:text-gray-300 font-medium"}`}>
                        {item.label}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${item.type === "income" && item.value > 0 ? "text-green-600" : item.type === "expense" ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>
                        {item.value < 0 ? "(" : ""}{formatINR(item.value)}{item.value < 0 ? ")" : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
      </Panel>

      {/* KPI Snapshot */}
      <div className="flex flex-col gap-4">
        {[
          { label: "Net Revenue", value: 280300, icon: IndianRupee, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
          { label: "Total COGS", value: 186200, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
          { label: "Gross Profit", value: 94100, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40" },
          { label: "Operating Expenses", value: 45050, icon: BarChart2, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/40" },
          { label: "Net Profit", value: 49050, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
        ].map((item) => (
          <Panel key={item.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{item.label}</p>
                  <p className={`text-base font-bold ${item.color} truncate`}>{formatINR(item.value)}</p>
                </div>
              </div>
          </Panel>
        ))}

        {/* Margin */}
        <Panel className="p-4">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">Net Profit Margin</p>
            <p className="text-2xl font-bold text-emerald-600">17.5%</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-2">
              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: "17.5%" }} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Gross margin: 33.6%</p>
        </Panel>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Accounts"
        subtitle="Financial overview, ledger and profit & loss"
        icon={Wallet}
      />

      {/* Tabs */}
      <Tabs defaultValue="daybook">
        <TabsList className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <TabsTrigger value="daybook" className="data-[state=active]:bg-blue-600 text-gray-500 dark:text-gray-400 data-[state=active]:text-white">Day Book</TabsTrigger>
          <TabsTrigger value="cash" className="data-[state=active]:bg-blue-600 text-gray-500 dark:text-gray-400 data-[state=active]:text-white">Cash Ledger</TabsTrigger>
          <TabsTrigger value="pnl" className="data-[state=active]:bg-blue-600 text-gray-500 dark:text-gray-400 data-[state=active]:text-white">P&L Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="daybook" className="mt-4">
          <DayBookTab />
        </TabsContent>
        <TabsContent value="cash" className="mt-4">
          <CashLedgerTab />
        </TabsContent>
        <TabsContent value="pnl" className="mt-4">
          <PLSummaryTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

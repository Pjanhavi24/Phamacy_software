"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/design-system";
import {
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
  Calendar,
} from "lucide-react";

// ---- Types ----
interface DashboardStats {
  totalRevenue: number;
  totalBills: number;
  totalPurchases: number;
  grossProfit: number;
  revenueChange: number;
  billsChange: number;
  purchasesChange: number;
  profitChange: number;
}

interface SalesChartPoint {
  date: string;
  revenue: number;
  purchases: number;
}

interface TopMedicine {
  name: string;
  qty: number;
}

interface PaymentMethod {
  name: string;
  value: number;
  color: string;
}

interface Transaction {
  id: string;
  patient: string;
  items: number;
  amount: number;
  payment: string;
  time: string;
}

// ---- Mock Data (replace with API calls) ----
const mockStats: DashboardStats = {
  totalRevenue: 284500,
  totalBills: 342,
  totalPurchases: 198000,
  grossProfit: 86500,
  revenueChange: 12.4,
  billsChange: 8.1,
  purchasesChange: -3.2,
  profitChange: 18.7,
};

const today = new Date();
const mockSalesChart: SalesChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(today);
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    revenue: Math.floor(7000 + Math.random() * 6000),
    purchases: Math.floor(4000 + Math.random() * 4000),
  };
});

const mockTopMedicines: TopMedicine[] = [
  { name: "Paracetamol 500", qty: 520 },
  { name: "Amoxicillin 250", qty: 340 },
  { name: "Metformin 500", qty: 310 },
  { name: "Omeprazole 20", qty: 280 },
  { name: "Cetirizine 10", qty: 260 },
  { name: "Atorvastatin", qty: 230 },
  { name: "Azithromycin", qty: 210 },
  { name: "Pantoprazole", qty: 190 },
  { name: "Losartan 50", qty: 170 },
  { name: "Montelukast", qty: 150 },
];

const mockPaymentMethods: PaymentMethod[] = [
  { name: "Cash", value: 45, color: "#22c55e" },
  { name: "UPI", value: 30, color: "#3b82f6" },
  { name: "Card", value: 15, color: "#a855f7" },
  { name: "Credit", value: 10, color: "#f59e0b" },
];

const mockTransactions: Transaction[] = [
  { id: "PHR-1042", patient: "Rajesh Kumar", items: 4, amount: 1250, payment: "UPI", time: "10:32 AM" },
  { id: "PHR-1041", patient: "Sunita Sharma", items: 2, amount: 480, payment: "Cash", time: "10:15 AM" },
  { id: "PHR-1040", patient: "Amit Verma", items: 7, amount: 3200, payment: "Card", time: "09:58 AM" },
  { id: "PHR-1039", patient: "Priya Singh", items: 3, amount: 760, payment: "UPI", time: "09:44 AM" },
  { id: "PHR-1038", patient: "Walk-in", items: 1, amount: 320, payment: "Cash", time: "09:30 AM" },
  { id: "PHR-1037", patient: "Deepak Joshi", items: 5, amount: 1870, payment: "Credit", time: "09:12 AM" },
  { id: "PHR-1036", patient: "Meena Patel", items: 2, amount: 540, payment: "Cash", time: "08:55 AM" },
  { id: "PHR-1035", patient: "Walk-in", items: 1, amount: 90, payment: "Cash", time: "08:40 AM" },
  { id: "PHR-1034", patient: "Suresh Nair", items: 6, amount: 2100, payment: "UPI", time: "08:22 AM" },
  { id: "PHR-1033", patient: "Anita Roy", items: 3, amount: 650, payment: "Card", time: "08:10 AM" },
];

const paymentBadge: Record<string, string> = {
  Cash: "bg-green-100 dark:bg-green-950/40 text-green-700 border-green-200 dark:border-green-800",
  UPI: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 border-blue-200 dark:border-blue-800",
  Card: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 border-purple-200 dark:border-purple-800",
  Credit: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 border-amber-200 dark:border-amber-800",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 12,
};

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

function ChangeChip({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value)}% vs last month
    </span>
  );
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("month");
  const [stats] = useState<DashboardStats>(mockStats);

  // In production: fetch from GET /api/v1/dashboard/stats, /dashboard/sales-chart, etc.
  // useEffect(() => { fetch(`/api/v1/dashboard/stats?range=${dateRange}`).then(...) }, [dateRange]);

  return (
    <PageContainer>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Business performance overview"
        icon={BarChart3}
        actions={
          <>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-44">
                <Calendar className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </>
        }
      />

      {/* Recent Transactions */}
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-gray-900 dark:text-gray-100 text-base font-semibold">Recent Transactions</h2>
          <Link href="/sales">
            <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-xs">
              View All
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-200 text-xs">Invoice #</TableHead>
                  <TableHead className="text-gray-200 text-xs">Patient</TableHead>
                  <TableHead className="text-gray-200 text-xs text-center">Items</TableHead>
                  <TableHead className="text-gray-200 text-xs text-right">Amount</TableHead>
                  <TableHead className="text-gray-200 text-xs">Payment</TableHead>
                  <TableHead className="text-gray-200 text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                    <TableCell className="text-gray-700 dark:text-gray-300 text-sm font-mono">{tx.id}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{tx.patient}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm text-center">{tx.items}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100 text-sm font-semibold text-right">{formatINR(tx.amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${paymentBadge[tx.payment]}`}>
                        {tx.payment}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{tx.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </Panel>
    </PageContainer>
  );
}

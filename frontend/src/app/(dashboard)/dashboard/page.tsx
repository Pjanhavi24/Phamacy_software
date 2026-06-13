"use client";

import { useDashboardStats, useSalesChart, useTopMedicines } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  FileText,
  BarChart2,
  Pill,
  IndianRupee,
  TrendingUp,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  Spinner,
} from "@/components/design-system";
import StatCard from "@/components/common/stat-card";

// ---- Helpers ----
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ---- Page ----
export default function DashboardPage() {
  const { data: apiStats, isLoading: statsLoading } = useDashboardStats();
  const { data: apiChart } = useSalesChart(30);
  const { data: apiTopMeds } = useTopMedicines();

  const data = apiStats
    ? {
        stats: {
          todaySales: { title: "Today's Sales", value: apiStats.todaySales, change: 0 },
          todayPurchase: { title: "Today's Purchase", value: apiStats.todayPurchase, change: 0 },
          monthlyRevenue: { title: "Monthly Revenue", value: apiStats.monthlyRevenue, change: apiStats.revenueGrowth },
          monthlyProfit: { title: "Monthly Profit", value: apiStats.monthlyProfit, change: 0 },
        },
        alerts: {
          lowStock: apiStats.lowStockCount,
          expiringSoon: apiStats.expiringCount,
          outOfStock: apiStats.outOfStockCount,
        },
        salesVsPurchase: (apiChart ?? []).map((d: any) => ({
          date: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          sales: d.sales,
          purchase: d.purchase,
        })),
        topMedicines: apiTopMeds ?? [],
        paymentMethods: [
          { name: "Cash", value: 45 },
          { name: "UPI", value: 30 },
          { name: "Card", value: 15 },
          { name: "Credit", value: 10 },
        ],
        gstSummary: { totalTaxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0 },
      }
    : null;

  if (statsLoading) {
    return (
      <PageContainer>
        <Spinner />
      </PageContainer>
    );
  }

  if (!data) return null;

  const { stats, alerts, gstSummary } = data;

  const statCards = [
    { ...stats.todaySales, icon: IndianRupee, color: "blue" as const },
    { ...stats.todayPurchase, icon: ShoppingCart, color: "indigo" as const },
    { ...stats.monthlyRevenue, icon: TrendingUp, color: "green" as const },
    { ...stats.monthlyProfit, icon: Wallet, color: "purple" as const },
  ];

  const alertItems = [
    { icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, label: "Low Stock Medicines", count: alerts.lowStock },
    { icon: <Clock className="h-5 w-5 text-orange-500" />, label: "Expiring Within 90 Days", count: alerts.expiringSoon },
    { icon: <XCircle className="h-5 w-5 text-red-500" />, label: "Out of Stock", count: alerts.outOfStock },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        icon={LayoutDashboard}
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/billing"><Plus className="h-4 w-4 mr-1" />New Bill</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/purchase"><ShoppingCart className="h-4 w-4 mr-1" />New Purchase</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/medicines"><Pill className="h-4 w-4 mr-1" />Medicines</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports"><BarChart2 className="h-4 w-4 mr-1" />Reports</Link>
            </Button>
          </>
        }
      />

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard
            key={s.title}
            title={s.title}
            value={fmt(s.value)}
            icon={s.icon}
            color={s.color}
            {...(s.change !== 0 ? { change: s.change, changeLabel: "vs last period" } : {})}
          />
        ))}
      </div>

      {/* Alert strip */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap">
          {alertItems.map((a) => (
            <div key={a.label} className="flex items-center gap-3 flex-1 min-w-[200px] px-5 py-3.5 border-l border-gray-200 dark:border-gray-800 first:border-l-0">
              {a.icon}
              <div>
                <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-none">{a.count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* GST summary */}
      <Panel className="overflow-hidden">
        <PanelBar>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">GST Summary (This Month)</h2>
          <Button variant="link" size="sm" asChild className="h-auto p-0 text-blue-600">
            <Link href="/reports/gst"><FileText className="h-4 w-4 mr-1" />View GST Report</Link>
          </Button>
        </PanelBar>
        <div className="p-4">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[
              { label: "Total Taxable", value: gstSummary.totalTaxable },
              { label: "CGST Collected", value: gstSummary.cgst },
              { label: "SGST Collected", value: gstSummary.sgst },
              { label: "IGST Collected", value: gstSummary.igst },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm py-2">
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(value)}</span>
              </div>
            ))}
            <div className="pt-2 flex justify-between font-semibold text-sm">
              <span className="text-gray-900 dark:text-gray-100">Total GST</span>
              <span className="text-blue-600">{fmt(gstSummary.totalGst)}</span>
            </div>
          </div>
        </div>
      </Panel>
    </PageContainer>
  );
}

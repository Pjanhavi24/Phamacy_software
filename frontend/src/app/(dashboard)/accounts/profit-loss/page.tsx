"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ExportToolbar } from "@/components/reports/export-toolbar";
import { Separator } from "@/components/ui/separator";
import { PageContainer, PageHeader, Panel } from "@/components/design-system";
import { LineChart } from "lucide-react";

const MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"];

const PL_DATA = {
  revenue: {
    sales: 485000,
    otherIncome: 5000,
    total: 490000,
  },
  cogs: {
    openingStock: 125000,
    purchases: 285000,
    closingStock: 140000,
    total: 270000,
  },
  grossProfit: 220000,
  grossMargin: 44.9,
  expenses: {
    salaries: 45000,
    rent: 18000,
    electricity: 4500,
    telephone: 1200,
    stationery: 800,
    depreciation: 5000,
    bankCharges: 500,
    miscellaneous: 2000,
    total: 77000,
  },
  netProfit: 143000,
  netMargin: 29.2,
};

const MONTHLY_CHART = MONTHS.slice(0, 8).map((m, i) => ({
  month: m.slice(0, 3),
  revenue: Math.floor(Math.random() * 100000) + 400000,
  gross: Math.floor(Math.random() * 50000) + 180000,
  net: Math.floor(Math.random() * 30000) + 120000,
}));

function PLRow({ label, value, indent = false, bold = false, positive = true, isPercent = false }: {
  label: string; value: number; indent?: boolean; bold?: boolean; positive?: boolean; isPercent?: boolean;
}) {
  const cls = bold ? "font-semibold" : "";
  const valCls = value < 0 ? "text-red-600" : positive ? "text-green-700" : "text-gray-900 dark:text-gray-100";
  return (
    <div className={`flex justify-between items-center py-1.5 ${indent ? "pl-6" : ""} ${bold ? "bg-gray-50 dark:bg-gray-800/40 px-3 rounded" : "px-3"}`}>
      <span className={`text-sm ${cls}`}>{label}</span>
      <span className={`text-sm ${cls} ${valCls}`}>
        {isPercent ? `${value.toFixed(1)}%` : `₹${Math.abs(value).toLocaleString("en-IN")}`}
        {value < 0 && !isPercent ? " (Dr)" : ""}
      </span>
    </div>
  );
}

export default function ProfitLossPage() {
  const [period, setPeriod] = useState("month");
  const [month, setMonth] = useState("1");
  const [year, setYear] = useState("2026");

  return (
    <PageContainer>
      <PageHeader
        title="Profit & Loss Statement"
        subtitle="Revenue, COGS, Gross Profit, Expenses and Net Profit"
        icon={LineChart}
        actions={
          <ExportToolbar onExportPDF={() => window.print()} onExportExcel={() => {}} />
        }
      />

      <Panel className="flex gap-3 items-end p-4">
        <div>
          <Label className="text-xs">Period</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "month" && (
          <div>
            <Label className="text-xs">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)} className="text-xs">{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-xs">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025-26</SelectItem>
              <SelectItem value="2026">2026-27</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">P&L Statement</h2>
          </div>
          <div className="p-4 space-y-1">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 mb-2">Revenue</div>
            <PLRow label="Sales Revenue" value={PL_DATA.revenue.sales} indent />
            <PLRow label="Other Income" value={PL_DATA.revenue.otherIncome} indent />
            <PLRow label="Total Revenue" value={PL_DATA.revenue.total} bold />
            <Separator className="my-2" />
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 mb-2">Cost of Goods Sold</div>
            <PLRow label="Opening Stock" value={PL_DATA.cogs.openingStock} indent positive={false} />
            <PLRow label="Add: Purchases" value={PL_DATA.cogs.purchases} indent positive={false} />
            <PLRow label="Less: Closing Stock" value={-PL_DATA.cogs.closingStock} indent positive={false} />
            <PLRow label="Total COGS" value={PL_DATA.cogs.total} bold positive={false} />
            <Separator className="my-2" />
            <PLRow label="Gross Profit" value={PL_DATA.grossProfit} bold />
            <PLRow label="Gross Margin" value={PL_DATA.grossMargin} indent isPercent />
            <Separator className="my-2" />
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 mb-2">Operating Expenses</div>
            <PLRow label="Salaries & Wages" value={PL_DATA.expenses.salaries} indent positive={false} />
            <PLRow label="Rent" value={PL_DATA.expenses.rent} indent positive={false} />
            <PLRow label="Electricity" value={PL_DATA.expenses.electricity} indent positive={false} />
            <PLRow label="Telephone & Internet" value={PL_DATA.expenses.telephone} indent positive={false} />
            <PLRow label="Stationery" value={PL_DATA.expenses.stationery} indent positive={false} />
            <PLRow label="Depreciation" value={PL_DATA.expenses.depreciation} indent positive={false} />
            <PLRow label="Bank Charges" value={PL_DATA.expenses.bankCharges} indent positive={false} />
            <PLRow label="Miscellaneous" value={PL_DATA.expenses.miscellaneous} indent positive={false} />
            <PLRow label="Total Expenses" value={PL_DATA.expenses.total} bold positive={false} />
            <Separator className="my-2" />
            <div className="bg-green-50 dark:bg-green-950/40 rounded-lg">
              <PLRow label="Net Profit" value={PL_DATA.netProfit} bold />
              <PLRow label="Net Margin" value={PL_DATA.netMargin} indent isPercent />
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Key Ratios</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Gross Margin", value: `${PL_DATA.grossMargin}%`, good: true },
                  { label: "Net Margin", value: `${PL_DATA.netMargin}%`, good: true },
                  { label: "Expense Ratio", value: `${((PL_DATA.expenses.total / PL_DATA.revenue.total) * 100).toFixed(1)}%`, good: false },
                  { label: "COGS Ratio", value: `${((PL_DATA.cogs.total / PL_DATA.revenue.total) * 100).toFixed(1)}%`, good: false },
                ].map(({ label, value, good }) => (
                  <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className={`text-lg font-bold ${good ? "text-green-600" : "text-orange-600"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}

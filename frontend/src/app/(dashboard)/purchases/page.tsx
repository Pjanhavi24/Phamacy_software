"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingCart,
  IndianRupee,
  Wallet,
  Package,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Panel,
  SearchInput,
  TableEmpty,
} from "@/components/design-system";
import StatCard from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";

interface Purchase {
  id: string;
  invoiceNo: string;
  supplier: string;
  date: string;
  dueDate: string;
  items: number;
  grossAmount: number;
  discount: number;
  gst: number;
  netAmount: number;
  paidAmount: number;
  status: "paid" | "partial" | "pending" | "overdue";
  paymentMethod: string;
}

const MOCK_PURCHASES: Purchase[] = [
  {
    id: "1",
    invoiceNo: "INV-2024-1234",
    supplier: "Sun Pharma Distributors",
    date: "2024-01-15",
    dueDate: "2024-02-15",
    items: 12,
    grossAmount: 45000,
    discount: 2250,
    gst: 4275,
    netAmount: 47025,
    paidAmount: 47025,
    status: "paid",
    paymentMethod: "NEFT",
  },
  {
    id: "2",
    invoiceNo: "INV-2024-1235",
    supplier: "Cipla Healthcare",
    date: "2024-01-18",
    dueDate: "2024-02-18",
    items: 8,
    grossAmount: 28000,
    discount: 1400,
    gst: 2520,
    netAmount: 29120,
    paidAmount: 15000,
    status: "partial",
    paymentMethod: "NEFT",
  },
  {
    id: "3",
    invoiceNo: "INV-2024-1236",
    supplier: "MedCorp Supplies",
    date: "2024-01-20",
    dueDate: "2024-01-30",
    items: 5,
    grossAmount: 12000,
    discount: 600,
    gst: 1080,
    netAmount: 12480,
    paidAmount: 0,
    status: "overdue",
    paymentMethod: "-",
  },
  {
    id: "4",
    invoiceNo: "INV-2024-1237",
    supplier: "Dr. Reddy Distributors",
    date: "2024-01-22",
    dueDate: "2024-02-22",
    items: 15,
    grossAmount: 67000,
    discount: 3350,
    gst: 6030,
    netAmount: 69680,
    paidAmount: 0,
    status: "pending",
    paymentMethod: "-",
  },
  {
    id: "5",
    invoiceNo: "INV-2024-1238",
    supplier: "Lupin Pharma",
    date: "2024-01-24",
    dueDate: "2024-02-24",
    items: 9,
    grossAmount: 34000,
    discount: 1700,
    gst: 3060,
    netAmount: 35360,
    paidAmount: 35360,
    status: "paid",
    paymentMethod: "Cheque",
  },
];

const STATUS_CONFIG = {
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  partial: { label: "Partial", color: "bg-blue-100 text-blue-700", icon: Clock },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("this_month");

  const filtered = MOCK_PURCHASES.filter((p) => {
    const matchSearch =
      !search ||
      p.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPurchases = MOCK_PURCHASES.reduce((s, p) => s + p.netAmount, 0);
  const totalPaid = MOCK_PURCHASES.reduce((s, p) => s + p.paidAmount, 0);
  const totalPending = MOCK_PURCHASES.filter((p) => p.status === "pending" || p.status === "partial").reduce(
    (s, p) => s + (p.netAmount - p.paidAmount),
    0
  );
  const overdueCount = MOCK_PURCHASES.filter((p) => p.status === "overdue").length;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Purchase Management"
        subtitle="Track supplier invoices and payments"
        icon={ShoppingCart}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download size={15} className="mr-1.5" /> Export
            </Button>
            <Button asChild size="sm">
              <Link href="/purchase">
                <Plus size={15} className="mr-1.5" /> New Purchase
              </Link>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Purchases" value={totalPurchases} icon={ShoppingCart} color="blue" prefix="₹" />
        <StatCard title="Total Paid" value={totalPaid} icon={Wallet} color="green" prefix="₹" />
        <StatCard title="Pending Payments" value={totalPending} icon={IndianRupee} color="yellow" prefix="₹" />
        <StatCard title="Overdue Invoices" value={overdueCount} icon={AlertCircle} color="red" />
      </div>

      {/* Filters */}
      <Panel className="overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search invoice, supplier..."
            className="flex-1 min-w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_3">Last 3 Months</option>
            <option value="custom">Custom Range</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter size={14} className="mr-1.5" /> More Filters
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-white">Invoice No</th>
                <th className="text-left px-4 py-3 font-semibold text-white">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-white">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-white">Due Date</th>
                <th className="text-center px-4 py-3 font-semibold text-white">Items</th>
                <th className="text-right px-4 py-3 font-semibold text-white">Net Amount</th>
                <th className="text-right px-4 py-3 font-semibold text-white">Paid</th>
                <th className="text-right px-4 py-3 font-semibold text-white">Balance</th>
                <th className="text-center px-4 py-3 font-semibold text-white">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-white">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => {
                const cfg = STATUS_CONFIG[p.status];
                const StatusIcon = cfg.icon;
                const balance = p.netAmount - p.paidAmount;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{p.invoiceNo}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.supplier}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(p.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={p.status === "overdue" ? "text-red-600 font-medium" : "text-gray-500"}>
                        {new Date(p.dueDate).toLocaleDateString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{p.items}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{p.netAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">₹{p.paidAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {balance > 0 ? (
                        <span className="text-red-600 font-medium">₹{balance.toLocaleString()}</span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon size={11} />
                        {cfg.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="View">
                          <Eye size={14} />
                        </button>
                        {balance > 0 && (
                          <button className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <TableEmpty
              icon={Package}
              title="No purchases found"
              description="Try adjusting your search or filters."
            />
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
          <span>Showing {filtered.length} of {MOCK_PURCHASES.length} records</span>
          <span>Total: ₹{filtered.reduce((s, p) => s + p.netAmount, 0).toLocaleString()}</span>
        </div>
      </Panel>
    </PageContainer>
  );
}

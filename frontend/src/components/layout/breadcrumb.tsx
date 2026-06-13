"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  medicines: "Medicine Master",
  stock: "Stock Management",
  barcode: "Barcode",
  expiry: "Expiry Tracking",
  transactions: "Transactions",
  sales: "Sales / Billing",
  purchase: "Purchase",
  returns: "Returns",
  parties: "Parties",
  customers: "Customers",
  suppliers: "Suppliers",
  doctors: "Doctors",
  patient: "Patient",
  records: "Patient Records",
  prescriptions: "Prescriptions",
  history: "History",
  accounts: "Accounts",
  ledgers: "Ledgers",
  daybook: "Day Book",
  pnl: "P&L",
  reports: "Reports",
  gst: "GST Report",
  crm: "CRM",
  loyalty: "Loyalty Programs",
  whatsapp: "WhatsApp",
  campaigns: "Campaigns",
  settings: "Settings",
  stores: "Stores",
  users: "Users",
  roles: "Roles",
  profile: "Profile",
  "ai-assistant": "AI Assistant",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-4">
      <Link
        href="/dashboard"
        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          {crumb.isLast ? (
            <span className="font-medium text-gray-900 dark:text-white">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

import {
  Home,
  Package,
  Receipt,
  Tablets,
  BarChart3,
  Users,
  Truck,
  Stethoscope,
  TrendingUp,
  FileText,
  BookOpen,
  Settings,
  Clock,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

/**
 * Module registry — maps a module key to its label, icon, base route and
 * whether multiple instances may be opened simultaneously (Billing, Purchase…).
 * The base route is also used to reverse-map a pathname back to a module.
 */
export interface ModuleDef {
  key: string;
  label: string;
  icon: LucideIcon;
  baseHref: string;
  /** Can the user open this module in several tabs at once? */
  multi: boolean;
}

export const MODULES: ModuleDef[] = [
  { key: "billing", label: "Billing", icon: Home, baseHref: "/billing", multi: true },
  { key: "purchase", label: "Purchase", icon: Package, baseHref: "/purchase", multi: true },
  { key: "sales", label: "Sales History", icon: Receipt, baseHref: "/sales", multi: false },
  { key: "patients", label: "Patients", icon: Users, baseHref: "/patients", multi: true },
  { key: "suppliers", label: "Suppliers", icon: Truck, baseHref: "/suppliers", multi: true },
  { key: "doctors", label: "Doctors", icon: Stethoscope, baseHref: "/doctors", multi: true },
  { key: "medicines", label: "Medicines", icon: Tablets, baseHref: "/medicines", multi: true },
  { key: "inventory", label: "Inventory", icon: BarChart3, baseHref: "/inventory", multi: true },
  { key: "expiry", label: "Expiry Alert", icon: Clock, baseHref: "/expiry", multi: false },
  { key: "stock", label: "Stock Report", icon: ClipboardList, baseHref: "/stock", multi: false },
  { key: "reports", label: "Reports", icon: TrendingUp, baseHref: "/reports", multi: false },
  { key: "report-zero-stock", label: "Zero Stock", icon: ClipboardList, baseHref: "/reports/item/zero-stock", multi: false },
  { key: "report-not-sold", label: "Not Sold Since", icon: Clock, baseHref: "/reports/item/not-sold", multi: false },
  { key: "report-itemwise", label: "Itemwise Sales", icon: FileText, baseHref: "/reports/item/itemwise", multi: false },
  { key: "master-generic", label: "Generic Master", icon: Tablets, baseHref: "/masters/generic", multi: false },
  { key: "master-company", label: "Company Master", icon: Package, baseHref: "/masters/company", multi: false },
  { key: "master-category", label: "Category Master", icon: ClipboardList, baseHref: "/masters/category", multi: false },
  { key: "gst", label: "GST Reports", icon: FileText, baseHref: "/gst", multi: false },
  { key: "accounts", label: "Accounts", icon: BookOpen, baseHref: "/accounts", multi: false },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, baseHref: "/dashboard", multi: false },
  { key: "settings", label: "Settings", icon: Settings, baseHref: "/settings", multi: false },
];

const BY_KEY = new Map(MODULES.map((m) => [m.key, m]));

export function getModule(key: string): ModuleDef | undefined {
  return BY_KEY.get(key);
}

/** "Quick open" set surfaced first in the new-tab menu (multi-instance modules). */
export const QUICK_OPEN = MODULES.filter((m) => m.multi);

/**
 * Reverse-map a pathname to its module by longest matching baseHref.
 * e.g. "/inventory/expiry" -> inventory, "/billing" -> billing.
 */
export function moduleForPath(pathname: string): ModuleDef | undefined {
  let best: ModuleDef | undefined;
  for (const m of MODULES) {
    if (pathname === m.baseHref || pathname.startsWith(m.baseHref + "/")) {
      if (!best || m.baseHref.length > best.baseHref.length) best = m;
    }
  }
  return best;
}

/** Human title for an arbitrary path with no registered module. */
export function titleForPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean).pop() || "Home";
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

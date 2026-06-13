"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  BarChart2,
  ShoppingCart,
  Users,
  UserCheck,
  BookOpen,
  FileText,
  CreditCard,
  Megaphone,
  Settings,
  Cpu,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Pill,
  ScanBarcode,
  CalendarClock,
  TrendingUp,
  RefreshCw,
  Stethoscope,
  ClipboardList,
  History,
  BookMarked,
  DollarSign,
  PieChart,
  ShoppingBag,
  FileSpreadsheet,
  Gift,
  MessageCircle,
  Store,
  UserCog,
  Shield,
  User,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  badge?: string;
  badgeColor?: string;
}

const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: Home },
    ],
  },
  {
    section: "Inventory",
    items: [
      {
        label: "Inventory",
        icon: Package,
        children: [
          { label: "Medicine Master", href: "/medicines", icon: Pill },
          { label: "Medicine Catalog", href: "/medicines/catalog", icon: BookMarked },
          { label: "Stock Management", href: "/inventory", icon: BarChart2 },
          { label: "Barcode", href: "/barcode", icon: ScanBarcode },
          { label: "Expiry Tracking", href: "/inventory/expiry", icon: CalendarClock, badge: "3", badgeColor: "red" },
        ],
      },
    ],
  },
  {
    section: "Transactions",
    items: [
      {
        label: "Transactions",
        icon: CreditCard,
        children: [
          { label: "Sales / Billing", href: "/billing", icon: ShoppingCart },
          { label: "Purchase", href: "/purchases", icon: ShoppingBag },
          { label: "New Purchase", href: "/purchase", icon: RefreshCw },
        ],
      },
    ],
  },
  {
    section: "Parties",
    items: [
      {
        label: "Parties",
        icon: Users,
        children: [
          { label: "Customers", href: "/patients", icon: UserCheck },
          { label: "Suppliers", href: "/suppliers", icon: TrendingUp },
          { label: "Doctors", href: "/doctors", icon: Stethoscope },
        ],
      },
    ],
  },
  {
    section: "Patient",
    items: [
      {
        label: "Patient",
        icon: UserCheck,
        children: [
          { label: "Patient Records", href: "/patients", icon: ClipboardList },
          { label: "Prescriptions", href: "/prescriptions", icon: BookOpen },
          { label: "Purchase History", href: "/patients", icon: History },
        ],
      },
    ],
  },
  {
    section: "Finance",
    items: [
      {
        label: "Accounts",
        icon: BookMarked,
        children: [
          { label: "Accounts Overview", href: "/accounts", icon: BookOpen },
          { label: "Day Book", href: "/accounts", icon: FileText },
          { label: "P&L Statement", href: "/accounts/profit-loss", icon: DollarSign },
        ],
      },
      {
        label: "Reports",
        icon: PieChart,
        children: [
          { label: "Sales Report", href: "/reports/sales", icon: ShoppingCart },
          { label: "Purchase Report", href: "/reports/purchase", icon: ShoppingBag },
          { label: "GST Report", href: "/reports/gst", icon: FileSpreadsheet },
          { label: "Stock Report", href: "/reports/stock", icon: Package },
          { label: "Expiry Report", href: "/inventory/expiry", icon: CalendarClock },
        ],
      },
    ],
  },
  {
    section: "Reports",
    items: [
      {
        label: "Item Report",
        icon: Package,
        children: [
          { label: "Zero Stock Items", href: "/reports/item/zero-stock", icon: BarChart2 },
          { label: "Item Not Sold Since", href: "/reports/item/not-sold", icon: CalendarClock },
          { label: "Itemwise Sales Detail", href: "/reports/item/itemwise", icon: FileText },
        ],
      },
      { label: "Sales Report", href: "/reports/sales", icon: ShoppingCart },
    ],
  },
  {
    section: "CRM",
    items: [
      {
        label: "CRM",
        icon: Megaphone,
        children: [
          { label: "Loyalty Programs", href: "/crm/loyalty", icon: Gift },
          { label: "WhatsApp", href: "/crm/whatsapp", icon: MessageCircle },
          { label: "Campaigns", href: "/crm/campaigns", icon: Megaphone },
        ],
      },
    ],
  },
  {
    section: "System",
    items: [
      {
        label: "Settings",
        icon: Settings,
        children: [
          { label: "Stores", href: "/settings", icon: Store },
          { label: "Users", href: "/settings/users", icon: Users },
          { label: "Roles", href: "/settings", icon: Shield },
          { label: "Profile", href: "/settings", icon: User },
        ],
      },
      { label: "AI Assistant", href: "/ai-assistant", icon: Cpu, badge: "New", badgeColor: "blue" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(["Inventory", "Transactions"]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isGroupActive = (children?: NavItem[]) => {
    return children?.some((c) => isActive(c.href)) ?? false;
  };

  const badgeClass = (color?: string) => {
    if (color === "red") return "bg-red-500 text-white";
    if (color === "blue") return "bg-blue-500 text-white";
    return "bg-gray-500 text-white";
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-800 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">PharmaERP</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
            <Pill className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded hover:bg-gray-700 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded hover:bg-gray-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-300 ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
        {NAV_SECTIONS.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-gray-500 select-none">
                {section.section}
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-gray-800" />}
            {section.items.map((item) => {
              if (item.children) {
                const active = isGroupActive(item.children);
                const open = openGroups.includes(item.label);
                const Icon = item.icon;
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => {
                        if (!collapsed) toggleGroup(item.label);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                        transition-colors duration-150 group
                        ${
                          active
                            ? "text-blue-400 bg-blue-950/60"
                            : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                        }
                        ${collapsed ? "justify-center" : "justify-between"}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={`w-5 h-5 shrink-0 ${
                            active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                          }`}
                        />
                        {!collapsed && <span>{item.label}</span>}
                      </span>
                      {!collapsed && (
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>
                    {!collapsed && open && (
                      <div className="ml-4 border-l border-gray-700 pl-2 space-y-0.5 mt-0.5 mb-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.label}
                              href={child.href!}
                              className={`
                                flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm
                                transition-colors duration-150 group
                                ${
                                  childActive
                                    ? "bg-blue-700 text-white"
                                    : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                                }
                              `}
                            >
                              <span className="flex items-center gap-2">
                                <ChildIcon
                                  className={`w-4 h-4 shrink-0 ${
                                    childActive
                                      ? "text-white"
                                      : "text-gray-500 group-hover:text-gray-300"
                                  }`}
                                />
                                {child.label}
                              </span>
                              {child.badge && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                    badgeClass(child.badgeColor)
                                  }`}
                                >
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  title={collapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                    transition-colors duration-150 group
                    ${
                      active
                        ? "bg-blue-700 text-white"
                        : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                    }
                    ${collapsed ? "justify-center" : "justify-between"}
                  `}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        active ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                      }`}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </span>
                  {!collapsed && item.badge && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        badgeClass(item.badgeColor)
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600 shrink-0">
          PharmaERP v1.0.0
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Pill,
  Home,
  Package,
  Receipt,
  Tablets,
  BarChart3,
  Clock,
  ClipboardList,
  Users,
  Truck,
  Stethoscope,
  Settings,
  PackageX,
  CalendarClock,
  FileText,
  ShoppingCart,
  ChevronDown,
  LogOut,
  User,
  KeyRound,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Store,
  Check,
} from "lucide-react";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";
import { TabBar } from "@/components/workspace/tab-bar";
import { apiClient } from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  prominent?: boolean;
  /** When present this item is a collapsible group of sub-reports. */
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "BILLING",
    items: [
      { label: "Billing / New Bill", href: "/billing", icon: <Home size={18} />, prominent: true },
    ],
  },
  {
    title: "TRANSACTIONS",
    items: [
      { label: "Purchase Entry", href: "/purchase", icon: <Package size={18} /> },
      { label: "Sales History", href: "/sales", icon: <Receipt size={18} /> },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      { label: "Inventory", href: "/inventory", icon: <BarChart3 size={18} /> },
      { label: "Expiry Alert", href: "/expiry", icon: <Clock size={18} /> },
      { label: "Expiry Return", href: "/expiry/return", icon: <Truck size={18} /> },
      { label: "Stock Report", href: "/stock", icon: <ClipboardList size={18} /> },
    ],
  },
  {
    title: "MASTER",
    items: [
      { label: "Item Master", href: "/medicines", icon: <Tablets size={18} /> },
      { label: "Generic Master", href: "/masters/generic", icon: <Pill size={18} /> },
      { label: "Supplier Master", href: "/suppliers", icon: <Truck size={18} /> },
      { label: "Company Master", href: "/masters/company", icon: <Store size={18} /> },
      { label: "Doctor Master", href: "/doctors", icon: <Stethoscope size={18} /> },
      { label: "Patient Master", href: "/patients", icon: <Users size={18} /> },
      { label: "Category Master", href: "/masters/category", icon: <ClipboardList size={18} /> },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        label: "Item Report",
        href: "/reports/item",
        icon: <Package size={18} />,
        children: [
          { label: "Zero Stock Items", href: "/reports/item/zero-stock", icon: <PackageX size={18} /> },
          { label: "Item Not Sold Since", href: "/reports/item/not-sold", icon: <CalendarClock size={18} /> },
          { label: "Itemwise Sales Detail", href: "/reports/item/itemwise", icon: <FileText size={18} /> },
        ],
      },
      { label: "Sales Report", href: "/reports/sales", icon: <ShoppingCart size={18} /> },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
    ],
  },
];

const branches = ["Main Branch", "Branch 2 - West", "Branch 3 - East"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Main Branch");
  const [openGroups, setOpenGroups] = useState<string[]>(["Item Report"]);
  const toggleGroup = (label: string) =>
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );

  const userMenuRef = useRef<HTMLDivElement>(null);
  const storeMenuRef = useRef<HTMLDivElement>(null);

  // Live "Expiry Alert" badge: count of batches expiring within 90 days.
  const [expiringCount, setExpiringCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      apiClient
        .get("/inventory/expiring", { params: { days: 90 } })
        .then((r) => {
          const n = r.data?.count ?? (Array.isArray(r.data?.batches) ? r.data.batches.length : 0);
          if (!cancelled) setExpiringCount(Number(n) || 0);
        })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 60000); // refresh every minute
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Auth guard: bounce to /login when there is no access token.
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("pharma_access_token");
    if (!token) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // Logout: best-effort server logout, clear local session, go to /login.
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("pharma_access_token");
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      /* ignore network errors on logout */
    }
    localStorage.removeItem("pharma_access_token");
    localStorage.removeItem("pharma_refresh_token");
    localStorage.removeItem("pharma_workspace_v1");
    router.replace("/login");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      if (e.key === "F2") {
        e.preventDefault();
        router.push("/billing");
      }
      if (e.key === "F4") {
        e.preventDefault();
        router.push("/purchase");
      }
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setStoreMenuOpen(false);
        setMobileSidebarOpen(false);
        if (isInput) (e.target as HTMLElement).blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (storeMenuRef.current && !storeMenuRef.current.contains(e.target as Node)) {
        setStoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = (href: string) => pathname === href;

  // A single leaf nav link (the original sidebar item rendering).
  const renderLeaf = (item: NavItem, collapsed: boolean) => {
    const active = isActive(item.href);
    // Expiry Alert shows the live ≤90-day count; other items use their static badge.
    const badge =
      item.href === "/expiry"
        ? (expiringCount > 0 ? expiringCount : undefined)
        : item.badge;
    return (
      <div key={item.href} className="relative group px-2">
        <Link
          href={item.href}
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 transition-colors ${
            active
              ? item.prominent
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
          } ${collapsed ? "justify-center" : ""}`}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <span className={`flex-1 text-sm truncate ${item.prominent ? "font-semibold" : "font-medium"}`}>
              {item.label}
            </span>
          )}
          {!collapsed && badge !== undefined && (
            <span
              className={`ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                active && item.prominent ? "bg-white/20 text-white" : "bg-red-50 text-red-600"
              }`}
            >
              {badge}
            </span>
          )}
          {collapsed && badge !== undefined && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {badge}
            </span>
          )}
        </Link>
        {collapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap">
              {item.label}
            </div>
          </div>
        )}
      </div>
    );
  };

  // A collapsible group of sub-reports. On the collapsed rail the children are
  // flattened to individual icons so they stay reachable.
  const renderGroup = (item: NavItem, collapsed: boolean) => {
    if (collapsed) {
      return (
        <React.Fragment key={item.label}>
          {item.children!.map((c) => renderLeaf(c, true))}
        </React.Fragment>
      );
    }
    const open = openGroups.includes(item.label);
    const groupActive = item.children!.some((c) => isActive(c.href));
    return (
      <div key={item.label} className="px-2">
        <button
          onClick={() => toggleGroup(item.label)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 transition-colors ${
            groupActive
              ? "text-blue-700 dark:text-blue-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          <span className="flex-1 text-left text-sm font-medium truncate">{item.label}</span>
          <ChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="ml-4 mb-0.5 border-l border-gray-200 dark:border-gray-800 pl-1">
            {item.children!.map((c) => renderLeaf(c, false))}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-gray-800 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
          <Pill size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-gray-900 dark:text-gray-100 font-semibold text-sm leading-tight tracking-tight">
              PharmaERP
            </div>
            <div className="text-gray-400 dark:text-gray-500 text-[10px] tracking-wider uppercase">
              Pharmacy Software
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-0.5">
            {!collapsed ? (
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                {section.title}
              </div>
            ) : (
              <div className="mx-3 my-1.5 border-t border-gray-100 dark:border-gray-800" />
            )}
            {section.items.map((item) =>
              item.children ? renderGroup(item, collapsed) : renderLeaf(item, collapsed)
            )}
          </div>
        ))}
      </nav>

      {/* Bottom: user info */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2">
        {!collapsed ? (
          <div
            onClick={handleLogout}
            title="Log out"
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">AP</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 dark:text-gray-100 text-sm font-medium truncate">Admin Pharmacist</div>
              <div className="text-gray-500 dark:text-gray-400 text-[11px] truncate">Super Admin</div>
            </div>
            <LogOut size={15} className="text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors flex-shrink-0" />
          </div>
        ) : (
          <div className="flex justify-center">
            <button className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors">
              <span className="text-white text-xs font-semibold">AP</span>
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center py-2 border-t border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
      </button>
    </div>
  );

  // Don't render the app until we've confirmed a token (avoids a flash of the
  // dashboard before the redirect to /login).
  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <WorkspaceProvider>
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out flex-shrink-0 ${
          sidebarCollapsed ? "w-[64px]" : "w-[228px]"
        }`}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[228px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col lg:hidden transform transition-transform duration-200 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
              <Pill size={16} className="text-white" />
            </div>
            <span className="text-gray-900 dark:text-gray-100 font-semibold text-sm">PharmaERP</span>
          </div>
          <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent collapsed={false} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 px-4 flex-shrink-0 z-30">
          {/* Hamburger (mobile) */}
          <button
            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-1"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Spacer (search bar removed) */}
          <div className="flex-1" />

          <div className="flex items-center gap-2 ml-auto">
            {/* Store / Branch selector */}
            <div className="relative" ref={storeMenuRef}>
              <button
                onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                className="hidden sm:flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Store size={14} className="text-blue-600" />
                <span className="text-xs font-medium">{selectedBranch}</span>
                <ChevronDown size={13} className={`text-gray-400 dark:text-gray-500 transition-transform ${storeMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {storeMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Select Branch</p>
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b}
                      onClick={() => { setSelectedBranch(b); setStoreMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <Check size={13} className={selectedBranch === b ? "text-blue-600" : "opacity-0"} />
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>


            {/* User avatar + dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md pl-1 pr-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-[11px] font-semibold">AP</span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight">Admin</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Super Admin</div>
                </div>
                <ChevronDown size={13} className={`text-gray-400 dark:text-gray-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Admin Pharmacist</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">admin@pharmacy.com</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <User size={14} />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <KeyRound size={14} />
                    Change Password
                  </Link>
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace multi-tab bar */}
        <TabBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950">{children}</main>
      </div>
    </div>
    </WorkspaceProvider>
  );
}

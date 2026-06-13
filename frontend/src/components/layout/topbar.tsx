"use client";

import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Store,
  LogOut,
  User,
  Settings,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface TopbarProps {
  onToggleMobileSidebar: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const STORES = ["Main Branch", "City Centre", "Hospital Branch", "Airport Outlet"];

const NOTIFICATIONS = [
  { id: 1, type: "warning", message: "Paracetamol 500mg stock low (12 units)", time: "5m ago" },
  { id: 2, type: "error", message: "Amoxicillin expires in 7 days", time: "1h ago" },
  { id: 3, type: "success", message: "Purchase order #PO-2024 approved", time: "2h ago" },
  { id: 4, type: "warning", message: "Ibuprofen reorder point reached", time: "3h ago" },
];

export default function Topbar({ onToggleMobileSidebar, darkMode, onToggleDarkMode }: TopbarProps) {
  const [selectedStore, setSelectedStore] = useState(STORES[0]);
  const [storeOpen, setStoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const storeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (storeRef.current && !storeRef.current.contains(e.target as Node)) setStoreOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const notifIcon = (type: string) => {
    if (type === "error") return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (type === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 gap-3 shrink-0 z-10">
      {/* Mobile menu toggle */}
      <button
        onClick={onToggleMobileSidebar}
        className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search medicines, patients, orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full pl-9 pr-4 py-2 text-sm rounded-lg
            bg-gray-100 dark:bg-gray-800
            border border-transparent focus:border-blue-500
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-400
            outline-none transition-colors
          "
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Store selector */}
        <div ref={storeRef} className="relative hidden md:block">
          <button
            onClick={() => setStoreOpen((p) => !p)}
            className="
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300
              hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors
              border border-blue-200 dark:border-blue-800
            "
          >
            <Store className="w-4 h-4" />
            <span className="max-w-[120px] truncate">{selectedStore}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${storeOpen ? "rotate-180" : ""}`} />
          </button>
          {storeOpen && (
            <div className="
              absolute right-0 top-full mt-1 w-48 py-1 rounded-lg shadow-xl
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              z-50
            ">
              {STORES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSelectedStore(s); setStoreOpen(false); }}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors
                    ${
                      s === selectedStore
                        ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }
                  `}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {notifOpen && (
            <div className="
              absolute right-0 top-full mt-1 w-80 rounded-lg shadow-xl
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              z-50 overflow-hidden
            ">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors"
                  >
                    <div className="mt-0.5">{notifIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 text-center">
                <span className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">View all notifications</span>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((p) => !p)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-sm font-semibold">
              A
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-900 dark:text-white leading-none">Admin User</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pharmacist</p>
            </div>
            <ChevronDown className={`hidden md:block w-3 h-3 text-gray-400 transition-transform ${userOpen ? "rotate-180" : ""}`} />
          </button>
          {userOpen && (
            <div className="
              absolute right-0 top-full mt-1 w-48 py-1 rounded-lg shadow-xl
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              z-50
            ">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Admin User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">admin@pharmaerp.com</p>
              </div>
              {[
                { icon: User, label: "Profile", href: "/settings/profile" },
                { icon: Settings, label: "Settings", href: "/settings" },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </a>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

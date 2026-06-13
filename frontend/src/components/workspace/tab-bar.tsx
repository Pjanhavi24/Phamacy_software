"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Pin,
  PinOff,
  Copy,
  Pencil,
  BookOpen,
  FileText,
  XCircle,
  Plus,
} from "lucide-react";
import { useWorkspace, type Tab } from "./workspace-context";
import { getModule } from "./modules";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SoldItem {
  medicineId: string;
  name: string;
  code: string;
  qtySold: number;
  stock: number;
}

interface CtxMenu {
  x: number;
  y: number;
  key: string;
}

export function TabBar() {
  const {
    tabs,
    activeKey,
    activateTab,
    closeTab,
    closeOthers,
    duplicateTab,
    renameTab,
    togglePin,
    openModule,
  } = useWorkspace();
  const router = useRouter();

  const [bookOpen, setBookOpen] = useState(false);
  const [sold, setSold] = useState<SoldItem[]>([]);
  const [soldLoading, setSoldLoading] = useState(false);
  const [menu, setMenu] = useState<CtxMenu | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const histRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // Load today's sold medicines whenever the Shortbook opens.
  useEffect(() => {
    if (!bookOpen) return;
    let cancelled = false;
    setSoldLoading(true);
    apiClient
      .get("/sales/sold-today")
      .then((r) => {
        if (!cancelled) setSold(Array.isArray(r.data?.items) ? r.data.items : []);
      })
      .catch(() => {
        if (!cancelled) setSold([]);
      })
      .finally(() => {
        if (!cancelled) setSoldLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookOpen]);

  // Close popovers / context menu on outside click or Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (histRef.current && !histRef.current.contains(t)) setBookOpen(false);
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBookOpen(false);
        setMenu(null);
        if (editingKey) setEditingKey(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [editingKey]);

  useEffect(() => {
    if (editingKey) editRef.current?.select();
  }, [editingKey]);

  const ordered: Tab[] = [...tabs].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned)
  );

  const startRename = (tab: Tab) => {
    setMenu(null);
    setEditingKey(tab.instanceKey);
    setDraft(tab.title);
  };
  const commitRename = () => {
    if (editingKey) renameTab(editingKey, draft);
    setEditingKey(null);
  };

  return (
    <div className="relative flex h-10 shrink-0 items-stretch border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950 print:hidden">
      {/* Tabs strip */}
      <div className="flex flex-1 items-stretch gap-0.5 overflow-x-auto px-1 pt-1">
        {ordered.map((tab) => {
          const isActive = tab.instanceKey === activeKey;
          const Icon = getModule(tab.module)?.icon ?? FileText;
          const editing = editingKey === tab.instanceKey;
          return (
            <div
              key={tab.instanceKey}
              onClick={() => !editing && activateTab(tab.instanceKey)}
              onMouseEnter={() => router.prefetch(tab.href.split("?")[0])}
              onDoubleClick={() => startRename(tab)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, key: tab.instanceKey });
              }}
              className={cn(
                "group relative flex max-w-[220px] min-w-[120px] cursor-pointer items-center gap-2 rounded-t-lg px-3 text-sm transition-colors",
                isActive
                  ? "bg-white text-gray-900 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] dark:bg-gray-900 dark:text-gray-100"
                  : "bg-gray-200/50 text-gray-600 hover:bg-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-800/70"
              )}
            >
              {tab.pinned && (
                <Pin className="h-3 w-3 shrink-0 text-blue-500" />
              )}
              <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              {editing ? (
                <input
                  ref={editRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingKey(null);
                  }}
                  className="h-6 w-24 rounded border border-blue-400 px-1 text-xs outline-none"
                />
              ) : (
                <span className="flex-1 truncate">{tab.title}</span>
              )}
              {tab.dirty && !editing && (
                <span
                  title="Unsaved changes"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.instanceKey);
                }}
                title="Close tab"
                className={cn(
                  "shrink-0 rounded p-0.5 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {/* New bill (+) — sits right after the last tab and moves with them (Chrome-style) */}
        <button
          onClick={() => openModule("billing")}
          title="New bill"
          className="flex shrink-0 items-center px-2.5 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Shortbook — today's sold medicines */}
      <div ref={histRef} className="relative flex items-center">
        <button
          onClick={() => setBookOpen((v) => !v)}
          title="Shortbook — medicines sold today"
          className="flex h-full items-center border-l border-gray-200 dark:border-gray-800 px-3 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <BookOpen className="h-4 w-4" />
        </button>
        {bookOpen && (
          <div className="absolute right-0 top-full z-50 mt-px w-80 overflow-hidden rounded-b-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 dark:border-gray-800">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Shortbook · Sold Today
              </span>
              <span className="text-[10px] text-gray-400">{sold.length} item(s)</span>
            </div>
            {sold.length > 0 && (
              <div className="grid grid-cols-[3.5rem_1fr_3rem_3rem] gap-x-2 border-b border-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
                <span>Code</span>
                <span>Item</span>
                <span className="text-right">Sold</span>
                <span className="text-right">Stock</span>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto">
              {soldLoading ? (
                <div className="px-3 py-4 text-center text-xs text-gray-400">Loading…</div>
              ) : sold.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-400">
                  No medicines sold yet today.
                </div>
              ) : (
                sold.map((s) => (
                  <div
                    key={s.medicineId}
                    className="grid grid-cols-[3.5rem_1fr_3rem_3rem] items-center gap-x-2 px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <span className="font-mono text-gray-500 dark:text-gray-400">{s.code || "—"}</span>
                    <span className="truncate text-gray-800 dark:text-gray-200">{s.name}</span>
                    <span className="text-right font-semibold text-gray-700 dark:text-gray-300">{s.qtySold}</span>
                    <span
                      className={cn(
                        "text-right font-semibold",
                        s.stock === 0
                          ? "text-red-600"
                          : s.stock <= 10
                          ? "text-amber-600"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {s.stock}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {menu && (
        <div
          className="fixed z-[60] w-44 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-1 shadow-2xl"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(() => {
            const tab = tabs.find((t) => t.instanceKey === menu.key);
            if (!tab) return null;
            return (
              <>
                <MenuItem
                  icon={Pencil}
                  label="Rename"
                  onClick={() => startRename(tab)}
                />
                <MenuItem
                  icon={Copy}
                  label="Duplicate"
                  onClick={() => {
                    duplicateTab(tab.instanceKey);
                    setMenu(null);
                  }}
                />
                <MenuItem
                  icon={tab.pinned ? PinOff : Pin}
                  label={tab.pinned ? "Unpin" : "Pin"}
                  onClick={() => {
                    togglePin(tab.instanceKey);
                    setMenu(null);
                  }}
                />
                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                <MenuItem
                  icon={XCircle}
                  label="Close others"
                  onClick={() => {
                    closeOthers(tab.instanceKey);
                    setMenu(null);
                  }}
                />
                <MenuItem
                  icon={X}
                  label="Close"
                  danger
                  onClick={() => {
                    closeTab(tab.instanceKey);
                    setMenu(null);
                  }}
                />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pin;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800",
        danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 dark:text-gray-300"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

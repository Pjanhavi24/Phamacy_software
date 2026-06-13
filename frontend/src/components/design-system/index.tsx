"use client";

/**
 * Pharmacy ERP — Shared Design System
 *
 * Primitives extracted from the Billing page (the design source of truth) so
 * every screen shares the same spacing, colors, table styling, inputs, labels,
 * cards, tabs, modals and feedback states.
 *
 * Design tokens (mirrors Billing):
 *  - Page bg            gray-50
 *  - Card / Panel       white, rounded-xl, border-gray-200, shadow-sm
 *  - Table header       slate-800, white uppercase 11px labels
 *  - Field height       h-9, rounded-md, gray-300 border, blue focus ring
 *  - Field label        10px bold uppercase gray-500
 *  - Primary action     blue-600 / hover blue-700
 *  - Strong action      slate-800 / hover slate-900
 *  - Spacing scale      8 / 16 / 24 px (gap-2 / gap-4 / gap-6)
 */

import * as React from "react";
import { Search, X, Loader2, PackageOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Class tokens — import these when a raw element needs the canonical styling.
 * ------------------------------------------------------------------------- */
export const ds = {
  /** Standard text input / select / textarea */
  field:
    "h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-gray-800",
  /** Compact field (dense tables / inline) */
  fieldSm:
    "h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500",
  /** Field label */
  label:
    "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400",
  /** Card / Panel surface */
  panel:
    "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900",
  /** Primary button */
  btnPrimary:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50",
  /** Strong / confirm button (dark) */
  btnStrong:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50",
  /** Secondary / outline button */
  btnOutline:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800",
} as const;

/* ---------------------------------------------------------------------------
 * PageContainer — standard page padding + background.
 * ------------------------------------------------------------------------- */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-full space-y-4 bg-gray-50 p-4 dark:bg-gray-950", className)}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * PageHeader — title, optional subtitle, and a right-aligned actions slot.
 * ------------------------------------------------------------------------- */
export function PageHeader({
  actions,
}: {
  /** Kept for compatibility — the page title now lives only in the sidebar. */
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  // The page name is already shown in the sidebar, so we don't repeat it as a
  // large heading here. Only the right-aligned action buttons are rendered.
  if (!actions) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
  );
}

/* ---------------------------------------------------------------------------
 * Panel — the standard white card container.
 * ------------------------------------------------------------------------- */
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(ds.panel, className)}>{children}</div>;
}

/** A bordered strip inside a Panel — used for toolbars / summary bars. */
export function PanelBar({
  children,
  className,
  muted = false,
}: {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800",
        muted && "bg-gray-50 dark:bg-gray-900/50",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * FieldLabel — the canonical 10px uppercase label, with an optional icon.
 * ------------------------------------------------------------------------- */
export function FieldLabel({
  children,
  icon: Icon,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn(ds.label, "mb-0.5", className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </label>
  );
}

/* ---------------------------------------------------------------------------
 * TextField — input carrying the canonical field styling.
 * ------------------------------------------------------------------------- */
export const TextField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(ds.field, className)} {...props} />
));
TextField.displayName = "TextField";

/* ---------------------------------------------------------------------------
 * SearchInput — left search icon + clear button. Controlled.
 * ------------------------------------------------------------------------- */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  loading = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(ds.field, "pl-8 pr-8")}
      />
      {loading ? (
        <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400" />
      ) : value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * StatusTabs — pill tabs with counts (as used on Inventory / list screens).
 * ------------------------------------------------------------------------- */
export interface StatusTab<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export function StatusTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: StatusTab<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Feedback states — Spinner, TableEmpty, ErrorNote.
 * ------------------------------------------------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

export function TableEmpty({
  icon: Icon = PackageOpen,
  title = "No records found",
  description = "Try adjusting your search or filter.",
  action,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-gray-400 dark:text-gray-500">
      <Icon className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-700" />
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * SlideOver — right-side master-entry panel (Add Patient / Add Doctor).
 * Header (title/subtitle + close), scrollable body, optional sticky footer.
 * ------------------------------------------------------------------------- */
export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const w =
    width === "sm" ? "max-w-md" : width === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col bg-gray-50 shadow-2xl animate-in slide-in-from-right dark:bg-gray-950",
          w
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Modal — overlay + centered card with header / close, matching Billing.
 * ------------------------------------------------------------------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900",
          width
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

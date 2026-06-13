"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { SlideOver } from "@/components/design-system";
import { cn } from "@/lib/utils";

/**
 * FilterSheet — a "Filters" trigger button plus a right slide-over panel that
 * holds the page's filter controls. Standardises the filter UX across pages.
 *
 *   <FilterSheet activeCount={n} recordCount={`${rows} records`} onClear={reset}>
 *     ...filter fields...
 *   </FilterSheet>
 */
export function FilterSheet({
  activeCount = 0,
  recordCount,
  onClear,
  children,
  buttonClassName,
}: {
  activeCount?: number;
  recordCount?: string;
  onClear?: () => void;
  children: React.ReactNode;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Filters"
        className={cn(
          "relative flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
          activeCount > 0
            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40"
            : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",
          buttonClassName
        )}
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        subtitle={recordCount}
        icon={Filter}
        width="sm"
      >
        <div className="space-y-4">
          {children}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClear}
              disabled={!onClear || activeCount === 0}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}

/** Small labelled wrapper for a single filter control inside a FilterSheet. */
export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}

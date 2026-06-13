"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";

export interface CatalogSuggestion {
  id: number;
  name: string;
  price: number | null;
  manufacturer: string | null;
  packing: string | null;
  genericName: string | null;
}

interface Props {
  /** Called when a suggestion is picked. */
  onSelect?: (item: CatalogSuggestion) => void;
  placeholder?: string;
  /** Max suggestions to request (1-25). */
  limit?: number;
}

/**
 * Autocomplete search over the imported `medicine_dataset` reference catalog
 * (~254k medicines). Type 2+ characters to get name suggestions ranked with
 * prefix matches first. Backed by GET /medicine-catalog/suggest.
 */
export default function MedicineCatalogSearch({ onSelect, placeholder, limit = 10 }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await apiClient.get(
          `/medicine-catalog/suggest?q=${encodeURIComponent(q)}&limit=${limit}`
        );
        const data: CatalogSuggestion[] = res.data ?? [];
        setResults(data);
        setOpen(data.length > 0);
        setHighlighted(0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (item: CatalogSuggestion) => {
    onSelect?.(item);
    setQuery(item.name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    }
    if (e.key === "Enter" && results[highlighted]) {
      e.preventDefault();
      handleSelect(results[highlighted]);
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Search medicine name..."}
          className="pl-9 pr-9 h-9 text-sm"
          autoComplete="off"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-72 overflow-auto">
          {results.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 hover:bg-blue-50 border-b last:border-0 transition-colors ${
                idx === highlighted ? "bg-blue-50" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {[item.genericName, item.manufacturer, item.packing]
                    .filter(Boolean)
                    .join(" | ")}
                </div>
              </div>
              {item.price !== null && (
                <div className="text-sm font-bold text-gray-900 shrink-0">
                  ₹{item.price.toFixed(2)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

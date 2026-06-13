"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/api";

interface Medicine {
  id: string;
  name: string;
  generic: string;
  batch: string;
  expiry: string;
  mrp: number;
  rate: number;
  gstPct: number;
  stock: number;
}

interface Props {
  onSelect: (medicine: Medicine) => void;
}

export default function MedicineSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await apiClient.get(`/medicines/search?q=${encodeURIComponent(q)}`);
      const data: Medicine[] = res.data?.data ?? res.data ?? [];
      setResults(data);
      setOpen(data.length > 0);
      setHighlighted(0);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
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

  const handleSelect = (med: Medicine) => {
    onSelect(med);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && results[highlighted]) { e.preventDefault(); handleSelect(results[highlighted]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type medicine name or generic..."
          className="pl-9 pr-9 h-9 text-sm"
          autoComplete="off"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-72 overflow-auto">
          {results.map((med, idx) => (
            <button
              key={`${med.id}-${med.batch}`}
              onClick={() => handleSelect(med)}
              className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 hover:bg-blue-50 border-b last:border-0 transition-colors ${
                idx === highlighted ? "bg-blue-50" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-900 truncate">{med.name}</div>
                <div className="text-xs text-gray-500 truncate">{med.generic} | Batch: {med.batch} | Exp: {med.expiry}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-gray-900">â‚¹{med.mrp.toFixed(2)}</div>
                <Badge
                  variant={med.stock > 10 ? "default" : med.stock > 0 ? "secondary" : "destructive"}
                  className="text-[10px] px-1 py-0"
                >
                  {med.stock > 0 ? `${med.stock} left` : "Out"}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pill, ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageContainer,
  PageHeader,
  Panel,
  SearchInput,
  TableEmpty,
} from "@/components/design-system";
import apiClient from "@/lib/api";

interface CatalogItem {
  id: number;
  name: string;
  price: number | null;
  manufacturer: string | null;
  type: string | null;
  packing: string | null;
  genericName: string | null;
}

interface CatalogResponse {
  data: CatalogItem[];
  total: number;
  page: number;
  pages: number;
}

const RUPEE = "₹";
const PAGE_SIZE = 25;

export default function MedicineCatalogPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search box and reset to page 1 on a new term.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<CatalogResponse>(
        `/medicine-catalog?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(debounced)}`
      );
      setItems(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error("Failed to load medicine catalog");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const addToInventory = async (item: CatalogItem) => {
    setAdding(item.id);
    try {
      await apiClient.post("/medicines", {
        name: item.name,
        genericName: item.genericName ?? undefined,
        saltComposition: item.genericName ?? undefined,
        manufacturer: item.manufacturer ?? undefined,
        mrp: item.price ?? 0,
        purchaseRate: item.price ?? 0,
        saleRate: item.price ?? 0,
      });
      setAdded((prev) => new Set(prev).add(item.id));
      toast.success(`Added to inventory: ${item.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add to inventory";
      toast.error(msg);
    } finally {
      setAdding(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Medicine Catalog (Master)"
        subtitle={`Reference list of ${total.toLocaleString(
          "en-IN"
        )} medicines. Search and click “Add to Inventory” to create a stock record.`}
        icon={Pill}
      />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        loading={loading}
        placeholder="Search by name, salt/generic, or manufacturer..."
        className="max-w-xl"
      />

      {/* Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Salt / Generic</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Packing</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-36 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <TableEmpty
                      icon={PackageOpen}
                      title="No medicines found"
                      description={
                        debounced
                          ? `No results for “${debounced}”.`
                          : "Try adjusting your search."
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
              {items.map((item, idx) => {
                const isAdded = added.has(item.id);
                return (
                  <TableRow
                    key={item.id}
                    className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/40"}
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{item.name}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-gray-600 dark:text-gray-400">
                      {item.genericName || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{item.manufacturer || "—"}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{item.packing || "—"}</TableCell>
                    <TableCell className="text-right font-medium text-gray-800 dark:text-gray-200">
                      {item.price !== null ? `${RUPEE}${item.price.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant={isAdded ? "outline" : "default"}
                        disabled={adding === item.id || isAdded}
                        onClick={() => addToInventory(item)}
                        className="h-8 text-xs"
                      >
                        {adding === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isAdded ? (
                          "Added ✓"
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add to Inventory
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {total > 0 && (
            <>
              Page {page} of {pages.toLocaleString("en-IN")} ·{" "}
              {total.toLocaleString("en-IN")} medicines
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

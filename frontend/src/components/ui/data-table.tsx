'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Download,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type ExportFormat = 'csv' | 'json';

export interface DataTableProps<TData, TValue> {
  /** Column definitions */
  columns: ColumnDef<TData, TValue>[];
  /** Data rows */
  data: TData[];
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Total count for server-side pagination */
  totalCount?: number;
  /** Controlled current page (0-indexed) */
  pageIndex?: number;
  /** Controlled page size */
  pageSize?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Show search bar */
  showSearch?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Controlled search value */
  searchValue?: string;
  /** Callback when search changes */
  onSearchChange?: (value: string) => void;
  /** Show export button */
  showExport?: boolean;
  /** Export filename (without extension) */
  exportFilename?: string;
  /** Show column visibility toggle */
  showColumnToggle?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Additional actions to show in toolbar */
  toolbarActions?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: Row<TData>) => void;
  /** Custom row class name */
  rowClassName?: (row: Row<TData>) => string;
  /** Use server-side pagination/sorting */
  serverSide?: boolean;
  /** Controlled sorting state */
  sortingState?: SortingState;
  /** Callback when sorting changes */
  onSortingChange?: (sorting: SortingState) => void;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Table caption */
  caption?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  totalCount,
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize = 20,
  onPageChange,
  onPageSizeChange,
  showSearch = true,
  searchPlaceholder = 'Search...',
  searchValue: controlledSearch,
  onSearchChange,
  showExport = false,
  exportFilename = 'export',
  showColumnToggle = true,
  emptyMessage = 'No results found',
  emptyDescription = 'Try adjusting your filters or search terms.',
  toolbarActions,
  onRowClick,
  rowClassName,
  serverSide = false,
  sortingState: controlledSorting,
  onSortingChange,
  stickyHeader = false,
  caption,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(controlledSorting ?? []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [localSearch, setLocalSearch] = React.useState('');
  const [localPageIndex, setLocalPageIndex] = React.useState(0);
  const [localPageSize, setLocalPageSize] = React.useState(controlledPageSize);

  const isControlledPagination = typeof controlledPageIndex !== 'undefined';
  const isControlledSearch = typeof controlledSearch !== 'undefined';
  const isControlledSorting = typeof controlledSorting !== 'undefined';

  const currentPageIndex = isControlledPagination ? controlledPageIndex : localPageIndex;
  const currentPageSize = isControlledPagination ? controlledPageSize : localPageSize;
  const currentSearch = isControlledSearch ? controlledSearch : localSearch;

  const effectiveSorting = isControlledSorting ? controlledSorting : sorting;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    getSortedRowModel: serverSide ? undefined : getSortedRowModel(),
    getFilteredRowModel: serverSide ? undefined : getFilteredRowModel(),
    onSortingChange: isControlledSorting
      ? (updater) => {
          const newSorting =
            typeof updater === 'function' ? updater(effectiveSorting) : updater;
          onSortingChange?.(newSorting);
        }
      : setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting: effectiveSorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: serverSide ? 0 : currentPageIndex,
        pageSize: currentPageSize,
      },
      globalFilter: serverSide ? undefined : currentSearch,
    },
    manualPagination: serverSide,
    manualSorting: serverSide,
    manualFiltering: serverSide,
    pageCount: serverSide && totalCount
      ? Math.ceil(totalCount / currentPageSize)
      : undefined,
  });

  // Sync local search to table filter
  React.useEffect(() => {
    if (!serverSide) {
      table.setGlobalFilter(currentSearch);
    }
  }, [currentSearch, serverSide, table]);

  const handleSearchChange = (value: string) => {
    if (isControlledSearch) {
      onSearchChange?.(value);
    } else {
      setLocalSearch(value);
    }
    // Reset to first page on search
    if (isControlledPagination) {
      onPageChange?.(0);
    } else {
      setLocalPageIndex(0);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isControlledPagination) {
      onPageChange?.(newPage);
    } else {
      setLocalPageIndex(newPage);
      table.setPageIndex(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isControlledPagination) {
      onPageSizeChange?.(newSize);
      onPageChange?.(0);
    } else {
      setLocalPageSize(newSize);
      setLocalPageIndex(0);
      table.setPageSize(newSize);
      table.setPageIndex(0);
    }
  };

  const totalRows = serverSide ? (totalCount ?? 0) : table.getFilteredRowModel().rows.length;
  const totalPages = Math.ceil(totalRows / currentPageSize);

  const canPreviousPage = currentPageIndex > 0;
  const canNextPage = currentPageIndex < totalPages - 1;

  // Export functionality
  const handleExport = (format: ExportFormat) => {
    const rows = serverSide
      ? data
      : table.getFilteredRowModel().rows.map((r) => r.original);

    if (format === 'csv') {
      exportToCSV(rows as Record<string, unknown>[], exportFilename);
    } else {
      exportToJSON(rows, exportFilename);
    }
  };

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {showSearch && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={currentSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-8"
              />
              {currentSearch && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {toolbarActions}

          {showExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={false}
                  onCheckedChange={() => handleExport('csv')}
                >
                  CSV
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={false}
                  onCheckedChange={() => handleExport('json')}
                >
                  JSON
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id.replace(/_/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className={cn(
          'rounded-md border bg-card overflow-hidden',
          stickyHeader && 'overflow-auto max-h-[600px]'
        )}
      >
        <Table>
          {caption && (
            <caption className="text-sm text-muted-foreground pb-2">{caption}</caption>
          )}
          <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-background')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'whitespace-nowrap font-semibold text-xs uppercase tracking-wider',
                        canSort && 'cursor-pointer select-none'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="ml-1 opacity-60">
                            {sortDir === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : sortDir === 'desc' ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: currentPageSize > 10 ? 10 : currentPageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="rounded-full bg-muted p-3">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-sm">{emptyMessage}</p>
                    <p className="text-xs">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <>
                {totalRows > 0 ? (
                  <>
                    Showing{' '}
                    <span className="font-medium">
                      {currentPageIndex * currentPageSize + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min((currentPageIndex + 1) * currentPageSize, totalRows)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{totalRows}</span> results
                  </>
                ) : (
                  'No results'
                )}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select
              value={String(currentPageSize)}
              onValueChange={(val) => handlePageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handlePageChange(0)}
            disabled={!canPreviousPage || isLoading}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
            <span className="sr-only">First page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handlePageChange(currentPageIndex - 1)}
            disabled={!canPreviousPage || isLoading}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Previous page</span>
          </Button>

          <div className="flex items-center gap-1">
            {getPaginationRange(currentPageIndex, totalPages).map((page, i) =>
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === currentPageIndex ? 'default' : 'outline'}
                  size="icon"
                  className="h-7 w-7 text-xs"
                  onClick={() => handlePageChange(page as number)}
                  disabled={isLoading}
                >
                  {(page as number) + 1}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handlePageChange(currentPageIndex + 1)}
            disabled={!canNextPage || isLoading}
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={!canNextPage || isLoading}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function getPaginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  if (current <= 3) {
    return [0, 1, 2, 3, 4, '...', total - 1];
  }

  if (current >= total - 4) {
    return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  }

  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val == null ? '' : String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    ),
  ];
  downloadBlob(csvRows.join('\n'), `${filename}.csv`, 'text/csv;charset=utf-8;');
}

function exportToJSON(data: unknown, filename: string) {
  downloadBlob(
    JSON.stringify(data, null, 2),
    `${filename}.json`,
    'application/json'
  );
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

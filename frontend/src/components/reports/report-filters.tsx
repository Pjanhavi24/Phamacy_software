"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface ReportFilters {
  startDate: Date | undefined;
  endDate: Date | undefined;
  customer?: string;
  supplier?: string;
  medicine?: string;
  store?: string;
  category?: string;
}

interface ReportFiltersProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  showCustomer?: boolean;
  showSupplier?: boolean;
  showMedicine?: boolean;
  showStore?: boolean;
  showCategory?: boolean;
  onApply: () => void;
  onReset: () => void;
}

export function ReportFiltersComponent({
  filters,
  onChange,
  showCustomer,
  showSupplier,
  showMedicine,
  showStore,
  showCategory,
  onApply,
  onReset,
}: ReportFiltersProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Filters</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Start Date</Label>
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-8", !filters.startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-3 w-3" />
                {filters.startDate ? format(filters.startDate, "dd/MM/yy") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={filters.startDate} onSelect={(d) => { onChange({ ...filters, startDate: d }); setStartOpen(false); }} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Date</Label>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-8", !filters.endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-3 w-3" />
                {filters.endDate ? format(filters.endDate, "dd/MM/yy") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={filters.endDate} onSelect={(d) => { onChange({ ...filters, endDate: d }); setEndOpen(false); }} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        {showCustomer && (
          <div className="space-y-1">
            <Label className="text-xs">Customer</Label>
            <Input className="h-8 text-xs" placeholder="Search customer" value={filters.customer || ""} onChange={(e) => onChange({ ...filters, customer: e.target.value })} />
          </div>
        )}
        {showSupplier && (
          <div className="space-y-1">
            <Label className="text-xs">Supplier</Label>
            <Input className="h-8 text-xs" placeholder="Search supplier" value={filters.supplier || ""} onChange={(e) => onChange({ ...filters, supplier: e.target.value })} />
          </div>
        )}
        {showMedicine && (
          <div className="space-y-1">
            <Label className="text-xs">Medicine</Label>
            <Input className="h-8 text-xs" placeholder="Search medicine" value={filters.medicine || ""} onChange={(e) => onChange({ ...filters, medicine: e.target.value })} />
          </div>
        )}
        {showStore && (
          <div className="space-y-1">
            <Label className="text-xs">Store</Label>
            <Select value={filters.store || "all"} onValueChange={(v) => onChange({ ...filters, store: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                <SelectItem value="main">Main Store</SelectItem>
                <SelectItem value="branch1">Branch 1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {showCategory && (
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={filters.category || "all"} onValueChange={(v) => onChange({ ...filters, category: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="syrup">Syrup</SelectItem>
                <SelectItem value="injection">Injection</SelectItem>
                <SelectItem value="ointment">Ointment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApply}>Apply Filters</Button>
        <Button size="sm" variant="outline" onClick={onReset}>Reset</Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            const today = new Date();
            onChange({ ...filters, startDate: today, endDate: today });
          }}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            onChange({ ...filters, startDate: firstDay, endDate: today });
          }}>This Month</Button>
          <Button size="sm" variant="outline" onClick={() => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), 3, 1);
            onChange({ ...filters, startDate: firstDay, endDate: today });
          }}>This FY</Button>
        </div>
      </div>
    </div>
  );
}

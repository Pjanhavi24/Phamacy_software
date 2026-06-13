"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onSelect: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Minimum selectable date */
  fromDate?: Date;
  /** Maximum selectable date */
  toDate?: Date;
  /** Number of months shown side by side */
  numberOfMonths?: number;
}

export function DateRangePicker({
  from,
  to,
  onSelect,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  fromDate,
  toDate,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const range: DateRange | undefined =
    from || to ? { from, to } : undefined;

  function formatDisplay(): string {
    if (from && to) {
      if (from.getFullYear() === to.getFullYear()) {
        return `${format(from, "dd MMM")} â€“ ${format(to, "dd MMM yyyy")}`;
      }
      return `${format(from, "dd MMM yyyy")} â€“ ${format(to, "dd MMM yyyy")}`;
    }
    if (from) {
      return `${format(from, "dd MMM yyyy")} â€“ ...`;
    }
    return placeholder;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !from && !to && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span>{formatDisplay()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Select date range</span>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            onSelect(r);
            if (r?.from && r?.to) {
              setOpen(false);
            }
          }}
          numberOfMonths={numberOfMonths}
          fromDate={fromDate}
          toDate={toDate}
          defaultMonth={from ?? new Date()}
          initialFocus
        />
        <div className="p-3 border-t flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const start = new Date(today);
              start.setDate(today.getDate() - 6);
              onSelect({ from: start, to: today });
              setOpen(false);
            }}
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const start = new Date(today.getFullYear(), today.getMonth(), 1);
              onSelect({ from: start, to: today });
              setOpen(false);
            }}
          >
            This month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
              onSelect({ from: start, to: today });
              setOpen(false);
            }}
          >
            Last year
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;

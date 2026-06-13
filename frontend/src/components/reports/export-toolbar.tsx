"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileJson } from "lucide-react";
import { useState } from "react";

interface ExportToolbarProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  showJSON?: boolean;
  loading?: boolean;
  title?: string;
}

export function ExportToolbar({
  onExportPDF,
  onExportExcel,
  onExportCSV,
  onExportJSON,
  showJSON,
  loading,
  title = "Export",
}: ExportToolbarProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          {title}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF}>
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            Export as PDF
          </DropdownMenuItem>
        )}
        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Export as Excel
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-500" />
            Export as CSV
          </DropdownMenuItem>
        )}
        {showJSON && onExportJSON && (
          <DropdownMenuItem onClick={onExportJSON}>
            <FileJson className="h-4 w-4 mr-2 text-yellow-600" />
            Download JSON (GST Portal)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

"use client";

import { useState, useEffect } from "react";
import { Printer, FileText, Receipt } from "lucide-react";
import {
  InvoiceTemplate,
  type SaleData,
} from "@/components/common/invoice-template";
import { PageContainer, PageHeader } from "@/components/design-system";
import { useStoreSettings } from "@/lib/store-settings";
import { cn } from "@/lib/utils";

const SAMPLE_SALE: SaleData = {
  invoiceNumber: "PHR-2026-000142",
  invoiceDate: "08-06-2026",
  invoiceTime: "11:24 AM",
  patientName: "Rahul Sharma",
  patientPhone: "+91 90123 45678",
  patientAddress: "B-204, Sunrise Apartments, Bandra East, Mumbai",
  doctorName: "Dr. Anjali Mehta (MD)",
  doctorSpecialization: "General Physician",
  doctorReg: "MH-MED-48213",
  paymentMode: "upi",
  items: [
    { sNo: 1, hsn: "3004", mfg: "Cipla", description: "Paracetamol 500mg (10 Tab)", batch: "PCM2418", expiry: "08/2027", qty: 2, mrp: 30, rate: 24, discPercent: 5, gstPercent: 12, amount: 53.76 },
    { sNo: 2, hsn: "3004", mfg: "Alkem", description: "Azithromycin 500mg (3 Tab)", batch: "AZ1109", expiry: "03/2027", qty: 1, mrp: 110, rate: 92, discPercent: 0, gstPercent: 12, amount: 103.04 },
    { sNo: 3, hsn: "3004", mfg: "Sun Pharma", description: "Cetirizine 10mg (10 Tab)", batch: "CET771", expiry: "11/2026", qty: 1, mrp: 28, rate: 22, discPercent: 0, gstPercent: 5, amount: 23.1 },
    { sNo: 4, hsn: "3004", mfg: "Mankind", description: "Vitamin D3 60K (4 Cap)", batch: "VD360K", expiry: "01/2028", qty: 1, mrp: 210, rate: 180, discPercent: 10, gstPercent: 12, amount: 181.44 },
  ],
  subtotal: 405.6,
  totalDiscount: 32.5,
  cgst: 21.45,
  sgst: 21.45,
  netAmount: 361,
  paidAmount: 400,
  changeAmount: 39,
};

export default function SampleBillPage() {
  const settings = useStoreSettings();
  const [mode, setMode] = useState<"a4" | "thermal">("a4");

  // Default the preview to the format configured in Settings.
  useEffect(() => setMode(settings.printFormat), [settings.printFormat]);

  return (
    <PageContainer>
      <PageHeader
        title="Sample Bill — Print Preview"
        subtitle="Hard-copy invoice theme (A4 & thermal). Use Print for a real hard copy."
        icon={Receipt}
        actions={
          <div className="no-print flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-gray-300">
              <button
                onClick={() => setMode("a4")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === "a4" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                <FileText className="h-4 w-4" /> A4
              </button>
              <button
                onClick={() => setMode("thermal")}
                className={cn(
                  "flex items-center gap-1.5 border-l border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === "thermal" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                <Receipt className="h-4 w-4" /> Thermal
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        }
      />

      {/* On-screen preview: paper-like surface centered on a gray board. */}
      <div className="flex justify-center rounded-xl border border-gray-200 bg-gray-100 p-6">
        <div
          className={cn(
            "bg-white shadow-lg",
            mode === "thermal" ? "w-full max-w-[190mm] p-3" : "w-full max-w-[210mm] p-2"
          )}
        >
          <InvoiceTemplate
            saleData={SAMPLE_SALE}
            storeData={settings}
            printMode={mode}
          />
        </div>
      </div>
    </PageContainer>
  );
}

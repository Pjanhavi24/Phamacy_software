"use client";

import { useState, useRef } from "react";
import { X, Printer, ChevronDown, ChevronUp } from "lucide-react";
import BarcodeLabel from "./barcode-label";

interface Medicine {
  id: number;
  name: string;
  sku: string;
  batch: string;
  expiry: string;
  mrp: number;
  barcode: string;
  manufacturer?: string;
}

interface LabelConfig {
  size: string;
  showName: boolean;
  showMRP: boolean;
  showBatch: boolean;
  showExpiry: boolean;
  showManufacturer: boolean;
}

interface BarcodePrintModalProps {
  medicines: Medicine[];
  labelConfig: LabelConfig;
  onClose: () => void;
}

const labelSizeOptions = [
  { key: "small", label: "Small (1\" x 0.5\")" },
  { key: "medium", label: "Medium (2\" x 1\")" },
  { key: "large", label: "Large (4\" x 2\")" },
  { key: "a4", label: "A4 Sheet" },
];

export default function BarcodePrintModal({
  medicines,
  labelConfig,
  onClose,
}: BarcodePrintModalProps) {
  const [copies, setCopies] = useState<Record<number, number>>(
    Object.fromEntries(medicines.map((m) => [m.id, 1]))
  );
  const [localConfig, setLocalConfig] = useState<LabelConfig>(labelConfig);
  const [printLayout, setPrintLayout] = useState<"thermal" | "a4">("thermal");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Labels</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: monospace; background: white; }
            .print-grid { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; }
            .label { border: 1px solid #ccc; padding: 4px; display: inline-block; }
            @media print {
              body { margin: 0; }
              .print-grid { padding: 4px; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const totalLabels = Object.values(copies).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Printer size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Print Barcode Labels</h2>
              <p className="text-sm text-gray-500">{medicines.length} medicine(s) selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Settings */}
            <div className="space-y-5">
              {/* Label Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Label Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {labelSizeOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setLocalConfig((c) => ({ ...c, size: opt.key }))}
                      className={`px-3 py-2.5 border-2 rounded-lg text-sm font-medium transition-all ${
                        localConfig.size === opt.key
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Print Layout */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Print Layout</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["thermal", "a4"] as const).map((layout) => (
                    <button
                      key={layout}
                      onClick={() => setPrintLayout(layout)}
                      className={`px-3 py-2.5 border-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        printLayout === layout
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {layout === "thermal" ? "Thermal Printer" : "A4 Sheet"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Label Content</label>
                <div className="space-y-2">
                  {[
                    { key: "showName", label: "Medicine Name" },
                    { key: "showMRP", label: "MRP Price" },
                    { key: "showBatch", label: "Batch Number" },
                    { key: "showExpiry", label: "Expiry Date" },
                    { key: "showManufacturer", label: "Manufacturer" },
                  ].map((field) => (
                    <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localConfig[field.key as keyof LabelConfig] as boolean}
                        onChange={() =>
                          setLocalConfig((c) => ({
                            ...c,
                            [field.key]: !c[field.key as keyof LabelConfig],
                          }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Copies per medicine */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Copies per Label
                </label>
                <div className="space-y-2">
                  {medicines.map((med) => (
                    <div key={med.id} className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700 flex-1 truncate">{med.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setCopies((c) => ({ ...c, [med.id]: Math.max(1, (c[med.id] || 1) - 1) }))
                          }
                          className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-gray-900">
                          {copies[med.id] || 1}
                        </span>
                        <button
                          onClick={() =>
                            setCopies((c) => ({ ...c, [med.id]: (c[med.id] || 1) + 1 }))
                          }
                          className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total labels to print: <strong>{totalLabels}</strong>
                </p>
              </div>
            </div>

            {/* Right: Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Preview</label>
              <div
                className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 max-h-96 overflow-y-auto"
              >
                <div
                  ref={printRef}
                  className={`print-grid flex flex-wrap gap-3 ${
                    printLayout === "a4" ? "justify-start" : "justify-center"
                  }`}
                >
                  {medicines.flatMap((med) =>
                    Array.from({ length: copies[med.id] || 1 }).map((_, i) => (
                      <BarcodeLabel
                        key={`${med.id}-${i}`}
                        medicine={med}
                        config={localConfig}
                        className="label shadow-sm"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <p className="text-sm text-gray-500">
            {totalLabels} label{totalLabels !== 1 ? "s" : ""} ready to print
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
            >
              <Printer size={15} />
              Print Labels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

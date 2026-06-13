"use client";

import { useState } from "react";
import {
  Barcode,
  Printer,
  Download,
  Settings,
  Layers,
  ArrowRight,
} from "lucide-react";
import BarcodePrintModal from "@/components/barcode/barcode-print-modal";
import BarcodeLabel from "@/components/barcode/barcode-label";
import {
  PageContainer,
  PageHeader,
  Panel,
  SearchInput,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";

const medicines = [
  {
    id: 1,
    name: "Paracetamol 500mg",
    sku: "MED-001",
    batch: "B2024-01",
    expiry: "2025-12-31",
    mrp: 25.0,
    barcode: "8901234567890",
    manufacturer: "Sun Pharma",
  },
  {
    id: 2,
    name: "Amoxicillin 250mg",
    sku: "MED-002",
    batch: "B2024-02",
    expiry: "2024-08-15",
    mrp: 85.0,
    barcode: "8901234567891",
    manufacturer: "Cipla",
  },
  {
    id: 3,
    name: "Metformin 500mg",
    sku: "MED-003",
    batch: "B2024-03",
    expiry: "2026-03-20",
    mrp: 45.0,
    barcode: "8901234567892",
    manufacturer: "Dr. Reddy's",
  },
  {
    id: 4,
    name: "Atorvastatin 10mg",
    sku: "MED-004",
    batch: "B2024-04",
    expiry: "2024-09-10",
    mrp: 120.0,
    barcode: "8901234567893",
    manufacturer: "Lupin",
  },
  {
    id: 5,
    name: "Omeprazole 20mg",
    sku: "MED-005",
    batch: "B2024-05",
    expiry: "2025-06-30",
    mrp: 60.0,
    barcode: "8901234567894",
    manufacturer: "Zydus",
  },
];

const labelSizes = [
  { key: "small", label: "Small (1\" x 0.5\")", desc: "Thermal dot matrix" },
  { key: "medium", label: "Medium (2\" x 1\")", desc: "Standard thermal" },
  { key: "large", label: "Large (4\" x 2\")", desc: "Full info label" },
  { key: "a4", label: "A4 Sheet", desc: "Multiple per page" },
];

export default function BarcodePage() {
  const [search, setSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<(typeof medicines)[0] | null>(null);
  const [batchSelected, setBatchSelected] = useState<number[]>([]);
  const [printModal, setPrintModal] = useState(false);
  const [labelConfig, setLabelConfig] = useState({
    size: "medium",
    showName: true,
    showMRP: true,
    showBatch: true,
    showExpiry: true,
    showManufacturer: false,
  });

  const filtered = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBatch = (id: number) => {
    setBatchSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Barcode Management"
        subtitle="Generate and print barcode labels for medicines"
        icon={Barcode}
        actions={
          batchSelected.length > 0 ? (
            <Button size="sm" onClick={() => setPrintModal(true)}>
              <Printer size={15} className="mr-1.5" />
              Print Batch ({batchSelected.length})
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Medicine List */}
        <div className="xl:col-span-2 space-y-4">
          {/* Single Barcode Generation */}
          <Panel className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Barcode size={16} className="text-blue-600" />
              Generate Single Barcode
            </h2>
            <div className="mb-4">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search medicine by name or SKU..."
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filtered.map((med) => (
                <div
                  key={med.id}
                  onClick={() => setSelectedMed(med)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    selectedMed?.id === med.id
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{med.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {med.sku} &bull; Batch: {med.batch} &bull; MRP: &#8377;{med.mrp}
                    </p>
                  </div>
                  <ArrowRight
                    size={15}
                    className={selectedMed?.id === med.id ? "text-blue-500" : "text-gray-300 dark:text-gray-600"}
                  />
                </div>
              ))}
            </div>
          </Panel>

          {/* Batch Generation */}
          <Panel className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Layers size={16} className="text-purple-600" />
              Batch Barcode Generation
            </h2>
            <div className="space-y-2">
              {medicines.map((med) => (
                <label
                  key={med.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={batchSelected.includes(med.id)}
                    onChange={() => toggleBatch(med.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{med.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      SKU: {med.sku} &bull; Batch: {med.batch}
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                    {med.barcode}
                  </span>
                </label>
              ))}
            </div>
            {batchSelected.length > 0 && (
              <div className="mt-4 flex gap-3">
                <Button size="sm" onClick={() => setPrintModal(true)}>
                  <Printer size={14} className="mr-1.5" />
                  Print {batchSelected.length} Labels
                </Button>
                <Button variant="outline" size="sm">
                  <Download size={14} className="mr-1.5" />
                  Download PDF
                </Button>
              </div>
            )}
          </Panel>
        </div>

        {/* Right: Preview + Customization */}
        <div className="space-y-4">
          {/* Label Preview */}
          {selectedMed && (
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Label Preview</h2>
                <Button size="sm" onClick={() => setPrintModal(true)}>
                  <Printer size={12} className="mr-1.5" />
                  Print
                </Button>
              </div>
              <div className="flex justify-center">
                <BarcodeLabel medicine={selectedMed} config={labelConfig} />
              </div>
            </Panel>
          )}

          {/* Label Customization */}
          <Panel className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Settings size={15} className="text-gray-500 dark:text-gray-400" />
              Label Customization
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">Label Size</label>
                <div className="space-y-2">
                  {labelSizes.map((size) => (
                    <label
                      key={size.key}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="labelSize"
                        value={size.key}
                        checked={labelConfig.size === size.key}
                        onChange={() => setLabelConfig((c) => ({ ...c, size: size.key }))}
                        className="text-blue-600"
                      />
                      <div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{size.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{size.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">Label Content</label>
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
                        checked={labelConfig[field.key as keyof typeof labelConfig] as boolean}
                        onChange={() =>
                          setLabelConfig((c) => ({
                            ...c,
                            [field.key]: !c[field.key as keyof typeof labelConfig],
                          }))
                        }
                        className="rounded border-gray-300 dark:border-gray-700 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Print Modal */}
      {printModal && (
        <BarcodePrintModal
          medicines={
            batchSelected.length > 0
              ? medicines.filter((m) => batchSelected.includes(m.id))
              : selectedMed
              ? [selectedMed]
              : []
          }
          labelConfig={labelConfig}
          onClose={() => setPrintModal(false)}
        />
      )}
    </PageContainer>
  );
}

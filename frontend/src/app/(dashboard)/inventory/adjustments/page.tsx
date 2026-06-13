"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import {
  PageContainer,
  PageHeader,
  Panel,
  FieldLabel,
  ds,
} from "@/components/design-system";
import { useTabDirty } from "@/components/workspace/workspace-context";
import { cn } from "@/lib/utils";

const medicines = [
  { id: 1, name: "Paracetamol 500mg", sku: "MED-001", batches: ["B2024-01", "B2024-11"] },
  { id: 2, name: "Amoxicillin 250mg", sku: "MED-002", batches: ["B2024-02"] },
  { id: 3, name: "Metformin 500mg", sku: "MED-003", batches: ["B2024-03", "B2024-12"] },
  { id: 4, name: "Atorvastatin 10mg", sku: "MED-004", batches: ["B2024-04"] },
  { id: 5, name: "Omeprazole 20mg", sku: "MED-005", batches: ["B2024-05"] },
];

const adjustmentTypes = [
  {
    key: "add",
    label: "Add Stock",
    description: "Increase stock quantity",
    icon: Plus,
    color: "text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900",
    activeColor: "bg-green-600 text-white border-green-600",
  },
  {
    key: "remove",
    label: "Remove Stock",
    description: "Decrease stock quantity",
    icon: Minus,
    color: "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900",
    activeColor: "bg-red-600 text-white border-red-600",
  },
  {
    key: "damage",
    label: "Mark as Damaged",
    description: "Record damaged/wastage",
    icon: AlertTriangle,
    color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900",
    activeColor: "bg-orange-500 text-white border-orange-500",
  },
];

const reasons: Record<string, string[]> = {
  add: ["Purchase received", "Return from customer", "Stock transfer in", "Correction", "Other"],
  remove: ["Sold out of system", "Expired removal", "Stock transfer out", "Correction", "Other"],
  damage: ["Physical damage", "Contamination", "Packaging defect", "Temperature damage", "Other"],
};

const recentAdjustments = [
  {
    id: "ADJ-001",
    medicine: "Paracetamol 500mg",
    batch: "B2024-01",
    type: "add",
    qty: 200,
    reason: "Purchase received",
    user: "John D.",
    time: "10 mins ago",
  },
  {
    id: "ADJ-002",
    medicine: "Amoxicillin 250mg",
    batch: "B2024-02",
    type: "damage",
    qty: 5,
    reason: "Packaging defect",
    user: "Sarah K.",
    time: "1 hr ago",
  },
  {
    id: "ADJ-003",
    medicine: "Metformin 500mg",
    batch: "B2024-03",
    type: "remove",
    qty: 30,
    reason: "Expired removal",
    user: "John D.",
    time: "3 hrs ago",
  },
];

export default function AdjustmentsPage() {
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [adjustType, setAdjustType] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Has work once any field of the adjustment is filled in.
  useTabDirty(
    !!selectedMedicine || !!quantity || !!reason || !!notes
  );
  const [search, setSearch] = useState("");

  const activeMed = medicines.find((m) => m.id.toString() === selectedMedicine);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedMedicine("");
      setSelectedBatch("");
      setQuantity("");
      setReason("");
      setNotes("");
    }, 2500);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Stock Adjustments"
        subtitle="Record stock changes with audit trail"
        icon={SlidersHorizontal}
        actions={
          <Link href="/inventory" className={ds.btnOutline}>
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="lg:col-span-2">
          <Panel className="p-6">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="p-4 bg-green-100 dark:bg-green-950/40 rounded-full">
                  <CheckCircle size={40} className="text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Adjustment Recorded</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stock has been updated successfully</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Adjustment Type */}
                <div>
                  <FieldLabel className="mb-3">Adjustment Type</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {adjustmentTypes.map((type) => (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => {
                          setAdjustType(type.key);
                          setReason("");
                        }}
                        className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 text-center transition-all ${
                          adjustType === type.key ? type.activeColor : type.color
                        }`}
                      >
                        <type.icon size={22} />
                        <span className="text-sm font-medium">{type.label}</span>
                        <span
                          className={`text-xs ${
                            adjustType === type.key ? "opacity-80" : "opacity-60"
                          }`}
                        >
                          {type.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Medicine Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>
                      Medicine <span className="text-red-500">*</span>
                    </FieldLabel>
                    <select
                      required
                      value={selectedMedicine}
                      onChange={(e) => {
                        setSelectedMedicine(e.target.value);
                        setSelectedBatch("");
                      }}
                      className={ds.field}
                    >
                      <option value="">Select medicine...</option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>
                      Batch Number <span className="text-red-500">*</span>
                    </FieldLabel>
                    <select
                      required
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      disabled={!activeMed}
                      className={ds.field}
                    >
                      <option value="">Select batch...</option>
                      {activeMed?.batches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quantity + Reason */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>
                      Quantity <span className="text-red-500">*</span>
                    </FieldLabel>
                    <input
                      required
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={ds.field}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <FieldLabel>
                      Reason <span className="text-red-500">*</span>
                    </FieldLabel>
                    <select
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={ds.field}
                    >
                      <option value="">Select reason...</option>
                      {(reasons[adjustType] || []).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <FieldLabel>Additional Notes</FieldLabel>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={cn(ds.field, "h-auto resize-none py-2")}
                    placeholder="Optional notes or reference number..."
                  />
                </div>

                {/* Summary */}
                {selectedMedicine && selectedBatch && quantity && (
                  <div
                    className={`rounded-lg p-4 border ${
                      adjustType === "add"
                        ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900"
                        : adjustType === "remove"
                        ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
                        : "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      You are about to{" "}
                      <strong>
                        {adjustType === "add"
                          ? "add"
                          : adjustType === "remove"
                          ? "remove"
                          : "mark as damaged"}
                      </strong>{" "}
                      <strong>{quantity} units</strong> of{" "}
                      <strong>{activeMed?.name}</strong> (Batch: {selectedBatch})
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMedicine("");
                      setSelectedBatch("");
                      setQuantity("");
                      setReason("");
                      setNotes("");
                    }}
                    className={cn(ds.btnOutline, "flex-1")}
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className={cn(ds.btnPrimary, "flex-1")}
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            )}
          </Panel>
        </div>

        {/* Recent Adjustments */}
        <div className="space-y-4">
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Adjustments</h3>
            <div className="space-y-3">
              {recentAdjustments.map((adj) => (
                <div key={adj.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                  <div
                    className={`mt-0.5 p-1.5 rounded-md ${
                      adj.type === "add"
                        ? "bg-green-100 dark:bg-green-950/40 text-green-600"
                        : adj.type === "remove"
                        ? "bg-red-100 dark:bg-red-950/40 text-red-600"
                        : "bg-orange-100 dark:bg-orange-950/40 text-orange-600"
                    }`}
                  >
                    {adj.type === "add" ? (
                      <Plus size={12} />
                    ) : adj.type === "remove" ? (
                      <Minus size={12} />
                    ) : (
                      <AlertTriangle size={12} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{adj.medicine}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {adj.batch} &bull; {adj.reason}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`text-xs font-semibold ${
                          adj.type === "add"
                            ? "text-green-600"
                            : adj.type === "remove"
                            ? "text-red-600"
                            : "text-orange-600"
                        }`}
                      >
                        {adj.type === "add" ? "+" : "-"}{adj.qty} units
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        {adj.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}

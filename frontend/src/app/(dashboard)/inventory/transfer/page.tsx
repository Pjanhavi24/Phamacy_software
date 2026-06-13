"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Store,
  CheckCircle,
  Clock,
  Truck,
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

const stores = [
  { id: 1, name: "Main Store", location: "Ground Floor", stock: "High" },
  { id: 2, name: "Branch - North", location: "North Wing", stock: "Medium" },
  { id: 3, name: "Branch - South", location: "South Wing", stock: "Low" },
  { id: 4, name: "Dispensary", location: "OPD Block", stock: "Medium" },
  { id: 5, name: "ICU Pharmacy", location: "ICU Block", stock: "Low" },
];

const medicines = [
  { id: 1, name: "Paracetamol 500mg", sku: "MED-001", batches: ["B2024-01", "B2024-11"], currentStock: 450 },
  { id: 2, name: "Amoxicillin 250mg", sku: "MED-002", batches: ["B2024-02"], currentStock: 30 },
  { id: 3, name: "Metformin 500mg", sku: "MED-003", batches: ["B2024-03"], currentStock: 320 },
  { id: 4, name: "Atorvastatin 10mg", sku: "MED-004", batches: ["B2024-04"], currentStock: 180 },
  { id: 5, name: "Omeprazole 20mg", sku: "MED-005", batches: ["B2024-05"], currentStock: 320 },
];

const recentTransfers = [
  {
    id: "TRF-001",
    from: "Main Store",
    to: "Branch - North",
    medicine: "Paracetamol 500mg",
    qty: 100,
    status: "completed",
    time: "1 hr ago",
  },
  {
    id: "TRF-002",
    from: "Main Store",
    to: "ICU Pharmacy",
    medicine: "Amoxicillin 250mg",
    qty: 50,
    status: "in-transit",
    time: "3 hrs ago",
  },
  {
    id: "TRF-003",
    from: "Branch - South",
    to: "Main Store",
    medicine: "Metformin 500mg",
    qty: 200,
    status: "pending",
    time: "5 hrs ago",
  },
];

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    completed: {
      color: "bg-green-100 dark:bg-green-950/40 text-green-700",
      label: "Completed",
      icon: <CheckCircle size={12} />,
    },
    "in-transit": {
      color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700",
      label: "In Transit",
      icon: <Truck size={12} />,
    },
    pending: {
      color: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700",
      label: "Pending",
      icon: <Clock size={12} />,
    },
  };
  const s = map[status] || { color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400", label: status, icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export default function TransferPage() {
  const [fromStore, setFromStore] = useState("");
  const [toStore, setToStore] = useState("");
  const [selectedMed, setSelectedMed] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { medId: string; batch: string; qty: string; name: string }[]
  >([]);
  const [submitted, setSubmitted] = useState(false);

  // Has work once a transfer line is staged or the entry row is being filled.
  useTabDirty(items.length > 0 || !!selectedMed || !!quantity);

  const activeMed = medicines.find((m) => m.id.toString() === selectedMed);

  const addItem = () => {
    if (!selectedMed || !selectedBatch || !quantity) return;
    setItems((prev) => [
      ...prev,
      {
        medId: selectedMed,
        batch: selectedBatch,
        qty: quantity,
        name: activeMed?.name || "",
      },
    ]);
    setSelectedMed("");
    setSelectedBatch("");
    setQuantity("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFromStore("");
      setToStore("");
      setItems([]);
      setNotes("");
    }, 2500);
  };

  const fromStoreName = stores.find((s) => s.id.toString() === fromStore)?.name;
  const toStoreName = stores.find((s) => s.id.toString() === toStore)?.name;

  return (
    <PageContainer>
      <PageHeader
        title="Stock Transfer"
        subtitle="Transfer stock between stores and branches"
        icon={ArrowLeftRight}
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transfer Initiated</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transfer request has been submitted</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Store Selection */}
                <div>
                  <FieldLabel className="mb-3">Transfer Route</FieldLabel>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <FieldLabel>From Store</FieldLabel>
                      <div className="relative">
                        <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                        <select
                          required
                          value={fromStore}
                          onChange={(e) => setFromStore(e.target.value)}
                          className={cn(ds.field, "appearance-none pl-9")}
                        >
                          <option value="">Select store...</option>
                          {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center">
                        <ArrowRight size={18} className="text-blue-500" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <FieldLabel>To Store</FieldLabel>
                      <div className="relative">
                        <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                        <select
                          required
                          value={toStore}
                          onChange={(e) => setToStore(e.target.value)}
                          className={cn(ds.field, "appearance-none pl-9")}
                        >
                          <option value="">Select store...</option>
                          {stores
                            .filter((s) => s.id.toString() !== fromStore)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {fromStore && toStore && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Transfer from <strong>{fromStoreName}</strong> to{" "}
                        <strong>{toStoreName}</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Items */}
                <div>
                  <FieldLabel className="mb-3">Add Items</FieldLabel>
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <FieldLabel>Medicine</FieldLabel>
                      <select
                        value={selectedMed}
                        onChange={(e) => {
                          setSelectedMed(e.target.value);
                          setSelectedBatch("");
                        }}
                        className={ds.field}
                      >
                        <option value="">Select medicine...</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Batch</FieldLabel>
                      <select
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
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FieldLabel>Qty</FieldLabel>
                        <input
                          type="number"
                          min="1"
                          max={activeMed?.currentStock}
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className={ds.field}
                          placeholder="Qty"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addItem}
                        disabled={!selectedMed || !selectedBatch || !quantity}
                        className={cn(ds.btnPrimary, "self-end")}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {activeMed && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Available: {activeMed.currentStock} units
                    </p>
                  )}

                  {/* Items List */}
                  {items.length > 0 && (
                    <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-800">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-white uppercase">Medicine</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-white uppercase">Batch</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-white uppercase">Qty</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                              <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-400">{item.batch}</td>
                              <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{item.qty}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Priority + Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Priority</FieldLabel>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className={ds.field}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Notes</FieldLabel>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={ds.field}
                      placeholder="Transfer notes..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFromStore("");
                      setToStore("");
                      setItems([]);
                      setNotes("");
                    }}
                    className={cn(ds.btnOutline, "flex-1")}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={!fromStore || !toStore || items.length === 0}
                    className={cn(ds.btnPrimary, "flex-1")}
                  >
                    Initiate Transfer
                  </button>
                </div>
              </form>
            )}
          </Panel>
        </div>

        {/* Recent Transfers + Store Status */}
        <div className="space-y-4">
          {/* Store Status */}
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Store Status</h3>
            <div className="space-y-2">
              {stores.map((store) => (
                <div key={store.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{store.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{store.location}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      store.stock === "High"
                        ? "bg-green-100 dark:bg-green-950/40 text-green-700"
                        : store.stock === "Medium"
                        ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700"
                        : "bg-red-100 dark:bg-red-950/40 text-red-700"
                    }`}
                  >
                    {store.stock}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Recent Transfers */}
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent Transfers</h3>
            <div className="space-y-3">
              {recentTransfers.map((t) => (
                <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{t.id}</span>
                    <StatusChip status={t.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.medicine}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t.from} <ArrowRight size={10} className="inline mx-0.5" /> {t.to}
                  </p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-blue-600 font-medium">{t.qty} units</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Clock size={10} />
                      {t.time}
                    </span>
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

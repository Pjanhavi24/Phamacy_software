"use client";

import { useState } from "react";
import {
  CalendarClock,
  ArrowLeft,
  Truck,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import {
  PageContainer,
  PageHeader,
  Panel,
  PanelBar,
  SearchInput,
  StatusTabs,
  TableEmpty,
  Modal,
  FieldLabel,
  ds,
} from "@/components/design-system";
import { cn } from "@/lib/utils";

const expiryData = [
  {
    id: 1,
    name: "Azithromycin 500mg",
    batch: "B2024-06",
    expiry: "2024-06-20",
    daysLeft: -10,
    qty: 45,
    mrp: 95.0,
    supplier: "Abbott",
    location: "Shelf B1",
    category: "Antibiotic",
  },
  {
    id: 2,
    name: "Cefixime 200mg",
    batch: "B2024-07",
    expiry: "2024-06-25",
    daysLeft: -5,
    qty: 30,
    mrp: 140.0,
    supplier: "Lupin",
    location: "Shelf C3",
    category: "Antibiotic",
  },
  {
    id: 3,
    name: "Pantoprazole 40mg",
    batch: "B2024-08",
    expiry: "2024-07-10",
    daysLeft: 10,
    qty: 120,
    mrp: 75.0,
    supplier: "Sun Pharma",
    location: "Shelf A2",
    category: "Gastrointestinal",
  },
  {
    id: 4,
    name: "Atorvastatin 10mg",
    batch: "B2024-04",
    expiry: "2024-07-18",
    daysLeft: 18,
    qty: 180,
    mrp: 120.0,
    supplier: "Lupin",
    location: "Shelf D1",
    category: "Cardiac",
  },
  {
    id: 5,
    name: "Amoxicillin 250mg",
    batch: "B2024-02",
    expiry: "2024-08-15",
    daysLeft: 46,
    qty: 30,
    mrp: 85.0,
    supplier: "Cipla",
    location: "Shelf B3",
    category: "Antibiotic",
  },
  {
    id: 6,
    name: "Metronidazole 400mg",
    batch: "B2024-09",
    expiry: "2024-08-30",
    daysLeft: 61,
    qty: 200,
    mrp: 35.0,
    supplier: "Zydus",
    location: "Shelf E2",
    category: "Antibiotic",
  },
  {
    id: 7,
    name: "Levocetirizine 5mg",
    batch: "B2024-10",
    expiry: "2024-09-12",
    daysLeft: 74,
    qty: 90,
    mrp: 55.0,
    supplier: "Cipla",
    location: "Shelf F1",
    category: "Antihistamine",
  },
];

const filterTabs = [
  { label: "Expired", key: "expired" },
  { label: "Within 30 Days", key: "30" },
  { label: "Within 60 Days", key: "60" },
  { label: "Within 90 Days", key: "90" },
];

function getRowStyle(daysLeft: number) {
  if (daysLeft < 0) return "bg-red-50 dark:bg-red-950/40 border-l-4 border-red-400";
  if (daysLeft <= 30) return "bg-orange-50 dark:bg-orange-950/40 border-l-4 border-orange-400";
  if (daysLeft <= 60) return "bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-yellow-300";
  return "bg-white dark:bg-gray-900";
}

function getDaysTag(daysLeft: number) {
  if (daysLeft < 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/40 text-red-700">
        Expired {Math.abs(daysLeft)}d ago
      </span>
    );
  if (daysLeft <= 30)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-950/40 text-orange-700">
        {daysLeft}d left
      </span>
    );
  if (daysLeft <= 60)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700">
        {daysLeft}d left
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
      {daysLeft}d left
    </span>
  );
}

export default function ExpiryPage() {
  const [activeTab, setActiveTab] = useState("90");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const filtered = expiryData.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "expired") return matchSearch && item.daysLeft < 0;
    if (activeTab === "30") return matchSearch && item.daysLeft >= 0 && item.daysLeft <= 30;
    if (activeTab === "60") return matchSearch && item.daysLeft >= 0 && item.daysLeft <= 60;
    if (activeTab === "90") return matchSearch && item.daysLeft < 90;
    return matchSearch;
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((i) => i.id));
    }
  };

  const totalValue = filtered
    .filter((i) => selected.includes(i.id))
    .reduce((sum, i) => sum + i.qty * i.mrp, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Expiry Management"
        subtitle="Track and manage expiring medicines"
        icon={CalendarClock}
        actions={
          <Link href="/inventory" className={ds.btnOutline}>
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </Link>
        }
      />

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
          <span className="text-gray-500 dark:text-gray-400">Expired</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />
          <span className="text-gray-500 dark:text-gray-400">Within 30 days</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-sm bg-yellow-300 inline-block" />
          <span className="text-gray-500 dark:text-gray-400">Within 60 days</span>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {/* Tabs + Actions */}
        <PanelBar>
          <StatusTabs tabs={filterTabs} active={activeTab} onChange={setActiveTab} />
          <div className="flex gap-2 items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search..."
              className="w-56"
            />
            {selected.length > 0 && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                <Truck size={14} />
                Return to Supplier ({selected.length})
              </button>
            )}
          </div>
        </PanelBar>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 border-y border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3">
                  <button onClick={toggleAll}>
                    {selected.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                  </button>
                </th>
                {[
                  "Medicine",
                  "Batch",
                  "Expiry Date",
                  "Days Status",
                  "Qty",
                  "MRP",
                  "Value",
                  "Supplier",
                  "Location",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-white uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((item) => (
                <tr key={item.id} className={`${getRowStyle(item.daysLeft)} transition-colors`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(item.id)}>
                      {selected.includes(item.id) ? (
                        <CheckSquare size={16} className="text-blue-600" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{item.category}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-400">{item.batch}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.expiry}</td>
                  <td className="px-4 py-3">{getDaysTag(item.daysLeft)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{item.qty}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">&#8377;{item.mrp.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    &#8377;{(item.qty * item.mrp).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.supplier}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.location}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelected([item.id]);
                          setShowReturnModal(true);
                        }}
                        className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                      >
                        Return
                      </button>
                      <button className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <TableEmpty
                      icon={CalendarClock}
                      title="No expiring items found"
                      description="Try adjusting your search or filter."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected.length > 0 && (
          <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-100 dark:border-blue-900 flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selected.length} items selected — Total Value: ₹{totalValue.toFixed(2)}
            </span>
            <button
              onClick={() => setShowReturnModal(true)}
              className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
            >
              Bulk Return to Supplier
            </button>
          </div>
        )}
      </Panel>

      {/* Return Modal */}
      <Modal
        open={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Return to Supplier"
        footer={
          <>
            <button
              onClick={() => setShowReturnModal(false)}
              className={cn(ds.btnOutline, "flex-1")}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowReturnModal(false);
                setSelected([]);
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Confirm Return
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{selected.length} items selected</p>
          <div className="space-y-3">
            <div>
              <FieldLabel>Return Reason</FieldLabel>
              <select className={ds.field}>
                <option>Expired</option>
                <option>Near Expiry</option>
                <option>Quality Issue</option>
                <option>Overstocked</option>
              </select>
            </div>
            <div>
              <FieldLabel>Credit Note / Reference</FieldLabel>
              <input
                type="text"
                className={ds.field}
                placeholder="Reference number (optional)"
              />
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                rows={3}
                className={cn(ds.field, "h-auto resize-none py-2")}
                placeholder="Additional notes..."
              />
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/40 rounded-lg p-3">
              <p className="text-sm text-orange-700">
                Total return value: <strong>₹{totalValue.toFixed(2)}</strong>
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}

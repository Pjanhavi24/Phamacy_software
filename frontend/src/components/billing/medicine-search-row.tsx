"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, ChevronDown } from "lucide-react";

interface Batch {
  batchNo: string;
  expiry: string;
  mrp: number;
  rate: number;
  stock: number;
  gstRate: number;
}

interface Medicine {
  id: string;
  name: string;
  generic: string;
  batches: Batch[];
}

interface MedicineSearchRowProps {
  index: number;
  medicineName: string;
  batchNo: string;
  expiry: string;
  qty: number;
  mrp: number;
  rate: number;
  discount: number;
  gstRate: number;
  amount: number;
  onUpdate: (field: string, value: string | number) => void;
  onDelete: () => void;
  availableBatches?: Batch[];
}

export function MedicineSearchRow({
  index,
  medicineName,
  batchNo,
  expiry,
  qty,
  mrp,
  rate,
  discount,
  gstRate,
  amount,
  onUpdate,
  onDelete,
  availableBatches = [],
}: MedicineSearchRowProps) {
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const batchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) {
        setShowBatchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBatchSelect = (batch: Batch) => {
    onUpdate("batchNo", batch.batchNo);
    onUpdate("expiry", batch.expiry);
    onUpdate("mrp", batch.mrp);
    onUpdate("rate", batch.rate);
    onUpdate("gstRate", batch.gstRate);
    setShowBatchDropdown(false);
  };

  const isExpiringSoon = () => {
    if (!expiry) return false;
    const expiryDate = new Date(expiry + "-01");
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiryDate <= threeMonths;
  };

  const isExpired = () => {
    if (!expiry) return false;
    return new Date(expiry + "-01") < new Date();
  };

  return (
    <tr className="bg-white hover:bg-blue-50/30 transition-colors group">
      <td className="px-3 py-2 text-gray-400 text-xs">{index + 1}</td>

      {/* Medicine Name */}
      <td className="px-3 py-2">
        <div className="font-medium text-gray-800 text-sm">{medicineName}</div>
      </td>

      {/* Batch Selector */}
      <td className="px-3 py-2">
        <div className="relative" ref={batchRef}>
          <button
            onClick={() => availableBatches.length > 1 && setShowBatchDropdown(!showBatchDropdown)}
            className={`flex items-center gap-1 text-sm px-2 py-1 rounded border ${
              availableBatches.length > 1
                ? "cursor-pointer hover:border-blue-400 hover:bg-blue-50"
                : "cursor-default"
            }`}
          >
            {batchNo || "â€”"}
            {availableBatches.length > 1 && <ChevronDown size={12} className="text-gray-400" />}
          </button>
          {showBatchDropdown && (
            <div className="absolute top-full left-0 bg-white border rounded-lg shadow-xl z-30 w-72 mt-1">
              <div className="px-3 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500">Select Batch</div>
              {availableBatches.map((batch) => (
                <button
                  key={batch.batchNo}
                  onClick={() => handleBatchSelect(batch)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b last:border-0 ${
                    batch.batchNo === batchNo ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-sm">{batch.batchNo}</span>
                    <span className="text-xs text-gray-500">Exp: {batch.expiry}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-xs text-gray-500">MRP: â‚¹{batch.mrp} | Rate: â‚¹{batch.rate}</span>
                    <span className={`text-xs ${batch.stock < 10 ? "text-amber-500" : "text-green-600"}`}>
                      Stk: {batch.stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Expiry */}
      <td className="px-3 py-2">
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            isExpired()
              ? "bg-red-100 text-red-700"
              : isExpiringSoon()
              ? "bg-amber-100 text-amber-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {expiry || "â€”"}
        </span>
      </td>

      {/* Qty */}
      <td className="px-2 py-2">
        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => onUpdate("qty", parseInt(e.target.value) || 1)}
          className="w-16 text-center border rounded px-1 py-1 text-sm focus:border-blue-400 outline-none"
        />
      </td>

      {/* MRP */}
      <td className="px-2 py-2 text-right text-sm text-gray-500">â‚¹{mrp.toFixed(2)}</td>

      {/* Rate */}
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={rate}
          onChange={(e) => onUpdate("rate", parseFloat(e.target.value) || 0)}
          className="w-20 text-right border rounded px-2 py-1 text-sm focus:border-blue-400 outline-none"
        />
      </td>

      {/* Discount */}
      <td className="px-2 py-2">
        <div className="relative">
          <input
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={(e) => onUpdate("discount", parseFloat(e.target.value) || 0)}
            className="w-16 text-center border rounded px-1 py-1 text-sm focus:border-blue-400 outline-none pr-4"
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
        </div>
      </td>

      {/* GST */}
      <td className="px-2 py-2 text-center text-xs text-gray-500">{gstRate}%</td>

      {/* Amount */}
      <td className="px-3 py-2 text-right font-semibold text-gray-800">â‚¹{amount.toFixed(2)}</td>

      {/* Delete */}
      <td className="px-2 py-2">
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

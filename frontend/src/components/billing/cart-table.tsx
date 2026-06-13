"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/app/(dashboard)/billing/page";

interface Props {
  items: CartItem[];
  onUpdate: (id: string, changes: Partial<CartItem>) => void;
  onRemove: (id: string) => void;
}

export default function CartTable({ items, onUpdate, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <div className="text-4xl mb-2">ðŸ›’</div>
        <p className="text-sm">Cart is empty. Scan or search medicines to add.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="px-2 py-2 text-left text-gray-600 font-semibold w-6">#</th>
            <th className="px-2 py-2 text-left text-gray-600 font-semibold min-w-[120px]">Medicine</th>
            <th className="px-2 py-2 text-left text-gray-600 font-semibold">Batch</th>
            <th className="px-2 py-2 text-left text-gray-600 font-semibold">Expiry</th>
            <th className="px-2 py-2 text-center text-gray-600 font-semibold w-16">Qty</th>
            <th className="px-2 py-2 text-right text-gray-600 font-semibold">MRP</th>
            <th className="px-2 py-2 text-right text-gray-600 font-semibold">Rate</th>
            <th className="px-2 py-2 text-center text-gray-600 font-semibold w-16">Disc%</th>
            <th className="px-2 py-2 text-right text-gray-600 font-semibold">GST%</th>
            <th className="px-2 py-2 text-right text-gray-600 font-semibold">Amount</th>
            <th className="px-2 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} className={`border-b hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
              <td className="px-2 py-1.5 text-gray-500">{idx + 1}</td>
              <td className="px-2 py-1.5">
                <div className="font-medium text-gray-900 leading-tight">{item.name}</div>
                <div className="text-gray-400 text-[10px]">{item.generic}</div>
              </td>
              <td className="px-2 py-1.5 text-gray-700 font-mono">{item.batch}</td>
              <td className="px-2 py-1.5 text-gray-700">{item.expiry}</td>
              <td className="px-2 py-1.5">
                <Input
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={e => onUpdate(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-7 w-14 text-center text-xs px-1 border-gray-300"
                />
              </td>
              <td className="px-2 py-1.5 text-right text-gray-700">â‚¹{item.mrp.toFixed(2)}</td>
              <td className="px-2 py-1.5 text-right text-gray-700">â‚¹{item.rate.toFixed(2)}</td>
              <td className="px-2 py-1.5">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={item.discountPct}
                  onChange={e => onUpdate(item.id, { discountPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                  className="h-7 w-14 text-center text-xs px-1 border-gray-300"
                />
              </td>
              <td className="px-2 py-1.5 text-right text-gray-600">{item.gstPct}%</td>
              <td className="px-2 py-1.5 text-right font-semibold text-gray-900">â‚¹{item.amount.toFixed(2)}</td>
              <td className="px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.id)}
                  className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

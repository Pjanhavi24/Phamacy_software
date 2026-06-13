"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Upload, Loader2, CreditCard, Smartphone, Banknote, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import apiClient from "@/lib/api";
import type { Customer, PaymentMethod } from "@/app/(dashboard)/billing/page";

interface Props {
  customer: Customer | null;
  onCustomerChange: (c: Customer | null) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  netAmount: number;
  amountPaid: number;
  onAmountPaidChange: (v: number) => void;
  change: number;
  onSave: () => void;
  saving: boolean;
  cartEmpty: boolean;
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { key: "cash", label: "Cash", icon: <Banknote className="w-4 h-4" /> },
  { key: "upi", label: "UPI", icon: <Smartphone className="w-4 h-4" /> },
  { key: "card", label: "Card", icon: <CreditCard className="w-4 h-4" /> },
  { key: "credit", label: "Credit", icon: <BookOpen className="w-4 h-4" /> },
];

export default function PaymentPanel({
  customer, onCustomerChange,
  paymentMethod, onPaymentMethodChange,
  netAmount, amountPaid, onAmountPaidChange,
  change, onSave, saving, cartEmpty,
}: Props) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);

  useEffect(() => {
    if (!customerQuery.trim()) { setCustomerResults([]); setShowCustomerDrop(false); return; }
    const t = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const res = await apiClient.get(`/customers?search=${encodeURIComponent(customerQuery)}`);
        const data: Customer[] = res.data?.data ?? res.data ?? [];
        setCustomerResults(data);
        setShowCustomerDrop(true);
      } catch {
        setCustomerResults([]);
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  const selectCustomer = (c: Customer) => {
    onCustomerChange(c);
    setCustomerQuery("");
    setCustomerResults([]);
    setShowCustomerDrop(false);
  };

  const saveNewCustomer = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await apiClient.post("/customers", newCustomer);
      const created: Customer = res.data?.data ?? res.data;
      onCustomerChange(created);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: "", phone: "" });
      toast.success("Customer created!");
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Customer Section */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Customer</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowNewCustomerForm(v => !v); setShowCustomerDrop(false); }}
            className="h-7 text-xs text-blue-600 hover:text-blue-700"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            New Customer
          </Button>
        </div>

        {customer ? (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
            <div>
              <div className="font-medium text-sm text-gray-900">{customer.name}</div>
              <div className="text-xs text-gray-500">{customer.phone}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onCustomerChange(null); setCustomerQuery(""); }}
                className="h-6 w-6 p-0 ml-1 text-gray-400 hover:text-red-500"
              >
                Ã—
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              {searchingCustomer && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />}
              <Input
                value={customerQuery}
                onChange={e => setCustomerQuery(e.target.value)}
                onFocus={() => customerResults.length > 0 && setShowCustomerDrop(true)}
                placeholder="Search by name or phone..."
                className="pl-8 h-8 text-sm"
              />
            </div>
            {showCustomerDrop && customerResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                {customerResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.phone}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showNewCustomerForm && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border space-y-2">
            <div className="text-xs font-semibold text-gray-600 mb-1">New Customer</div>
            <Input
              placeholder="Full Name *"
              value={newCustomer.name}
              onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Phone Number *"
              value={newCustomer.phone}
              onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
              className="h-8 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveNewCustomer}
                disabled={savingCustomer}
                className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
              >
                {savingCustomer ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNewCustomerForm(false)}
                className="flex-1 h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Prescription */}
      <div className="px-4 py-3 border-b">
        <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Prescription (Optional)</Label>
        <div className="mt-2 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs border-dashed"
            >
              <span>
                <Upload className="w-3.5 h-3.5 mr-1" />
                {prescriptionFile ? prescriptionFile.name.slice(0, 20) + "..." : "Upload Image / PDF"}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => setPrescriptionFile(e.target.files?.[0] ?? null)}
                />
              </span>
            </Button>
          </label>
          {prescriptionFile && (
            <button
              onClick={() => setPrescriptionFile(null)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="px-4 py-3 border-b">
        <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Payment Method</Label>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {PAYMENT_METHODS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onPaymentMethodChange(key)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                paymentMethod === key
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-4 py-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Amount</Label>
          <span className="text-xs text-gray-500">Net: <span className="font-bold text-gray-900">â‚¹{netAmount.toFixed(2)}</span></span>
        </div>

        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Amount Received</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={amountPaid || ""}
            onChange={e => onAmountPaidChange(parseFloat(e.target.value) || 0)}
            placeholder={`â‚¹${netAmount.toFixed(2)}`}
            className="h-10 text-base font-semibold border-2 border-gray-300 focus:border-blue-500"
          />
        </div>

        {paymentMethod === "cash" && amountPaid > 0 && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
            change >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}>
            <span className={`text-sm font-medium ${change >= 0 ? "text-green-700" : "text-red-700"}`}>
              {change >= 0 ? "Change" : "Balance Due"}
            </span>
            <span className={`text-lg font-bold ${change >= 0 ? "text-green-700" : "text-red-700"}`}>
              â‚¹{Math.abs(change).toFixed(2)}
            </span>
          </div>
        )}

        <Button
          onClick={() => onAmountPaidChange(netAmount)}
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
        >
          Exact Amount
        </Button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 mt-auto border-t bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1 mb-3">
          <div className="flex justify-between">
            <span>Net Amount</span>
            <span className="font-semibold text-gray-900">â‚¹{netAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Method</span>
            <span className="font-medium capitalize text-blue-700">{paymentMethod}</span>
          </div>
        </div>
        <Button
          onClick={onSave}
          disabled={saving || cartEmpty}
          className="w-full h-11 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            "Save Bill"
          )}
        </Button>
      </div>
    </div>
  );
}

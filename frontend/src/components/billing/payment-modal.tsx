"use client";

import { useState, useEffect } from "react";
import { X, Banknote, Smartphone, CreditCard, Clock, CheckCircle2, Printer, MessageCircle } from "lucide-react";

interface PaymentBreakdown {
  cash: string;
  upi: string;
  card: string;
  credit: string;
}

interface PaymentModalProps {
  netAmount: number;
  customerName?: string;
  billNumber?: string;
  onClose: () => void;
  onConfirm: (payment: PaymentBreakdown) => void;
}

export function PaymentModal({
  netAmount,
  customerName,
  billNumber,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [payment, setPayment] = useState<PaymentBreakdown>({
    cash: netAmount.toFixed(2),
    upi: "0",
    card: "0",
    credit: "0",
  });
  const [step, setStep] = useState<"input" | "success">("input");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && step === "input" && totalPaid >= netAmount) handleConfirm();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [payment, step]);

  const totalPaid =
    parseFloat(payment.cash || "0") +
    parseFloat(payment.upi || "0") +
    parseFloat(payment.card || "0") +
    parseFloat(payment.credit || "0");

  const change = Math.max(0, totalPaid - netAmount);
  const remaining = Math.max(0, netAmount - totalPaid);
  const isValid = totalPaid >= netAmount;

  const handleConfirm = () => {
    if (!isValid) return;
    setStep("success");
  };

  const handleFinish = (action: "new" | "print" | "whatsapp") => {
    onConfirm(payment);
  };

  const quickCashAmounts = [
    Math.ceil(netAmount / 10) * 10,
    Math.ceil(netAmount / 50) * 50,
    Math.ceil(netAmount / 100) * 100,
    Math.ceil(netAmount / 500) * 500,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= netAmount).slice(0, 4);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {step === "input" ? (
          <>
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Collect Payment</h2>
                  {billNumber && <p className="text-sm text-gray-400 mt-0.5">{billNumber}</p>}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-700">â‚¹{netAmount.toFixed(2)}</span>
                <span className="text-gray-400 text-sm">due</span>
              </div>
              {customerName && (
                <div className="mt-1 text-sm text-gray-500">Customer: <span className="font-medium text-gray-700">{customerName}</span></div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="p-6 space-y-3">
              <PaymentMethodRow
                icon={<Banknote size={18} className="text-green-600" />}
                label="Cash"
                sublabel="Physical currency"
                value={payment.cash}
                onChange={(v) => setPayment({ ...payment, cash: v })}
                bgColor="bg-green-50"
                borderColor="border-green-200 focus:border-green-500"
              />
              <PaymentMethodRow
                icon={<Smartphone size={18} className="text-purple-600" />}
                label="UPI"
                sublabel="GPay / PhonePe / BHIM"
                value={payment.upi}
                onChange={(v) => setPayment({ ...payment, upi: v })}
                bgColor="bg-purple-50"
                borderColor="border-purple-200 focus:border-purple-500"
              />
              <PaymentMethodRow
                icon={<CreditCard size={18} className="text-blue-600" />}
                label="Card"
                sublabel="Debit / Credit card"
                value={payment.card}
                onChange={(v) => setPayment({ ...payment, card: v })}
                bgColor="bg-blue-50"
                borderColor="border-blue-200 focus:border-blue-500"
              />
              <PaymentMethodRow
                icon={<Clock size={18} className="text-orange-600" />}
                label="Credit"
                sublabel="Pay later"
                value={payment.credit}
                onChange={(v) => setPayment({ ...payment, credit: v })}
                bgColor="bg-orange-50"
                borderColor="border-orange-200 focus:border-orange-500"
              />

              {/* Quick Cash Buttons */}
              {parseFloat(payment.upi) === 0 && parseFloat(payment.card) === 0 && parseFloat(payment.credit) === 0 && (
                <div className="pt-1">
                  <p className="text-xs text-gray-400 mb-2">Quick cash:</p>
                  <div className="flex gap-2 flex-wrap">
                    {quickCashAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setPayment({ ...payment, cash: amt.toString() })}
                        className="px-3 py-1.5 border rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        â‚¹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="border-t pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Collected</span>
                  <span className={`font-semibold ${isValid ? "text-green-600" : "text-red-500"}`}>
                    â‚¹{totalPaid.toFixed(2)}
                  </span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">Still Remaining</span>
                    <span className="font-semibold text-red-500">â‚¹{remaining.toFixed(2)}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between text-sm bg-green-50 px-3 py-2 rounded-lg">
                    <span className="text-green-700 font-medium">Return Change</span>
                    <span className="font-bold text-green-700">â‚¹{change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border py-3 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid}
                className="flex-2 flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </>
        ) : (
          // Success State
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Successful!</h2>
            <p className="text-gray-500 text-sm mb-2">{billNumber}</p>
            <p className="text-3xl font-bold text-blue-700 mb-4">â‚¹{netAmount.toFixed(2)}</p>
            {change > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 inline-block">
                <span className="text-amber-800 font-medium">Return â‚¹{change.toFixed(2)} to customer</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleFinish("print")}
                className="flex-1 flex items-center justify-center gap-2 border py-3 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={() => handleFinish("whatsapp")}
                className="flex-1 flex items-center justify-center gap-2 border border-green-200 py-3 rounded-xl text-green-700 hover:bg-green-50"
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button
                onClick={() => handleFinish("new")}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl"
              >
                New Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentMethodRow({
  icon,
  label,
  sublabel,
  value,
  onChange,
  bgColor,
  borderColor,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-shrink-0 w-28">
        <div className="text-sm font-semibold text-gray-800">{label}</div>
        <div className="text-xs text-gray-400">{sublabel}</div>
      </div>
      <div className="flex-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">â‚¹</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-8 pr-3 py-2.5 border-2 rounded-xl text-sm font-medium outline-none transition-colors ${borderColor}`}
        />
      </div>
    </div>
  );
}

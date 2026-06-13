import React from "react";

export interface InvoiceItem {
  sNo: number;
  description: string;
  batch: string;
  expiry: string;
  qty: number;
  mrp: number;
  rate: number;
  discPercent: number;
  gstPercent: number;
  amount: number;
  /** HSN/SAC code (thermal bill column). */
  hsn?: string;
  /** Manufacturer / brand (thermal bill "Mfg." column). */
  mfg?: string;
}

export interface SaleData {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTime: string;
  patientName: string;
  patientPhone: string;
  patientAddress?: string;
  doctorName?: string;
  doctorSpecialization?: string;
  doctorReg?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  cgst: number;
  sgst: number;
  netAmount: number;
  paidAmount: number;
  paymentMode: "cash" | "upi" | "card" | "credit";
  changeAmount?: number;
}

export interface StoreData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  dlNumber: string;
  phone: string;
  email?: string;
  /** Optional logo image URL; falls back to a monogram if absent. */
  logoUrl?: string;
}

// Indian-format amount in words (e.g. 1,23,456 -> "One Lakh Twenty Three...").
function amountToWords(value: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const two = (n: number): string =>
    n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`;
  const three = (n: number): string =>
    n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? " " + two(n % 100) : ""}` : two(n);

  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));

  let words = parts.join(" ").trim();
  if (rupees > 0) words += " Rupees";
  if (paise > 0) words += `${rupees > 0 ? " and" : ""} ${two(paise)} Paise`;
  return `${words} Only`;
}

export interface InvoiceTemplateProps {
  saleData: SaleData;
  storeData: StoreData;
  printMode?: "a4" | "thermal";
}

const paymentModeLabel: Record<SaleData["paymentMode"], string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card / POS",
  credit: "Credit",
};

export function InvoiceTemplate({
  saleData,
  storeData,
  printMode = "a4",
}: InvoiceTemplateProps) {
  const isThermal = printMode === "thermal";

  const initials = storeData.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const amountInWords = amountToWords(saleData.netAmount);

  const containerClass = isThermal
    ? "invoice-thermal w-full text-[10px] font-mono leading-tight p-2"
    : "invoice-a4 w-full max-w-[210mm] text-[12px] font-sans p-8";

  const totalQty = saleData.items.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      {/* Static CSS via dangerouslySetInnerHTML so the server and client emit
          identical markup (a plain <style>{`…`}</style> HTML-escapes the single
          quotes in 'Courier New' on the server only → hydration mismatch). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .invoice-print-area, .invoice-print-area * { visibility: visible; }
          .invoice-print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        .invoice-thermal { font-family: 'Courier New', monospace; }
        .invoice-a4 { font-family: Arial, sans-serif; }
      `,
        }}
      />

      <div className={`invoice-print-area ${containerClass} bg-white text-black`}>
        {/* Store Header */}
        <div className={`text-center ${isThermal ? "mb-2" : "mb-6 border-b-2 border-black pb-4"}` }>
          {!isThermal &&
            (storeData.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storeData.logoUrl}
                alt={`${storeData.name} logo`}
                className="mx-auto mb-2 h-14 w-14 object-contain"
              />
            ) : (
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
                {initials}
              </div>
            ))}
          <h1 className={isThermal ? "text-[15px] font-bold uppercase tracking-widest" : "text-2xl font-bold uppercase"}>
            {storeData.name}
          </h1>
          <p className={isThermal ? "text-[9.5px]" : "text-sm mt-1"}>
            {storeData.address}, {storeData.city} - {storeData.pincode}
            {isThermal ? `, ${storeData.state} · Ph: ${storeData.phone}` : ""}
          </p>
          {!isThermal && (
            <p className="text-sm">{storeData.state}</p>
          )}
          {!isThermal && (
            <p className="text-sm">
              Ph: {storeData.phone}{storeData.email ? ` | ${storeData.email}` : ""}
            </p>
          )}
          {!isThermal && (
            <p className="text-sm">
              GSTIN: {storeData.gstin} | DL: {storeData.dlNumber}
            </p>
          )}
          {isThermal && <p className="mt-0.5 font-bold">Tax Invoice</p>}
          {isThermal && <div className="mt-1 border-t border-dashed border-black" />}
        </div>

        {/* Invoice Title & Details */}
        {isThermal ? (
          <div className="mb-1 text-[10px] leading-snug">
            <div className="flex justify-between gap-3">
              <span><span className="font-semibold">Patient:</span> {saleData.patientName}</span>
              <span><span className="font-semibold">Cash No:</span> {saleData.invoiceNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>
                <span className="font-semibold">Doctor:</span> {saleData.doctorName || "—"}
              </span>
              <span><span className="font-semibold">Date:</span> {saleData.invoiceDate} {saleData.invoiceTime}</span>
            </div>
            {saleData.patientAddress && (
              <div><span className="font-semibold">Address:</span> {saleData.patientAddress}</div>
            )}
          </div>
        ) : (
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">TAX INVOICE</h2>
              <div className="text-sm space-y-0.5">
                <p><span className="font-medium">Invoice No:</span> {saleData.invoiceNumber}</p>
                <p><span className="font-medium">Date:</span> {saleData.invoiceDate}</p>
                <p><span className="font-medium">Time:</span> {saleData.invoiceTime}</p>
              </div>
            </div>
            {saleData.doctorName && (
              <div className="rounded border border-gray-300 px-3 py-2 text-right text-sm">
                <p className="font-semibold">Prescribing Doctor</p>
                <p className="font-medium">{saleData.doctorName}</p>
                {saleData.doctorSpecialization && (
                  <p className="text-gray-600">{saleData.doctorSpecialization}</p>
                )}
                {saleData.doctorReg && (
                  <p className="text-gray-600">Reg. No: {saleData.doctorReg}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bill To */}
        {isThermal ? null : (
          <div className="mb-6 p-3 border border-gray-300 rounded">
            <p className="font-semibold text-sm mb-1">BILL TO</p>
            <p className="font-medium">{saleData.patientName}</p>
            <p className="text-sm">{saleData.patientPhone}</p>
            {saleData.patientAddress && <p className="text-sm">{saleData.patientAddress}</p>}
          </div>
        )}

        {/* Items Table */}
        {isThermal ? (
          <table className="mb-1 w-full border-collapse text-[9.5px]">
            <thead>
              <tr className="border-y border-dashed border-black">
                <th className="border-r border-dashed border-black px-1 py-0.5 text-left">HSN</th>
                <th className="border-r border-dashed border-black px-1 py-0.5 text-center">Qty</th>
                <th className="border-r border-dashed border-black px-1 py-0.5 text-left">Description</th>
                <th className="border-r border-dashed border-black px-1 py-0.5 text-left">Mfg.</th>
                <th className="border-r border-dashed border-black px-1 py-0.5 text-left">Batch No</th>
                <th className="border-r border-dashed border-black px-1 py-0.5 text-center">Expiry</th>
                <th className="border-r border-dashed border-black px-1 py-0.5 text-right">Rate</th>
                <th className="px-1 py-0.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {saleData.items.map((item) => (
                <tr key={item.sNo} className="align-top">
                  <td className="border-r border-dashed border-black px-1 py-0.5">{item.hsn || "-"}</td>
                  <td className="border-r border-dashed border-black px-1 py-0.5 text-center">{item.qty}</td>
                  <td className="border-r border-dashed border-black px-1 py-0.5">{item.description}</td>
                  <td className="border-r border-dashed border-black px-1 py-0.5">{item.mfg || "-"}</td>
                  <td className="border-r border-dashed border-black px-1 py-0.5">{item.batch || "-"}</td>
                  <td className="border-r border-dashed border-black px-1 py-0.5 text-center">{item.expiry || "-"}</td>
                  <td className="border-r border-dashed border-black px-1 py-0.5 text-right">{item.rate.toFixed(2)}</td>
                  <td className="px-1 py-0.5 text-right">{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left">#</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">HSN</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Description</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center">Batch</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center">Expiry</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">Qty</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">MRP</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">GST%</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {saleData.items.map((item) => (
                  <tr key={item.sNo}>
                    <td className="border border-gray-300 px-2 py-1 text-center">{item.sNo}</td>
                    <td className="border border-gray-300 px-2 py-1">{item.hsn || "-"}</td>
                    <td className="border border-gray-300 px-2 py-1">{item.description}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{item.batch}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{item.expiry}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.qty}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.mrp.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.gstPercent}%</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-medium">{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        {isThermal ? (
          <div className="mb-1 text-[10px]">
            <div className="flex justify-between">
              <span>Total Qty: {totalQty}</span>
              <span>Sub Total: {saleData.subtotal.toFixed(2)}</span>
            </div>
            {saleData.totalDiscount > 0 && (
              <div className="flex justify-between"><span>Discount:</span><span>-{saleData.totalDiscount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between"><span>CGST + SGST:</span><span>{(saleData.cgst + saleData.sgst).toFixed(2)}</span></div>
            <div className="mt-0.5 flex justify-between border-t border-dashed border-black pt-0.5 text-[12px] font-bold">
              <span>Amount:</span><span>&#8377;{saleData.netAmount.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-end mb-6">
            <div className="w-64 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>&#8377;{saleData.subtotal.toFixed(2)}</span>
              </div>
              {saleData.totalDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-&#8377;{saleData.totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CGST:</span>
                <span>&#8377;{saleData.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span>&#8377;{saleData.sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-black pt-2 font-bold text-base">
                <span>Net Amount:</span>
                <span>&#8377;{saleData.netAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span>Paid via {paymentModeLabel[saleData.paymentMode]}:</span>
                <span>&#8377;{saleData.paidAmount.toFixed(2)}</span>
              </div>
              {saleData.changeAmount !== undefined && saleData.changeAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Change:</span>
                  <span>&#8377;{saleData.changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Amount in words */}
        <div className={isThermal ? "mb-2" : "mb-4"}>
          <p className={isThermal ? "" : "text-sm"}>
            <span className="font-semibold">Amount in words:</span> {amountInWords}
          </p>
          {isThermal && <p>{"-".repeat(32)}</p>}
        </div>

        {/* Authorised signatory (A4 only) */}
        {!isThermal && (
          <div className="mb-6 flex justify-end">
            <div className="pt-10 text-center text-sm">
              <div className="border-t border-black px-8 pt-1">
                For <span className="font-semibold">{storeData.name}</span>
                <div className="text-xs text-gray-600">Authorised Signatory</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {isThermal ? (
          <div className="mt-1 text-[9px] leading-snug">
            <div className="flex justify-between border-t border-dashed border-black pt-1">
              <span>D.L. No.: {storeData.dlNumber}</span>
              <span>GSTIN: {storeData.gstin}</span>
            </div>
            <p className="mt-0.5 font-semibold">CONSULT DOCTOR BEFORE USING MEDICINE</p>
            <div className="mt-1 flex justify-between">
              <span>E.&amp;O.E.</span>
              <span>For {storeData.name}</span>
            </div>
            <div className="mt-3 text-right">R.P. Sign: ______________</div>
          </div>
        ) : (
          <div className="border-t border-gray-300 pt-4 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">
              This is a computer-generated invoice from a licensed pharmacy.
            </p>
            <p>
              Medicines sold are not returnable unless the product is damaged or dispensed incorrectly.
              Returns accepted within 7 days with original bill and unopened/sealed packaging only.
            </p>
            <p className="mt-2">
              Subject to local jurisdiction. All disputes to be settled in {storeData.city} courts.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default InvoiceTemplate;

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Gmail inbox pre-filtered to likely supplier invoices.
const GMAIL_INBOX_URL =
  "https://mail.google.com/mail/u/0/#search/(invoice+OR+bill+OR+purchase)+has%3Aattachment";
import {
  Mail, Link2, RefreshCw, FileText, Package, CheckCircle2,
  AlertCircle, Loader2, ChevronDown, ChevronRight, ExternalLink,
  ShoppingCart, Eye, ArrowRight, Download
} from "lucide-react";
import { PageContainer, Panel, Modal } from "@/components/design-system";
import { Button } from "@/components/ui/button";

interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachment: boolean;
  attachments: { name: string; mimeType: string; size: number; attachmentId: string }[];
}

interface ParsedItem {
  medicineName: string;
  genericName?: string;
  manufacturer?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unit?: string;
  purchaseRate: number;
  mrp?: number;
  gstPercent?: number;
  discount?: number;
  amount: number;
}

interface ParsedInvoice {
  supplierName?: string;
  supplierGSTIN?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  taxAmount?: number;
  items: ParsedItem[];
  confidence: number;
  attachmentName: string;
}

// Session key the Purchase Entry page reads to pre-fill its grid.
const PURCHASE_IMPORT_KEY = "pharma_purchase_import";

// Normalize a free-form date to YYYY-MM-DD (invoice date input).
function toYMD(s?: string): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const dmy = /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// Normalize a free-form expiry to YYYY-MM (month input).
function toYM(s?: string): string {
  if (!s) return "";
  const ym = /(\d{4})[-/](\d{1,2})/.exec(s);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}`;
  const my = /(\d{1,2})[-/](\d{4})/.exec(s);
  if (my) return `${my[2]}-${my[1].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Build the download URL for a Gmail attachment (streamed by the backend).
function attachmentUrl(emailId: string, att: { attachmentId: string; name: string }): string {
  return `/api/v1/gmail/attachment/${emailId}/${att.attachmentId}?name=${encodeURIComponent(att.name)}`;
}

type ImportStatus = "idle" | "parsing" | "parsed" | "creating" | "created" | "error";

interface EmailRow extends EmailSummary {
  status: ImportStatus;
  parsedData?: ParsedInvoice[];
  purchaseId?: string;
  error?: string;
}

export default function GmailImportPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<ParsedInvoice | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/v1/gmail/status");
      const data = await res.json();
      setConnected(data.connected);
      if (data.connected) {
        fetchEmails();
      } else if (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("connect") === "1"
      ) {
        // Arrived via the "Import from Gmail" action — open Gmail automatically.
        connectGmail();
      }
    } catch {
      setConnected(false);
    }
  };

  const connectGmail = async () => {
    let url = "";
    try {
      const res = await fetch("/api/v1/gmail/auth-url");
      const data = await res.json();
      url = data?.url ?? "";
    } catch {
      /* backend unreachable — fall through to opening Gmail directly */
    }

    // If the Gmail API isn't configured (no OAuth client id), just open Gmail
    // so the user can download the invoice and use "Import Excel".
    let hasClientId = false;
    try {
      hasClientId = !!url && !!new URL(url).searchParams.get("client_id");
    } catch {
      hasClientId = false;
    }
    if (!hasClientId) {
      window.open(GMAIL_INBOX_URL, "_blank");
      toast.info(
        "Gmail auto-import isn't configured yet — opened Gmail so you can download the invoice and use Import Excel."
      );
      return;
    }

    window.open(url, "_blank", "width=600,height=700");
    // Poll for connection
    const interval = setInterval(async () => {
      const check = await fetch("/api/v1/gmail/status");
      const data = await check.json();
      if (data.connected) {
        clearInterval(interval);
        setConnected(true);
        fetchEmails();
      }
    }, 2000);
    setTimeout(() => clearInterval(interval), 120000);
  };

  const fetchEmails = async () => {
    setLoading(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/v1/gmail/emails");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setEmailError(
          (data && (data.error as string)) || "Failed to fetch emails from Gmail."
        );
        setEmails([]);
        return;
      }
      setEmails((data as EmailSummary[]).map((e) => ({ ...e, status: "idle" })));
    } catch {
      setEmailError("Could not reach Gmail. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const parseEmail = async (emailId: string) => {
    setEmails((prev) => prev.map((e) => e.id === emailId ? { ...e, status: "parsing" } : e));
    try {
      const res = await fetch(`/api/v1/gmail/parse/${emailId}`, { method: "POST" });
      if (!res.ok) throw new Error("Parse failed");
      const data: ParsedInvoice[] = await res.json();
      setEmails((prev) =>
        prev.map((e) => e.id === emailId ? { ...e, status: "parsed", parsedData: data } : e)
      );
      setExpandedId(emailId);
    } catch (err) {
      setEmails((prev) =>
        prev.map((e) => e.id === emailId ? { ...e, status: "error", error: String(err) } : e)
      );
    }
  };

  const createPurchase = async (emailId: string, invoiceIndex: number) => {
    setEmails((prev) => prev.map((e) => e.id === emailId ? { ...e, status: "creating" } : e));
    try {
      const email = emails.find((e) => e.id === emailId);
      const invoice = email?.parsedData?.[invoiceIndex];
      if (!invoice) throw new Error("Invoice data missing");

      const res = await fetch("/api/v1/gmail/create-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, invoiceIndex }),
      });
      const data = await res.json();
      setEmails((prev) =>
        prev.map((e) => e.id === emailId ? { ...e, status: "created", purchaseId: data.purchaseId } : e)
      );
    } catch (err) {
      setEmails((prev) =>
        prev.map((e) => e.id === emailId ? { ...e, status: "error", error: String(err) } : e)
      );
    }
  };

  // Hand the parsed bill to the Purchase Entry page (so it fills the same rows).
  const loadIntoPurchase = (invoice: ParsedInvoice) => {
    const payload = {
      supplierName: invoice.supplierName || "",
      supplierGstin: invoice.supplierGSTIN || "",
      invoiceNumber: invoice.invoiceNumber || "",
      invoiceDate: toYMD(invoice.invoiceDate),
      items: invoice.items.map((it) => ({
        medicineName: it.medicineName,
        batchNo: it.batchNumber || "",
        expiryDate: toYM(it.expiryDate),
        qty: it.quantity || 1,
        mrp: it.mrp || 0,
        purchaseRate: it.purchaseRate || 0,
        saleRate: 0,
        gstRate: it.gstPercent ?? 5,
        schemeValue: it.discount || 0,
      })),
    };
    try {
      sessionStorage.setItem(PURCHASE_IMPORT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    router.push("/purchase");
  };

  const confidenceColor = (c: number) =>
    c >= 0.8 ? "text-green-600" : c >= 0.6 ? "text-yellow-600" : "text-red-600";

  return (
    <PageContainer className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Gmail Invoice Import</h1>
            <p className="mt-0.5 text-xs text-gray-500">Auto-detect and import supplier invoices from Gmail</p>
          </div>
        </div>
        {connected && (
          <Button variant="outline" size="sm" onClick={fetchEmails} disabled={loading}>
            <RefreshCw className={`mr-1.5 w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Connection Status */}
      {connected === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !connected ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Gmail</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Connect your Gmail account to automatically detect and import supplier invoices.
            We only read emails with attachments matching invoice patterns.
          </p>
          <button
            onClick={connectGmail}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
          >
            <Link2 className="w-4 h-4" />
            Connect Gmail Account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {loading && emails.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading emails...
            </div>
          )}

          {!loading && emails.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
              {emailError ? (
                <>
                  <p className="font-medium text-red-600">Couldn&apos;t load emails</p>
                  <p className="mx-auto mt-1 max-w-xl whitespace-pre-line text-sm text-gray-500">{emailError}</p>
                </>
              ) : (
                <>
                  <p>No emails found</p>
                  <p className="text-sm mt-1">Your recent Gmail messages will appear here</p>
                </>
              )}
            </div>
          )}

          {emails.map((email) => (
            <Panel key={email.id} className="overflow-hidden">
              {/* Email row */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                      className="mt-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      {expandedId === email.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{email.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{email.from}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{new Date(email.date).toLocaleDateString("en-IN")}</span>
                        {email.attachments.map((att) => (
                          <span key={att.name} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            <FileText className="w-3 h-3" />
                            {att.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {email.status === "idle" && email.hasAttachment && (
                      <button
                        onClick={() => parseEmail(email.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600"
                      >
                        <Package className="w-3 h-3" /> Parse Invoice
                      </button>
                    )}
                    {email.status === "parsing" && (
                      <span className="flex items-center gap-1.5 text-xs text-blue-600">
                        <Loader2 className="w-3 h-3 animate-spin" /> Parsing...
                      </span>
                    )}
                    {email.status === "parsed" && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" /> Parsed
                      </span>
                    )}
                    {email.status === "created" && (
                      <a
                        href={`/purchases/${email.purchaseId}`}
                        className="flex items-center gap-1.5 text-xs text-purple-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View Purchase
                      </a>
                    )}
                    {email.status === "error" && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded: email content + attachments + parsed data */}
              {expandedId === email.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                  {/* Email body snippet + downloadable attachments */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    {email.snippet && (
                      <p className="whitespace-pre-line text-sm text-gray-600">{email.snippet}</p>
                    )}
                    {email.attachments.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {email.attachments.map((att) => (
                          <a
                            key={att.attachmentId || att.name}
                            href={attachmentUrl(email.id, att)}
                            download={att.name}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <FileText className="h-3.5 w-3.5 text-gray-400" />
                            <span className="max-w-[240px] truncate">{att.name}</span>
                            <Download className="h-3.5 w-3.5 text-blue-600" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-gray-400">No attachments on this email.</p>
                    )}
                  </div>

                  {email.parsedData?.map((invoice, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4">
                      {/* Invoice header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{invoice.supplierName ?? "Unknown Supplier"}</p>
                          {invoice.supplierGSTIN && <p className="text-xs text-gray-500">GSTIN: {invoice.supplierGSTIN}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {invoice.invoiceNumber && <span>Invoice: {invoice.invoiceNumber}</span>}
                            {invoice.invoiceDate && <span>Date: {invoice.invoiceDate}</span>}
                            {invoice.totalAmount && <span className="font-medium text-gray-800">₹{invoice.totalAmount.toFixed(2)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${confidenceColor(invoice.confidence)}`}>
                            {Math.round(invoice.confidence * 100)}% confidence
                          </span>
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-800">
                            <tr>
                              {["Medicine", "Batch", "Expiry", "Qty", "Rate", "MRP", "GST%", "Amount"].map((h) => (
                                <th key={h} className="px-3 py-2 text-left font-medium text-white">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {invoice.items.map((item, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <p className="font-medium text-gray-800">{item.medicineName}</p>
                                  {item.genericName && <p className="text-gray-400">{item.genericName}</p>}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-gray-600">{item.batchNumber ?? "-"}</td>
                                <td className="px-3 py-2 text-gray-600">{item.expiryDate ?? "-"}</td>
                                <td className="px-3 py-2 text-gray-800">{item.quantity} {item.unit}</td>
                                <td className="px-3 py-2 text-gray-800">₹{item.purchaseRate}</td>
                                <td className="px-3 py-2 text-gray-600">{item.mrp ? `₹${item.mrp}` : "-"}</td>
                                <td className="px-3 py-2 text-gray-600">{item.gstPercent ?? 0}%</td>
                                <td className="px-3 py-2 font-medium text-gray-800">₹{item.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Actions */}
                      {email.status !== "created" && (
                        <div className="flex flex-wrap justify-end gap-2 mt-3">
                          <button
                            onClick={() => loadIntoPurchase(invoice)}
                            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Load into Purchase Entry
                          </button>
                          <button
                            onClick={() => createPurchase(email.id, idx)}
                            disabled={email.status === "creating"}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                          >
                            {email.status === "creating" ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-4 h-4" />
                            )}
                            Create Purchase Entry
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      {/* Invoice detail modal */}
      <Modal
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Invoice Details"
        size="lg"
      >
        {selectedInvoice && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ["Supplier", selectedInvoice.supplierName],
                ["GSTIN", selectedInvoice.supplierGSTIN],
                ["Invoice No", selectedInvoice.invoiceNumber],
                ["Invoice Date", selectedInvoice.invoiceDate],
                ["Total Amount", selectedInvoice.totalAmount ? `₹${selectedInvoice.totalAmount.toFixed(2)}` : undefined],
                ["Tax Amount", selectedInvoice.taxAmount ? `₹${selectedInvoice.taxAmount.toFixed(2)}` : undefined],
                ["Items Count", selectedInvoice.items.length],
                ["Confidence", `${Math.round(selectedInvoice.confidence * 100)}%`],
              ].map(([label, value]) => value !== undefined && (
                <div key={String(label)} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">{selectedInvoice.items.length} Line Items</p>
            <div className="space-y-2">
              {selectedInvoice.items.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{item.medicineName}</span>
                    <span className="font-medium text-gray-800">₹{item.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Qty: {item.quantity} {item.unit} @ ₹{item.purchaseRate}
                    {item.batchNumber && ` | Batch: ${item.batchNumber}`}
                    {item.expiryDate && ` | Exp: ${item.expiryDate}`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle, Clock, CheckCheck, Phone,
  FileText, Bell, Edit3, Loader2, Search, Plus, X
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/design-system";

interface Customer {
  id: string;
  name: string;
  phone: string;
  lastPurchase?: string;
  totalPurchases?: number;
}

interface MessageLog {
  id: string;
  recipient: string;
  phone: string;
  message: string;
  status: "sent" | "delivered" | "failed" | "pending";
  type: "invoice" | "reminder" | "promo" | "custom";
  sentAt: string;
}

const TABS = ["Send Invoice", "Bulk Reminders", "Promo Templates", "Message History"];

const DEFAULT_TEMPLATES = [
  {
    id: "1",
    name: "Refill Reminder",
    content: "Dear {{name}}, your prescription for {{medicine}} is due for refill. Visit us or call {{phone}}. - {{pharmacy_name}}",
  },
  {
    id: "2",
    name: "Offer Announcement",
    content: "Hi {{name}}! Enjoy {{discount}}% OFF on all medicines this {{day}}. Limited time offer! Visit {{pharmacy_name}}. T&C apply.",
  },
  {
    id: "3",
    name: "New Arrival",
    content: "Dear {{name}}, we now stock {{medicine}}. Available at {{pharmacy_name}}. Contact us at {{phone}}.",
  },
];

const STATUS_COLORS: Record<string, string> = {
  sent: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
  delivered: "text-green-600 bg-green-50 dark:bg-green-950/40",
  failed: "text-red-600 bg-red-50 dark:bg-red-950/40",
  pending: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40",
};

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<typeof DEFAULT_TEMPLATES[0] | null>(null);
  const [reminderMessage, setReminderMessage] = useState(
    "Dear {{name}}, your prescription is due for refill. Please visit us soon."
  );
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    fetchCustomers();
    fetchLogs();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers?hasWhatsApp=true&recent=true");
      if (res.ok) setCustomers(await res.json());
    } catch { /* ignore */ }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/whatsapp/logs");
      if (res.ok) setMessageLogs(await res.json());
    } catch { /* ignore */ }
  };

  const sendInvoice = async (customerId: string, saleId?: string) => {
    setLoading(true);
    try {
      await fetch("/api/whatsapp/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, saleId }),
      });
      setSendStatus("done");
      fetchLogs();
    } catch { setSendStatus("error"); }
    finally { setLoading(false); }
  };

  const sendBulkReminders = async () => {
    if (!selectedCustomers.length) return;
    setLoading(true);
    setSendStatus("sending");
    try {
      await fetch("/api/whatsapp/bulk-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: selectedCustomers, message: reminderMessage }),
      });
      setSendStatus("done");
      setSelectedCustomers([]);
      fetchLogs();
    } catch { setSendStatus("error"); }
    finally { setLoading(false); }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <PageContainer>
      <div className="max-w-6xl mx-auto w-full space-y-4">
      <PageHeader
        title="WhatsApp Messaging Center"
        subtitle="Send invoices, reminders, and promotions via WhatsApp"
        icon={MessageCircle}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === i ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Send Invoice */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 shadow-sm">
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent dark:text-gray-200 dark:placeholder-gray-500"
            />
          </div>
          <div className="grid gap-3">
            {filteredCustomers.slice(0, 10).map((customer) => (
              <div key={customer.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                    {customer.lastPurchase && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Last purchase: {customer.lastPurchase}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => sendInvoice(customer.id)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  Send Invoice
                </button>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No customers found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Bulk Reminders */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reminder Message</label>
            <textarea
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-transparent dark:bg-gray-800 dark:text-gray-200"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Use {"{{name}}"}, {"{{medicine}}"}, {"{{pharmacy_name}}"} as placeholders</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Select Customers ({selectedCustomers.length} selected)</h3>
              <button
                onClick={() =>
                  setSelectedCustomers(
                    selectedCustomers.length === customers.length ? [] : customers.map((c) => c.id)
                  )
                }
                className="text-sm text-green-600 hover:underline"
              >
                {selectedCustomers.length === customers.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customers.map((c) => (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(c.id)}
                    onChange={(e) =>
                      setSelectedCustomers((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                      )
                    }
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{c.phone}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={sendBulkReminders}
            disabled={!selectedCustomers.length || loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
            Send Reminders to {selectedCustomers.length} Customers
          </button>

          {sendStatus === "done" && (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/50 rounded-xl p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCheck className="w-4 h-4" /> Messages sent successfully!
            </div>
          )}
        </div>
      )}

      {/* Tab: Promo Templates */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEditingTemplate({ id: "", name: "New Template", content: "" })}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>

          {editingTemplate && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-green-300 dark:border-green-900/50 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Edit Template</h3>
                <button onClick={() => setEditingTemplate(null)}><X className="w-4 h-4 text-gray-400 dark:text-gray-500" /></button>
              </div>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                placeholder="Template name"
                className="w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-green-500 bg-transparent dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
              />
              <textarea
                value={editingTemplate.content}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                rows={4}
                placeholder="Message content..."
                className="w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-transparent dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">Cancel</button>
                <button
                  onClick={() => {
                    if (editingTemplate.id) {
                      setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t)));
                    } else {
                      setTemplates((prev) => [...prev, { ...editingTemplate, id: Date.now().toString() }]);
                    }
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{tpl.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{tpl.content}</p>
                </div>
                <button
                  onClick={() => setEditingTemplate(tpl)}
                  className="ml-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Edit3 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Message History */}
      {activeTab === 3 && (
        <div className="space-y-3">
          {messageLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No messages sent yet</p>
            </div>
          ) : (
            messageLogs.map((log) => (
              <div key={log.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mt-0.5">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{log.recipient}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{log.phone}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{log.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(log.sentAt).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status]}`}>
                      {log.status}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{log.type}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </div>
    </PageContainer>
  );
}

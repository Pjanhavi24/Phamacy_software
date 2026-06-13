"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Zap, Package, AlertTriangle, TrendingUp, FileText, ShoppingCart, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: {
    type: "table" | "list" | "summary" | "po";
    headers?: string[];
    rows?: (string | number)[][];
    items?: string[];
    summary?: Record<string, string | number>;
  };
}

const QUICK_ACTIONS = [
  { label: "Low Stock?", icon: AlertTriangle, prompt: "Which medicines are low on stock?", color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900/50" },
  { label: "Expiring Medicines", icon: Package, prompt: "Show medicines expiring in next 30 days", color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900/50" },
  { label: "Top Sellers", icon: TrendingUp, prompt: "What are the top selling medicines this month?", color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-900/50" },
  { label: "GST Summary", icon: FileText, prompt: "Give me the GST summary for this month", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50" },
  { label: "Generate PO", icon: ShoppingCart, prompt: "Generate purchase order suggestions based on current stock", color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-900/50" },
];

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-800">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-white whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-800 dark:text-gray-200 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({ summary }: { summary: Record<string, string | number> }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {Object.entries(summary).map(([key, value]) => (
        <div key={key} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{key}</div>
          <div className="font-semibold text-gray-800 dark:text-gray-200">{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your Pharmacy AI Assistant. I can help you with stock queries, expiry alerts, sales analysis, GST summaries, and purchase order suggestions. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        data: data.structuredData,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pharmacy AI Assistant</h1>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Online
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Zap className="w-3 h-3" /> Powered by GPT-4
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
              msg.role === "user" ? "bg-blue-500" : "bg-gradient-to-br from-blue-500 to-purple-600"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              <div className={`rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-br-sm"
                  : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-800"
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.data?.type === "table" && msg.data.headers && msg.data.rows && (
                  <DataTable headers={msg.data.headers} rows={msg.data.rows} />
                )}
                {msg.data?.type === "summary" && msg.data.summary && (
                  <SummaryCard summary={msg.data.summary} />
                )}
                {msg.data?.type === "list" && msg.data.items && (
                  <ul className="mt-2 space-y-1">
                    {msg.data.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all hover:shadow-sm disabled:opacity-50 ${action.color}`}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask about stock, expiry, sales..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

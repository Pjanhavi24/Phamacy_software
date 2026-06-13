import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-dev-placeholder') {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// â”€â”€ Tool definitions for function calling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_low_stock",
      description: "Fetch medicines that are below their minimum stock level",
      parameters: {
        type: "object",
        properties: {
          threshold: { type: "number", description: "Custom threshold override; default uses each item's minStock" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expiring_medicines",
      description: "Fetch medicines expiring within a given number of days",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days ahead to check for expiry" },
        },
        required: ["days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_sellers",
      description: "Fetch top selling medicines for a period",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "year"] },
          limit: { type: "number" },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_gst_summary",
      description: "Fetch GST/tax summary for a given month",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "1-12" },
          year: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_purchase_order",
      description: "Suggest a purchase order based on low stock and consumption rate",
      parameters: {
        type: "object",
        properties: {
          supplierId: { type: "string", description: "Optional: filter by supplier" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_supplier_dues",
      description: "Fetch outstanding supplier dues/payables",
      parameters: {
        type: "object",
        properties: {
          overdue: { type: "boolean", description: "If true, return only overdue amounts" },
        },
        required: [],
      },
    },
  },
];

// â”€â”€ Tool execution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function executeTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_low_stock": {
      const threshold = (args.threshold as number) ?? undefined;
      const items = await prisma.inventoryItem.findMany({
        where: threshold
          ? { currentStock: { lt: threshold } }
          : { currentStock: { lt: prisma.inventoryItem.fields.minStock } },
        orderBy: { currentStock: "asc" },
        take: 20,
        select: { name: true, currentStock: true, minStock: true, unit: true, supplier: { select: { name: true } } },
      });
      return {
        type: "table",
        headers: ["Medicine", "Current Stock", "Min Stock", "Unit", "Supplier"],
        rows: items.map((i) => [i.name, i.currentStock, i.minStock, i.unit, i.supplier?.name ?? "N/A"]),
        count: items.length,
      };
    }

    case "get_expiring_medicines": {
      const days = (args.days as number) ?? 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      const batches = await prisma.inventoryBatch.findMany({
        where: { expiryDate: { lte: cutoff }, quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
        take: 30,
        include: { item: { select: { name: true } } },
      });
      return {
        type: "table",
        headers: ["Medicine", "Batch No", "Expiry Date", "Qty"],
        rows: batches.map((b) => [
          b.item.name,
          b.batchNumber,
          new Date(b.expiryDate).toLocaleDateString("en-IN"),
          b.quantity,
        ]),
        count: batches.length,
      };
    }

    case "get_top_sellers": {
      const period = (args.period as string) ?? "month";
      const limit = (args.limit as number) ?? 10;
      const from = new Date();
      if (period === "today") from.setHours(0, 0, 0, 0);
      else if (period === "week") from.setDate(from.getDate() - 7);
      else if (period === "month") from.setMonth(from.getMonth() - 1);
      else from.setFullYear(from.getFullYear() - 1);

      const result = await prisma.saleItem.groupBy({
        by: ["itemId"],
        where: { sale: { createdAt: { gte: from } } },
        _sum: { quantity: true, amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: limit,
      });
      const itemIds = result.map((r) => r.itemId);
      const items = await prisma.inventoryItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true } });
      const itemMap = Object.fromEntries(items.map((i) => [i.id, i.name]));
      return {
        type: "table",
        headers: ["Medicine", "Qty Sold", "Revenue (â‚¹)"],
        rows: result.map((r) => [
          itemMap[r.itemId] ?? r.itemId,
          r._sum.quantity ?? 0,
          `â‚¹${(r._sum.amount ?? 0).toFixed(2)}`,
        ]),
      };
    }

    case "get_gst_summary": {
      const now = new Date();
      const month = (args.month as number) ?? now.getMonth() + 1;
      const year = (args.year as number) ?? now.getFullYear();
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59);
      const sales = await prisma.sale.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _sum: { totalAmount: true, taxAmount: true, discountAmount: true },
        _count: true,
      });
      const purchases = await prisma.purchase.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _sum: { totalAmount: true, taxAmount: true },
        _count: true,
      });
      return {
        type: "summary",
        summary: {
          "Period": `${from.toLocaleString("default", { month: "long" })} ${year}`,
          "Total Sales": `â‚¹${(sales._sum.totalAmount ?? 0).toFixed(2)}`,
          "Output GST (Sales)": `â‚¹${(sales._sum.taxAmount ?? 0).toFixed(2)}`,
          "Total Purchases": `â‚¹${(purchases._sum.totalAmount ?? 0).toFixed(2)}`,
          "Input GST (Purchase)": `â‚¹${(purchases._sum.taxAmount ?? 0).toFixed(2)}`,
          "Net GST Payable": `â‚¹${((sales._sum.taxAmount ?? 0) - (purchases._sum.taxAmount ?? 0)).toFixed(2)}`,
          "Total Invoices": sales._count,
          "Total Discounts": `â‚¹${(sales._sum.discountAmount ?? 0).toFixed(2)}`,
        },
      };
    }

    case "generate_purchase_order": {
      const lowStock = await prisma.inventoryItem.findMany({
        where: { currentStock: { lt: prisma.inventoryItem.fields.minStock } },
        include: { supplier: { select: { id: true, name: true } } },
        take: 30,
      });
      const rows = lowStock.map((item) => {
        const needed = item.minStock * 2 - item.currentStock;
        return [item.name, item.currentStock, item.minStock, needed, item.supplier?.name ?? "Unassigned"];
      });
      return {
        type: "po",
        headers: ["Medicine", "Current", "Min Stock", "Suggested Qty", "Supplier"],
        rows,
        message: `Generated PO for ${rows.length} items`,
      };
    }

    case "get_supplier_dues": {
      const overdue = args.overdue as boolean;
      const today = new Date();
      const dues = await prisma.purchase.findMany({
        where: {
          paymentStatus: { not: "paid" },
          ...(overdue ? { dueDate: { lt: today } } : {}),
        },
        include: { supplier: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 20,
      });
      return {
        type: "table",
        headers: ["Supplier", "Invoice No", "Amount", "Due Date", "Status"],
        rows: dues.map((d) => [
          d.supplier?.name ?? "N/A",
          d.invoiceNumber,
          `â‚¹${d.totalAmount.toFixed(2)}`,
          d.dueDate ? new Date(d.dueDate).toLocaleDateString("en-IN") : "N/A",
          d.paymentStatus,
        ]),
      };
    }

    default:
      return { error: "Unknown tool" };
  }
}

// â”€â”€ Chat endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body as { message: string; history?: OpenAI.Chat.ChatCompletionMessageParam[] };

    const systemPrompt = `You are an intelligent Pharmacy ERP assistant. You help pharmacy staff with:
- Stock management (low stock alerts, inventory queries)
- Expiry date tracking
- Sales analytics and top-selling medicines
- GST and financial summaries
- Purchase order generation
- Supplier dues and payments

Always use the provided tools to fetch real-time data. Respond in a clear, helpful manner.
When presenting data from tools, briefly explain the findings before the table/list.
All monetary values are in Indian Rupees (â‚¹).`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: message },
    ];

    let response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      tools,
      tool_choice: "auto",
    });

    let assistantMessage = response.choices[0].message;
    let structuredData = null;

    // Handle tool calls (may chain multiple rounds)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

      for (const call of assistantMessage.tool_calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        const result = await executeTool(call.function.name, args);
        structuredData = result;
        toolResults.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      messages.push(...toolResults);

      response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        tools,
        tool_choice: "auto",
      });

      assistantMessage = response.choices[0].message;
    }

    res.json({
      message: assistantMessage.content,
      structuredData,
      usage: response.usage,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({ error: "Failed to process AI request" });
  }
});

export default router;

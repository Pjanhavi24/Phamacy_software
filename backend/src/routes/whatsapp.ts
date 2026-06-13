import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const router = Router();
const prisma = new PrismaClient();

// â”€â”€ Provider abstraction (Twilio or whatsapp-web.js) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type WaProvider = "twilio" | "wwebjs";
const PROVIDER: WaProvider = (process.env.WA_PROVIDER as WaProvider) ?? "twilio";

// ---------- Twilio helper ----------
async function sendViaTwilio(to: string, body: string, mediaUrl?: string): Promise<{ sid: string }> {
  // Dynamic import so the server starts without Twilio installed if using wwebjs
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require("twilio");
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const params: Record<string, string> = {
    from: `whatsapp:${process.env.TWILIO_WA_FROM}`,
    to: `whatsapp:${to}`,
    body,
  };
  if (mediaUrl) params.mediaUrl = mediaUrl;
  const message = await client.messages.create(params);
  return { sid: message.sid };
}

// ---------- whatsapp-web.js helper (singleton client) ----------
let wwejsClient: unknown = null;
async function getWWebJSClient() {
  if (wwejsClient) return wwejsClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Client, LocalAuth } = require("whatsapp-web.js");
  const client = new Client({ authStrategy: new LocalAuth() });
  await client.initialize();
  wwejsClient = client;
  return client;
}

async function sendMessage(to: string, body: string, mediaPath?: string): Promise<string> {
  const formattedTo = to.replace(/[^0-9]/g, "");
  if (PROVIDER === "twilio") {
    const result = await sendViaTwilio(`+${formattedTo}`, body, mediaPath);
    return result.sid;
  }
  const client = await getWWebJSClient() as {
    sendMessage: (id: string, content: unknown) => Promise<{ id: { _serialized: string } }>;
  };
  const chatId = `${formattedTo}@c.us`;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MessageMedia } = require("whatsapp-web.js");
  let media = null;
  if (mediaPath && fs.existsSync(mediaPath)) {
    media = MessageMedia.fromFilePath(mediaPath);
  }
  const msg = await client.sendMessage(chatId, media ?? body);
  return msg.id._serialized;
}

// â”€â”€ Log helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function logMessage(data: {
  recipientName: string;
  phone: string;
  message: string;
  type: string;
  status: string;
  externalId?: string;
}) {
  await prisma.whatsappLog.create({
    data: {
      recipient: data.recipientName,
      phone: data.phone,
      message: data.message,
      type: data.type,
      status: data.status,
      externalId: data.externalId,
    },
  });
}

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/whatsapp/logs
router.get("/logs", async (_req: Request, res: Response) => {
  const logs = await prisma.whatsappLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(logs.map((l) => ({ ...l, sentAt: l.createdAt })));
});

// POST /api/whatsapp/send
router.post("/send", async (req: Request, res: Response) => {
  try {
    const { phone, message, recipientName = "Customer" } = req.body as {
      phone: string;
      message: string;
      recipientName?: string;
    };
    if (!phone || !message) return res.status(400).json({ error: "phone and message required" });

    const externalId = await sendMessage(phone, message);
    await logMessage({ recipientName, phone, message, type: "custom", status: "sent", externalId });
    res.json({ success: true, externalId });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/whatsapp/send-invoice
router.post("/send-invoice", async (req: Request, res: Response) => {
  try {
    const { customerId, saleId } = req.body as { customerId: string; saleId?: string };

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, phone: true },
    });
    if (!customer?.phone) return res.status(404).json({ error: "Customer or phone not found" });

    // Find latest sale if no saleId
    const sale = saleId
      ? await prisma.sale.findUnique({ where: { id: saleId }, include: { items: { include: { item: true } } } })
      : await prisma.sale.findFirst({
          where: { customerId },
          orderBy: { createdAt: "desc" },
          include: { items: { include: { item: true } } },
        });

    if (!sale) return res.status(404).json({ error: "No sale found" });

    // Generate invoice text (PDF generation would replace this in production)
    const lines = (sale as typeof sale & { items: { item: { name: string }; quantity: number; unitPrice: number }[] }).items.map(
      (si) => `â€¢ ${si.item.name} x${si.quantity} = â‚¹${(si.quantity * si.unitPrice).toFixed(2)}`
    );
    const message = [
      `ðŸ§¾ Invoice from ${process.env.PHARMACY_NAME ?? "Pharmacy"}`,
      `Invoice No: ${(sale as { invoiceNumber?: string }).invoiceNumber ?? sale.id.slice(-8).toUpperCase()}`,
      `Date: ${new Date(sale.createdAt).toLocaleDateString("en-IN")}`,
      ``,
      ...lines,
      ``,
      `Total: â‚¹${(sale as { totalAmount: number }).totalAmount.toFixed(2)}`,
      ``,
      `Thank you, ${customer.name}! ðŸ™`,
    ].join("\n");

    // Check if PDF exists
    const pdfPath = path.join(process.cwd(), "invoices", `${sale.id}.pdf`);
    const mediaPath = fs.existsSync(pdfPath) ? pdfPath : undefined;

    const externalId = await sendMessage(customer.phone, message, mediaPath);
    await logMessage({ recipientName: customer.name, phone: customer.phone, message, type: "invoice", status: "sent", externalId });
    res.json({ success: true, externalId });
  } catch (error) {
    console.error("Send invoice error:", error);
    res.status(500).json({ error: "Failed to send invoice" });
  }
});

// POST /api/whatsapp/bulk-reminder
router.post("/bulk-reminder", async (req: Request, res: Response) => {
  try {
    const { customerIds, message: templateMsg } = req.body as {
      customerIds: string[];
      message: string;
    };
    if (!customerIds?.length) return res.status(400).json({ error: "customerIds required" });

    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true },
    });

    const results = await Promise.allSettled(
      customers
        .filter((c) => c.phone)
        .map(async (c) => {
          const msg = templateMsg
            .replace(/{{name}}/g, c.name)
            .replace(/{{pharmacy_name}}/g, process.env.PHARMACY_NAME ?? "Pharmacy");
          const externalId = await sendMessage(c.phone!, msg);
          await logMessage({ recipientName: c.name, phone: c.phone!, message: msg, type: "reminder", status: "sent", externalId });
          return c.id;
        })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    res.json({ success: true, sent, failed, total: customers.length });
  } catch (error) {
    console.error("Bulk reminder error:", error);
    res.status(500).json({ error: "Failed to send bulk reminders" });
  }
});

// POST /api/whatsapp/send-promo
router.post("/send-promo", async (req: Request, res: Response) => {
  try {
    const { customerIds, templateContent, variables = {} } = req.body as {
      customerIds: string[];
      templateContent: string;
      variables: Record<string, string>;
    };

    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true },
    });

    const results = await Promise.allSettled(
      customers
        .filter((c) => c.phone)
        .map(async (c) => {
          let msg = templateContent.replace(/{{name}}/g, c.name);
          for (const [key, val] of Object.entries(variables)) {
            msg = msg.replace(new RegExp(`{{${key}}}`, "g"), val);
          }
          const externalId = await sendMessage(c.phone!, msg);
          await logMessage({ recipientName: c.name, phone: c.phone!, message: msg, type: "promo", status: "sent", externalId });
        })
    );

    res.json({
      success: true,
      sent: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    });
  } catch (error) {
    console.error("Promo send error:", error);
    res.status(500).json({ error: "Failed to send promo" });
  }
});

export default router;

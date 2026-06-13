import { google } from "googleapis";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import pdf from "pdf-parse";

const prisma = new PrismaClient();
const getOpenAI = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'sk-dev-placeholder') return null;
  return new OpenAI({ apiKey: key });
};

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = path.join(process.cwd(), "gmail_token.json");

export interface ParsedInvoiceItem {
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

export interface ParsedInvoice {
  supplierName?: string;
  supplierGSTIN?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  taxAmount?: number;
  items: ParsedInvoiceItem[];
  rawText?: string;
  confidence: number;
  sourceEmailId: string;
  sourceEmailSubject: string;
  sourceEmailDate: string;
  attachmentName: string;
}

// â”€â”€ OAuth2 helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI ?? "http://localhost:4000/api/v1/gmail/callback"
  );
}

export function getAuthUrl(): string {
  const oAuth2Client = createOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const oAuth2Client = createOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

export function loadSavedToken(): google.auth.OAuth2 | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const oAuth2Client = createOAuth2Client();
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

// â”€â”€ Gmail fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachment: boolean;
  attachments: { name: string; mimeType: string; size: number; attachmentId: string }[];
}

export async function fetchSupplierEmails(maxResults = 20): Promise<EmailSummary[]> {
  const auth = loadSavedToken();
  if (!auth) throw new Error("Gmail not connected");

  const gmail = google.gmail({ version: "v1", auth });
  // Default to all mail so the user can browse their whole inbox. An optional
  // GMAIL_SUPPLIER_QUERY env can still narrow it (e.g. to invoices only).
  const query = process.env.GMAIL_SUPPLIER_QUERY ?? "";

  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  if (!list.data.messages?.length) return [];

  const emails = await Promise.all(
    list.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({ userId: "me", id: msg.id! });
      const headers = detail.data.payload?.headers ?? [];
      const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

      const attachments: EmailSummary["attachments"] = [];
      const walkParts = (parts: typeof detail.data.payload.parts) => {
        if (!parts) return;
        for (const part of parts) {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              name: part.filename,
              mimeType: part.mimeType ?? "application/octet-stream",
              size: part.body.size ?? 0,
              attachmentId: part.body.attachmentId,
            });
          }
          if (part.parts) walkParts(part.parts);
        }
      };
      walkParts(detail.data.payload?.parts);

      return {
        id: msg.id!,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        date: getHeader("Date"),
        snippet: detail.data.snippet ?? "",
        hasAttachment: attachments.length > 0,
        attachments,
      } satisfies EmailSummary;
    })
  );

  return emails;
}

// â”€â”€ Attachment download & text extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function downloadAttachment(emailId: string, attachmentId: string): Promise<Buffer> {
  const auth = loadSavedToken();
  if (!auth) throw new Error("Gmail not connected");
  const gmail = google.gmail({ version: "v1", auth });
  const att = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId: emailId,
    id: attachmentId,
  });
  const data = att.data.data ?? "";
  return Buffer.from(data, "base64");
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const result = await pdf(buffer);
  return result.text;
}

function extractTextFromExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`Sheet: ${sheetName}\n${csv}`);
  }
  return lines.join("\n\n");
}

async function getAttachmentText(emailId: string, attachment: EmailSummary["attachments"][0]): Promise<string> {
  const auth = loadSavedToken();
  if (!auth) throw new Error("Gmail not connected");
  const gmail = google.gmail({ version: "v1", auth });

  // Find attachmentId from message
  const detail = await gmail.users.messages.get({ userId: "me", id: emailId });
  let attachmentId = "";
  const findId = (parts: typeof detail.data.payload.parts) => {
    if (!parts) return;
    for (const p of parts) {
      if (p.filename === attachment.name && p.body?.attachmentId) {
        attachmentId = p.body.attachmentId;
        return;
      }
      if (p.parts) findId(p.parts);
    }
  };
  findId(detail.data.payload?.parts);
  if (!attachmentId) throw new Error("Attachment ID not found");

  const buffer = await downloadAttachment(emailId, attachmentId);
  const mimeType = attachment.mimeType.toLowerCase();

  if (mimeType.includes("pdf")) return extractTextFromPDF(buffer);
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || attachment.name.endsWith(".xlsx") || attachment.name.endsWith(".xls")) {
    return extractTextFromExcel(buffer);
  }
  // Plain text / CSV fallback
  return buffer.toString("utf8");
}

// â”€â”€ OpenAI parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function parseInvoiceWithAI(text: string, emailMeta: Pick<EmailSummary, "id" | "subject" | "date">): Promise<Omit<ParsedInvoice, "attachmentName" | "sourceEmailId" | "sourceEmailSubject" | "sourceEmailDate">> {
  const prompt = `You are an expert pharmacy invoice parser. Extract structured data from the following invoice text.

Invoice text:
---
${text.slice(0, 8000)}
---

Extract:
1. Supplier name and GSTIN
2. Invoice number and date
3. Total amount and tax amount
4. All medicine line items with: name, generic name (if present), manufacturer, batch number, expiry date, quantity, unit, purchase rate, MRP, GST%, discount, amount

Return a JSON object with this exact structure:
{
  "supplierName": string,
  "supplierGSTIN": string,
  "invoiceNumber": string,
  "invoiceDate": "YYYY-MM-DD",
  "totalAmount": number,
  "taxAmount": number,
  "confidence": number (0-1, your confidence in the extraction accuracy),
  "items": [
    {
      "medicineName": string,
      "genericName": string,
      "manufacturer": string,
      "batchNumber": string,
      "expiryDate": "MM/YYYY",
      "quantity": number,
      "unit": string,
      "purchaseRate": number,
      "mrp": number,
      "gstPercent": number,
      "discount": number,
      "amount": number
    }
  ]
}

Return ONLY the JSON, no explanation.`;

  const ai = getOpenAI();
  if (!ai) throw new Error('OpenAI API key not configured');
  const response = await ai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
  return { ...parsed, rawText: text.slice(0, 500) };
}

// â”€â”€ Main export: process email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ── Direct CSV / Excel parsing (no AI) ──────────────────────────────────────
// Match a column by header name using case/punctuation-insensitive synonyms.
function findColumn(headers: string[], synonyms: string[]): number {
  const norm = headers.map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ""));
  // 1) exact header match (synonyms tried in priority order)
  for (const syn of synonyms) {
    const s = syn.replace(/[^a-z0-9]/g, "");
    const exact = norm.indexOf(s);
    if (exact >= 0) return exact;
  }
  // 2) header starts with synonym
  for (const syn of synonyms) {
    const s = syn.replace(/[^a-z0-9]/g, "");
    const i = norm.findIndex((h) => h && h.startsWith(s));
    if (i >= 0) return i;
  }
  // 3) header contains synonym (last resort, only for distinctive synonyms)
  for (const syn of synonyms) {
    const s = syn.replace(/[^a-z0-9]/g, "");
    if (s.length < 5) continue;
    const i = norm.findIndex((h) => h && h.includes(s));
    if (i >= 0) return i;
  }
  return -1;
}

type ParsedCore = Omit<ParsedInvoice, "sourceEmailId" | "sourceEmailSubject" | "sourceEmailDate" | "attachmentName">;

// Parse a CSV/XLSX supplier invoice into our ParsedInvoice shape. Column names
// are matched by synonyms so most distributor exports work out of the box.
// Minimal CSV parser that preserves original cell strings (so dates like
// "05-06-2026" aren't reformatted the way XLSX's auto date coercion does).
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "");
}

function parseTableInvoice(buffer: Buffer, isCsv: boolean): ParsedCore {
  let grid: string[][];
  if (isCsv) {
    grid = parseCsvText(buffer.toString("utf8"));
  } else {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = (XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as unknown[][]).map((r) =>
      (r ?? []).map((c) => String(c ?? ""))
    );
  }

  // Header row = the row (within the first few) with the most non-empty cells.
  let headerIdx = 0, best = -1;
  for (let i = 0; i < Math.min(grid.length, 8); i++) {
    const filled = (grid[i] ?? []).filter((c) => String(c).trim() !== "").length;
    if (filled > best) { best = filled; headerIdx = i; }
  }
  const headers = (grid[headerIdx] ?? []).map((h) => String(h));
  const dataRows = grid.slice(headerIdx + 1).filter((r) => r.some((c) => String(c).trim() !== ""));

  const C = {
    vendor: findColumn(headers, ["vendor", "supplier", "suppliername", "distributor", "cnick", "mfgrnick", "party"]),
    invNo: findColumn(headers, ["invno", "invoiceno", "invoicenumber", "billno", "billnumber"]),
    invDate: findColumn(headers, ["invdate", "invoicedate", "billdate"]),
    invAmt: findColumn(headers, ["invamt", "invoiceamount", "billamount", "grandtotal"]),
    desc: findColumn(headers, ["productdesc", "itemdescription", "itemdesc", "itemname", "description", "product", "particulars", "medicine", "item"]),
    mfgr: findColumn(headers, ["manufacturer", "companyname", "mfgr", "manf", "company", "make"]),
    batch: findColumn(headers, ["batchno", "batch", "batchnumber"]),
    exp: findColumn(headers, ["expdate", "expdt", "expiry", "expirydate", "exp"]),
    qty: findColumn(headers, ["qty", "quantity", "qnty"]),
    rate: findColumn(headers, ["rate", "ptr", "purchaserate", "billrate", "prate"]),
    mrp: findColumn(headers, ["mrp"]),
    pack: findColumn(headers, ["ppack", "packing", "pack", "unit"]),
    cgst: findColumn(headers, ["cgstper", "cgst"]),
    sgst: findColumn(headers, ["sgstper", "sgst"]),
    igst: findColumn(headers, ["igstper", "igst"]),
    gst: findColumn(headers, ["gstper", "gst", "taxper", "tax"]),
    sch: findColumn(headers, ["schper", "scheme", "discount", "disc", "cdper"]),
    netAmt: findColumn(headers, ["inetamt", "netamt", "itemvalue", "grsamt", "amount", "value"]),
  };

  const get = (row: string[], i: number) => (i >= 0 ? String(row[i] ?? "").trim() : "");
  const num = (s: string) => { const n = parseFloat(s.replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };

  const items: ParsedInvoiceItem[] = dataRows
    .filter((r) => get(r, C.desc) !== "")
    .map((r) => {
      const cgst = num(get(r, C.cgst));
      const sgst = num(get(r, C.sgst));
      const igst = num(get(r, C.igst));
      const gstSingle = num(get(r, C.gst));
      const gstPercent = igst > 0 ? igst : cgst + sgst > 0 ? cgst + sgst : gstSingle;
      const quantity = num(get(r, C.qty)) || 1;
      const purchaseRate = num(get(r, C.rate));
      const amount = quantity * purchaseRate || num(get(r, C.netAmt));
      return {
        medicineName: get(r, C.desc),
        genericName: "",
        manufacturer: get(r, C.mfgr),
        batchNumber: get(r, C.batch),
        expiryDate: get(r, C.exp),
        quantity,
        unit: get(r, C.pack),
        purchaseRate,
        mrp: num(get(r, C.mrp)),
        gstPercent,
        discount: num(get(r, C.sch)),
        amount,
      };
    });

  const head = dataRows[0] ?? [];
  return {
    supplierName: get(head, C.vendor),
    supplierGSTIN: "",
    invoiceNumber: get(head, C.invNo),
    invoiceDate: get(head, C.invDate),
    totalAmount: num(get(head, C.invAmt)) || items.reduce((s, i) => s + i.amount, 0),
    taxAmount: 0,
    confidence: items.length > 0 ? 1 : 0,
    items,
  };
}

export async function processEmailInvoice(emailId: string): Promise<ParsedInvoice[]> {
  const auth = loadSavedToken();
  if (!auth) throw new Error("Gmail not connected");

  const emails = await fetchSupplierEmails(50);
  const email = emails.find((e) => e.id === emailId);
  if (!email) throw new Error("Email not found");

  const results: ParsedInvoice[] = [];

  for (const attachment of email.attachments) {
    try {
      const name = attachment.name.toLowerCase();
      const mime = attachment.mimeType.toLowerCase();
      const isTable =
        mime.includes("csv") || mime.includes("excel") || mime.includes("spreadsheet") ||
        name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx");

      let parsed: ParsedCore;
      if (isTable && attachment.attachmentId) {
        // CSV/Excel → parse the table directly (no AI needed).
        const buffer = await downloadAttachment(emailId, attachment.attachmentId);
        parsed = parseTableInvoice(buffer, mime.includes("csv") || name.endsWith(".csv"));
      } else {
        // PDF / .eml / other → fall back to AI extraction (if configured).
        const text = await getAttachmentText(emailId, attachment);
        parsed = await parseInvoiceWithAI(text, { id: email.id, subject: email.subject, date: email.date });
      }

      results.push({
        ...parsed,
        sourceEmailId: email.id,
        sourceEmailSubject: email.subject,
        sourceEmailDate: email.date,
        attachmentName: attachment.name,
      });
    } catch (err) {
      console.error(`Failed to process attachment ${attachment.name}:`, err);
    }
  }

  return results;
}

// â”€â”€ Create draft purchase from parsed invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createDraftPurchaseFromInvoice(invoice: ParsedInvoice): Promise<string> {
  // Find or create supplier
  let supplier = await prisma.supplier.findFirst({
    where: { OR: [{ name: { contains: invoice.supplierName ?? "", mode: "insensitive" } }, { gstin: invoice.supplierGSTIN }] },
  });
  if (!supplier && invoice.supplierName) {
    supplier = await prisma.supplier.create({
      data: {
        name: invoice.supplierName,
        gstin: invoice.supplierGSTIN,
      },
    });
  }

  // Create purchase draft
  const purchase = await prisma.purchase.create({
    data: {
      supplierId: supplier?.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : undefined,
      totalAmount: invoice.totalAmount ?? 0,
      taxAmount: invoice.taxAmount ?? 0,
      paymentStatus: "draft",
      notes: `Imported from Gmail: ${invoice.sourceEmailSubject} (${invoice.attachmentName})`,
      items: {
        create: await Promise.all(
          invoice.items.map(async (item) => {
            // Try to match existing inventory item
            const inventoryItem = await prisma.inventoryItem.findFirst({
              where: { name: { contains: item.medicineName, mode: "insensitive" } },
            });
            return {
              itemId: inventoryItem?.id,
              itemName: item.medicineName,
              genericName: item.genericName,
              manufacturer: item.manufacturer,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? parseExpiryDate(item.expiryDate) : undefined,
              quantity: item.quantity,
              unit: item.unit ?? "units",
              purchaseRate: item.purchaseRate,
              mrp: item.mrp,
              gstPercent: item.gstPercent,
              discount: item.discount,
              amount: item.amount,
            };
          })
        ),
      },
    },
  });

  return purchase.id;
}

function parseExpiryDate(expiryStr: string): Date {
  // Handle MM/YYYY format
  const match = expiryStr.match(/(\d{2})\/(\d{4})/);
  if (match) return new Date(parseInt(match[2]), parseInt(match[1]) - 1, 28);
  return new Date(expiryStr);
}

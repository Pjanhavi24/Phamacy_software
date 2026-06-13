import { Router, Request, Response } from "express";
import {
  getAuthUrl,
  exchangeCodeForTokens,
  loadSavedToken,
  fetchSupplierEmails,
  processEmailInvoice,
  createDraftPurchaseFromInvoice,
  downloadAttachment,
} from "../services/gmail-import";

const router = Router();

// In-memory cache for parsed invoices (use Redis in production)
const parsedCache = new Map<string, Awaited<ReturnType<typeof processEmailInvoice>>>();

// GET /api/gmail/status
router.get("/status", (_req: Request, res: Response) => {
  const auth = loadSavedToken();
  res.json({ connected: auth !== null });
});

// GET /api/gmail/auth-url
router.get("/auth-url", (_req: Request, res: Response) => {
  const url = getAuthUrl();
  res.json({ url });
});

// GET /api/gmail/callback  (OAuth2 redirect)
router.get("/callback", async (req: Request, res: Response) => {
  const { code } = req.query as { code: string };
  if (!code) return res.status(400).json({ error: "Missing code" });
  try {
    await exchangeCodeForTokens(code);
    res.send(`<html><body><script>window.close();</script><p>Gmail connected! You can close this window.</p></body></html>`);
  } catch (error) {
    res.status(500).send(`<p>Error: ${error}</p>`);
  }
});

// GET /api/gmail/emails
router.get("/emails", async (_req: Request, res: Response) => {
  try {
    const emails = await fetchSupplierEmails(50);
    res.json(emails);
  } catch (error) {
    console.error("Fetch emails error:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// GET /api/v1/gmail/attachment/:emailId/:attachmentId → download the file
router.get("/attachment/:emailId/:attachmentId", async (req: Request, res: Response) => {
  try {
    const { emailId, attachmentId } = req.params;
    const buffer = await downloadAttachment(emailId, attachmentId);
    const name = String(req.query.name ?? "attachment").replace(/["\r\n]/g, "");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (error) {
    console.error("Download attachment error:", error);
    res.status(500).json({ error: "Failed to download attachment" });
  }
});

// POST /api/gmail/parse/:emailId
router.post("/parse/:emailId", async (req: Request, res: Response) => {
  const { emailId } = req.params;
  try {
    const cached = parsedCache.get(emailId);
    if (cached && cached.length > 0) {
      return res.json(cached);
    }
    const invoices = await processEmailInvoice(emailId);
    // Only cache successful parses so a failed one can be retried.
    if (invoices.length > 0) parsedCache.set(emailId, invoices);
    res.json(invoices);
  } catch (error) {
    console.error("Parse invoice error:", error);
    res.status(500).json({ error: "Failed to parse invoice" });
  }
});

// POST /api/gmail/create-purchase
router.post("/create-purchase", async (req: Request, res: Response) => {
  const { emailId, invoiceIndex = 0 } = req.body as { emailId: string; invoiceIndex?: number };
  try {
    const invoices = parsedCache.get(emailId);
    if (!invoices) return res.status(404).json({ error: "Parse the email first" });
    const invoice = invoices[invoiceIndex];
    if (!invoice) return res.status(404).json({ error: "Invoice index out of range" });
    const purchaseId = await createDraftPurchaseFromInvoice(invoice);
    res.json({ success: true, purchaseId });
  } catch (error) {
    console.error("Create purchase error:", error);
    res.status(500).json({ error: "Failed to create purchase" });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Generate purchase number like PO-2024-001234
// Resolve the acting user's store (fallback to the first store).
async function resolveStoreId(req: Request): Promise<string | null> {
  const userId = (req as any).user?.userId as string | undefined;
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { storeId: true } });
    if (u?.storeId) return u.storeId;
  }
  const s = await prisma.store.findFirst({ select: { id: true } });
  return s?.id ?? null;
}

// GET /purchases
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, supplierId, startDate, endDate, status } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId as string;
    if (status) where.paymentStatus = String(status).toUpperCase();
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          items: {
            include: {
              medicine: { select: { id: true, name: true } },
            },
          },
        },
        skip,
        take: +limit,
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.purchase.count({ where }),
    ]);

    res.json({ purchases, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /purchases/items — flattened purchase line items (medicine-wise history):
// which medicine, on what date, from which distributor, at what scheme.
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { q, medicineId, supplierId, startDate, endDate, limit = 300 } = req.query as Record<string, string>;

    const purchaseWhere: any = {};
    if (supplierId) purchaseWhere.supplierId = supplierId;
    if (startDate || endDate) {
      purchaseWhere.invoiceDate = {};
      if (startDate) purchaseWhere.invoiceDate.gte = new Date(startDate);
      if (endDate) purchaseWhere.invoiceDate.lte = new Date(endDate);
    }

    const where: any = { purchase: purchaseWhere };
    if (medicineId) where.medicineId = medicineId;
    if (q) where.medicine = { name: { contains: q, mode: 'insensitive' } };

    const items = await prisma.purchaseItem.findMany({
      where,
      include: {
        medicine: { select: { id: true, name: true, genericName: true } },
        purchase: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { purchase: { invoiceDate: 'desc' } },
      take: Number(limit),
    });

    res.json({ items, count: items.length });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /purchases/next-inward — the inward number the next purchase will get.
// (Must precede the /:id route so it isn't captured as an id.)
router.get('/next-inward', async (_req: Request, res: Response) => {
  try {
    const max = await prisma.purchase.aggregate({ _max: { inwardNumber: true } });
    return res.json({ nextInward: (max._max.inwardNumber ?? 0) + 1 });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /purchases/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /purchases — record a purchase, its line items, stock batches and the
// supplier balance. Accepts the frontend payload (qty/purchaseRate/batchNo/…).
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const supplierId = body.supplierId;
    const items: any[] = Array.isArray(body.items) ? body.items : [];
    const invoiceNumber = body.invoiceNumber ?? body.invoiceNo;
    const invoiceDate = body.invoiceDate;
    const otherCharges = Number(body.otherCharges ?? 0);
    const paidAmount = Number(body.paidAmount ?? 0);

    if (!supplierId) return res.status(400).json({ message: 'supplierId is required' });
    if (!invoiceNumber) return res.status(400).json({ message: 'invoiceNumber is required' });
    if (items.length === 0) return res.status(400).json({ message: 'Add at least one item' });

    // Normalise each item to the fields we need (frontend uses qty/purchaseRate/batchNo).
    const norm = items.map((it) => ({
      medicineId: it.medicineId,
      quantity: Number(it.quantity ?? it.qty ?? 0),
      freeQty: Number(it.freeQty ?? 0),
      purchaseRate: Number(it.purchaseRate ?? it.costPrice ?? 0),
      saleRate: Number(it.saleRate ?? 0),
      mrp: Number(it.mrp ?? 0),
      gstRate: Number(it.gstRate ?? it.taxRate ?? 0),
      batchNumber: String(it.batchNo ?? it.batchNumber ?? '').trim(),
      expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
    }));

    for (const it of norm) {
      if (!it.medicineId) return res.status(400).json({ message: 'Each item must have a medicineId' });
      if (!it.quantity || it.quantity < 1) return res.status(400).json({ message: 'Each item needs quantity >= 1' });
      if (!it.batchNumber) return res.status(400).json({ message: 'Each item needs a batch number' });
      if (!it.expiryDate) return res.status(400).json({ message: 'Each item needs an expiry date' });
    }

    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ message: 'No store configured' });

    // Totals.
    const taxable = norm.reduce((s, it) => s + it.quantity * it.purchaseRate, 0);
    const gstAmount = norm.reduce((s, it) => s + (it.quantity * it.purchaseRate * it.gstRate) / 100, 0);
    const netAmount = taxable + gstAmount + otherCharges;
    const paymentStatus = paidAmount >= netAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

    const purchase = await prisma.$transaction(async (tx) => {
      // Strictly incremental inward number.
      const maxInward = await tx.purchase.aggregate({ _max: { inwardNumber: true } });
      const inwardNumber = (maxInward._max.inwardNumber ?? 0) + 1;

      const created = await tx.purchase.create({
        data: {
          inwardNumber,
          supplierId,
          storeId,
          invoiceNumber: String(invoiceNumber),
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          status: 'RECEIVED',
          totalAmount: taxable,
          gstAmount,
          otherCharges,
          netAmount,
          paidAmount,
          paymentStatus,
          createdBy: (req as any).user?.userId ?? null,
        },
      });

      for (const it of norm) {
        const lineAmount = it.quantity * it.purchaseRate * (1 + it.gstRate / 100);

        // Upsert the stock batch (medicineId + batchNumber + storeId is unique).
        const existing = await tx.medicineBatch.findUnique({
          where: { medicineId_batchNumber_storeId: { medicineId: it.medicineId, batchNumber: it.batchNumber, storeId } },
        });
        let batchId: string;
        if (existing) {
          const upd = await tx.medicineBatch.update({
            where: { id: existing.id },
            data: {
              availableQty: { increment: it.quantity + it.freeQty },
              quantity: { increment: it.quantity + it.freeQty },
              purchaseRate: it.purchaseRate || existing.purchaseRate,
              mrp: it.mrp || existing.mrp,
              saleRate: it.saleRate || existing.saleRate,
              expiryDate: it.expiryDate ?? existing.expiryDate,
              supplierId,
              purchaseId: created.id,
            },
          });
          batchId = upd.id;
        } else {
          const nb = await tx.medicineBatch.create({
            data: {
              medicineId: it.medicineId,
              batchNumber: it.batchNumber,
              expiryDate: it.expiryDate!,
              purchaseRate: it.purchaseRate,
              mrp: it.mrp,
              saleRate: it.saleRate || it.mrp,
              quantity: it.quantity + it.freeQty,
              availableQty: it.quantity + it.freeQty,
              storeId,
              supplierId,
              purchaseId: created.id,
            },
          });
          batchId = nb.id;
        }

        await tx.purchaseItem.create({
          data: {
            purchaseId: created.id,
            medicineId: it.medicineId,
            batchId,
            quantity: it.quantity,
            freeQty: it.freeQty,
            purchaseRate: it.purchaseRate,
            mrp: it.mrp,
            gstRate: it.gstRate,
            amount: lineAmount,
            expiryDate: it.expiryDate,
            batchNumber: it.batchNumber,
          },
        });
      }

      // Increase what we owe the supplier (net minus what was paid now).
      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { increment: netAmount - paidAmount } },
      });

      return created;
    }, { timeout: 20000, maxWait: 8000 });

    return res.status(201).json(purchase);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'A purchase with this invoice number already exists for this supplier.' });
    }
    if (err.code === 'P2025') return res.status(404).json({ message: 'Supplier not found' });
    console.error('[purchase create]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /purchases/:id/payment — mark a purchase paid/partial and (optionally)
// record the payment (method + date) as a Payment row.
const PAY_STATUS: Record<string, any> = { pending: 'PENDING', partial: 'PARTIAL', paid: 'PAID' };
const PAY_METHOD: Record<string, any> = { cash: 'CASH', cheque: 'CHEQUE', upi: 'UPI', neft: 'NET_BANKING', card: 'CARD' };

router.put('/:id/payment', async (req: Request, res: Response) => {
  try {
    const { paymentStatus, paidAmount, paymentMethod, paymentDate } = req.body;
    const statusKey = String(paymentStatus || '').toLowerCase();
    if (!PAY_STATUS[statusKey]) {
      return res.status(400).json({ message: 'paymentStatus must be one of: pending, partial, paid' });
    }

    const existing = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Purchase not found' });

    const oldPaid = Number(existing.paidAmount);
    const newPaid = statusKey === 'paid'
      ? Number(existing.netAmount)
      : statusKey === 'pending'
      ? 0
      : (paidAmount !== undefined ? Number(paidAmount) : oldPaid);
    const deltaPaid = newPaid - oldPaid; // amount settled now

    // Core, must-succeed update: bill status/paid + supplier outstanding.
    const purchase = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({
        where: { id: req.params.id },
        data: { paymentStatus: PAY_STATUS[statusKey], paidAmount: newPaid },
      });
      if (deltaPaid !== 0) {
        await tx.supplier.update({
          where: { id: existing.supplierId },
          data: { balance: { decrement: deltaPaid } },
        });
      }
      return updated;
    });

    // Best-effort payment-history row (its shared referenceId relation can be
    // finicky; never let it roll back the settled payment above).
    if (paymentMethod && statusKey !== 'pending' && deltaPaid > 0) {
      try {
        const method = PAY_METHOD[String(paymentMethod).toLowerCase()] ?? 'CASH';
        await prisma.payment.create({
          data: {
            type: 'PURCHASE_PAYMENT',
            referenceId: purchase.id,
            referenceType: 'PURCHASE',
            amount: deltaPaid,
            method,
            supplierId: existing.supplierId,
            ...(paymentDate ? { createdAt: new Date(paymentDate) } : {}),
          },
        });
      } catch (e) {
        console.warn('[purchase payment] payment-row skipped:', (e as any)?.message);
      }
    }

    return res.json(purchase);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    console.error('[purchase payment]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /inventory/batches
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const { medicineId, search, page = 1, limit = 20 } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (medicineId) where.medicineId = medicineId as string;
    if (search) {
      where.medicine = {
        name: { contains: search as string, mode: 'insensitive' },
      };
    }

    const [batches, total] = await Promise.all([
      prisma.medicineBatch.findMany({
        where,
        include: {
          medicine: { select: { id: true, name: true, genericName: true, productCode: true } },
        },
        skip,
        take: +limit,
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.medicineBatch.count({ where }),
    ]);

    res.json({ batches, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /inventory/expiring?days=30
router.get('/expiring', async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) ?? '30', 10);
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const batches = await prisma.medicineBatch.findMany({
      where: {
        expiryDate: { lte: cutoff },
        availableQty: { gt: 0 },
      },
      include: {
        medicine: { select: { id: true, name: true, genericName: true, hsnCode: true } },
        supplier: { select: { id: true, name: true, gstin: true, phone: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    res.json({ batches, count: batches.length, withinDays: days });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /inventory/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalMedicines, totalBatches, lowStockCount, expiringCount] = await Promise.all([
      prisma.medicine.count(),
      prisma.medicineBatch.count({ where: { availableQty: { gt: 0 } } }),
      prisma.medicine.count({
        where: {
          batches: {
            none: { availableQty: { gt: 0 } },
          },
        },
      }),
      prisma.medicineBatch.count({
        where: {
          expiryDate: { lte: thirtyDaysLater },
          availableQty: { gt: 0 },
        },
      }),
    ]);

    res.json({
      totalMedicines,
      totalBatches,
      lowStockCount,
      expiringCount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /inventory/adjust
router.post('/adjust', async (req: Request, res: Response) => {
  try {
    const { batchId, quantity, reason, notes } = req.body;

    if (!batchId) return res.status(400).json({ message: 'batchId is required' });
    if (quantity === undefined || quantity === null) return res.status(400).json({ message: 'quantity is required' });
    if (!reason) return res.status(400).json({ message: 'reason is required' });

    const batch = await prisma.medicineBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const newQty = batch.availableQty + Number(quantity);
    if (newQty < 0) return res.status(400).json({ message: 'Adjustment would result in negative stock' });

    const [updatedBatch, adjustment] = await prisma.$transaction([
      prisma.medicineBatch.update({
        where: { id: batchId },
        data: { availableQty: newQty },
        include: {
          medicine: { select: { id: true, name: true } },
        },
      }),
      prisma.stockAdjustment.create({
        data: {
          medicineId: batch.medicineId,
          batchId,
          adjustmentType: Number(quantity) > 0 ? 'adjustment_in' : 'adjustment_out',
          quantity: Math.abs(Number(quantity)),
          reason,
          notes,
          performedById: (req as any).user?.userId ?? null,
          createdAt: new Date(),
        },
      }),
    ]);

    res.json({ batch: updatedBatch, adjustment });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /inventory/movements
router.get('/movements', async (req: Request, res: Response) => {
  try {
    const { medicineId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (medicineId) where.medicineId = medicineId as string;
    if (type) where.adjustmentType = type as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [movements, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          medicine: { select: { id: true, name: true } },
        },
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    res.json({ movements, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /inventory/lookup?code=  — find an item by product code / barcode / sku / id
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) return res.status(400).json({ message: 'code is required' });

    const or: any[] = [{ barcode: code }, { sku: code }, { stockId: code }, { id: code }];
    if (/^\d+$/.test(code)) or.push({ productCode: Number(code) });

    const medicine = await prisma.medicine.findFirst({
      where: { OR: or },
      select: {
        id: true, name: true, productCode: true, genericName: true,
        mrp: true, saleRate: true, purchaseRate: true,
      },
    });
    if (!medicine) return res.status(404).json({ message: 'Item not found' });

    const batches = await prisma.medicineBatch.findMany({
      where: { medicineId: medicine.id },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true, batchNumber: true, expiryDate: true, availableQty: true,
        mrp: true, saleRate: true, purchaseRate: true,
      },
    });
    return res.json({ medicine, batches });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

function mapAdjType(reason: string): any {
  const r = (reason || '').toLowerCase();
  if (r.includes('damage')) return 'DAMAGE';
  if (r.includes('expir')) return 'EXPIRY';
  return 'CORRECTION';
}

async function resolveStoreId(req: Request): Promise<string | null> {
  const userId = (req as any).user?.userId as string | undefined;
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { storeId: true } });
    if (u?.storeId) return u.storeId;
  }
  const s = await prisma.store.findFirst({ select: { id: true } });
  return s?.id ?? null;
}

// POST /inventory/stock-in — add stock to a batch (create the batch if new)
router.post('/stock-in', async (req: Request, res: Response) => {
  try {
    const { medicineId, batchNumber, expiryDate, quantity, billRate, saleRate, mrp, reason } = req.body;
    const qty = Number(quantity);
    if (!medicineId || !batchNumber || !qty || qty <= 0) {
      return res.status(400).json({ message: 'medicineId, batchNumber and a positive quantity are required' });
    }

    const storeId = await resolveStoreId(req);
    if (!storeId) return res.status(400).json({ message: 'No store configured' });

    const med = await prisma.medicine.findUnique({
      where: { id: medicineId },
      select: { mrp: true, saleRate: true, purchaseRate: true },
    });
    if (!med) return res.status(404).json({ message: 'Item not found' });

    const existing = await prisma.medicineBatch.findUnique({
      where: { medicineId_batchNumber_storeId: { medicineId, batchNumber: String(batchNumber), storeId } },
    });

    const before = existing ? existing.availableQty : 0;
    let batch;
    if (existing) {
      batch = await prisma.medicineBatch.update({
        where: { id: existing.id },
        data: {
          availableQty: existing.availableQty + qty,
          quantity: existing.quantity + qty,
          purchaseRate: billRate != null && billRate !== '' ? Number(billRate) : existing.purchaseRate,
          saleRate: saleRate != null && saleRate !== '' ? Number(saleRate) : existing.saleRate,
          mrp: mrp != null && mrp !== '' ? Number(mrp) : existing.mrp,
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
        },
      });
    } else {
      batch = await prisma.medicineBatch.create({
        data: {
          medicineId, batchNumber: String(batchNumber), storeId,
          expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          purchaseRate: Number(billRate ?? med.purchaseRate ?? 0),
          mrp: Number(mrp ?? med.mrp ?? 0),
          saleRate: Number(saleRate ?? med.saleRate ?? 0),
          quantity: qty,
          availableQty: qty,
        },
      });
    }

    await prisma.stockAdjustment.create({
      data: {
        medicineId, batchId: batch.id, storeId,
        adjustmentType: mapAdjType(reason),
        quantity: qty, quantityBefore: before, quantityAfter: batch.availableQty,
        reason: reason || 'Stock in',
        createdBy: (req as any).user?.userId ?? null,
      },
    });

    return res.json({ batch });
  } catch (err) {
    console.error('[stock-in]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /inventory/stock-out — remove stock from a batch (never go negative)
router.post('/stock-out', async (req: Request, res: Response) => {
  try {
    const { batchId, quantity, reason } = req.body;
    const qty = Number(quantity);
    if (!batchId || !qty || qty <= 0) {
      return res.status(400).json({ message: 'batchId and a positive quantity are required' });
    }

    const batch = await prisma.medicineBatch.findUnique({ where: { id: batchId } });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    if (qty > batch.availableQty) {
      return res.status(400).json({
        message: `Stock would go negative — only ${batch.availableQty} available in this batch.`,
        available: batch.availableQty,
      });
    }

    const updated = await prisma.medicineBatch.update({
      where: { id: batchId },
      data: { availableQty: batch.availableQty - qty },
    });
    await prisma.stockAdjustment.create({
      data: {
        medicineId: batch.medicineId, batchId, storeId: batch.storeId,
        adjustmentType: mapAdjType(reason),
        quantity: -qty, quantityBefore: batch.availableQty, quantityAfter: batch.availableQty - qty,
        reason: reason || 'Stock out',
        createdBy: (req as any).user?.userId ?? null,
      },
    });

    return res.json({ batch: updated });
  } catch (err) {
    console.error('[stock-out]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

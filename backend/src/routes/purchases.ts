import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Generate purchase number like PO-2024-001234
async function generatePurchaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const lastPurchase = await prisma.purchase.findFirst({
    where: { purchaseNumber: { startsWith: prefix } },
    orderBy: { purchaseNumber: 'desc' },
    select: { purchaseNumber: true },
  });

  let nextSeq = 1;
  if (lastPurchase?.purchaseNumber) {
    const parts = lastPurchase.purchaseNumber.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) nextSeq = seq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
}

// GET /purchases
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, supplierId, startDate, endDate, status } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId as string;
    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = new Date(startDate as string);
      if (endDate) where.purchaseDate.lte = new Date(endDate as string);
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
        orderBy: { purchaseDate: 'desc' },
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

// POST /purchases
router.post('/', async (req: Request, res: Response) => {
  try {
    const { supplierId, items, invoiceNumber, invoiceDate, dueDate, notes } = req.body;

    if (!supplierId) return res.status(400).json({ message: 'supplierId is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }
    for (const item of items) {
      if (!item.medicineId) return res.status(400).json({ message: 'Each item must have a medicineId' });
      if (!item.quantity || item.quantity < 1) return res.status(400).json({ message: 'Each item must have quantity >= 1' });
      if (item.costPrice === undefined || item.costPrice < 0) return res.status(400).json({ message: 'Each item must have a valid costPrice' });
      if (!item.batchNumber) return res.status(400).json({ message: 'Each item must have a batchNumber' });
      if (!item.expiryDate) return res.status(400).json({ message: 'Each item must have an expiryDate' });
    }

    const purchaseNumber = await generatePurchaseNumber();

    const purchase = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalTax = 0;

      const processedItems = items.map((item: any) => {
        const itemTotal = item.quantity * item.costPrice;
        const taxAmount = (itemTotal * (item.taxRate ?? 0)) / 100;
        subtotal += itemTotal;
        totalTax += taxAmount;
        return { ...item, total: itemTotal + taxAmount };
      });

      // Create purchase record
      const newPurchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId,
          subtotal,
          taxAmount: totalTax,
          totalAmount: subtotal + totalTax,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes,
          purchaseDate: new Date(),
          items: {
            create: processedItems.map((item: any) => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              costPrice: item.costPrice,
              taxRate: item.taxRate ?? 0,
              batchNumber: item.batchNumber,
              expiryDate: new Date(item.expiryDate),
              mrp: item.mrp ?? null,
              total: item.total,
            })),
          },
        },
        include: { items: true },
      });

      // Update or create medicine batches
      for (const item of processedItems) {
        const existingBatch = await tx.medicineBatch.findFirst({
          where: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
          },
        });

        if (existingBatch) {
          await tx.medicineBatch.update({
            where: { id: existingBatch.id },
            data: { availableQty: { increment: item.quantity } },
          });
        } else {
          await tx.medicineBatch.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              expiryDate: new Date(item.expiryDate),
              costPrice: item.costPrice,
              mrp: item.mrp ?? null,
              availableQty: item.quantity,
            },
          });
        }
      }

      // Update supplier balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { increment: subtotal + totalTax } },
      });

      return newPurchase;
    });

    res.status(201).json(purchase);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /purchases/:id/payment
router.put('/:id/payment', async (req: Request, res: Response) => {
  try {
    const { paymentStatus, paidAmount } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({ message: 'paymentStatus is required' });
    }

    const allowedStatuses = ['pending', 'partial', 'paid'];
    if (!allowedStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: `paymentStatus must be one of: ${allowedStatuses.join(', ')}` });
    }

    const purchase = await prisma.purchase.update({
      where: { id: req.params.id },
      data: {
        paymentStatus,
        ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
      },
    });

    res.json(purchase);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

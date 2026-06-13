import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Generate invoice number like INV-2024-001234
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastSale = await prisma.sale.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextSeq = 1;
  if (lastSale?.invoiceNumber) {
    const parts = lastSale.invoiceNumber.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) nextSeq = seq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
}

// GET /sales/today-summary
router.get('/today-summary', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [totalSales, revenueResult] = await Promise.all([
      prisma.sale.count({
        where: {
          saleDate: { gte: startOfDay, lte: endOfDay },
          status: { not: 'cancelled' },
        },
      }),
      prisma.sale.aggregate({
        where: {
          saleDate: { gte: startOfDay, lte: endOfDay },
          status: { not: 'cancelled' },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      totalSales,
      totalRevenue: revenueResult._sum.totalAmount ?? 0,
      date: startOfDay.toISOString().split('T')[0],
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /sales/sold-today — medicines sold today (the "Shortbook"), aggregated by
// medicine with total qty sold and the current remaining stock, so the biller
// can quickly see what's moving / running low.
router.get('/sold-today', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const items = await prisma.saleItem.findMany({
      where: {
        sale: { saleDate: { gte: startOfDay, lte: endOfDay }, status: { not: 'CANCELLED' } },
      },
      select: {
        quantity: true,
        medicineId: true,
        medicine: {
          select: {
            id: true,
            name: true,
            productCode: true,
            batches: { select: { availableQty: true } },
          },
        },
      },
    });

    const map = new Map<string, { medicineId: string; name: string; code: string; qtySold: number; stock: number }>();
    for (const it of items) {
      const m = it.medicine;
      if (!m) continue;
      const existing = map.get(m.id);
      if (existing) {
        existing.qtySold += it.quantity;
      } else {
        map.set(m.id, {
          medicineId: m.id,
          name: m.name,
          code: m.productCode != null ? String(m.productCode) : '',
          qtySold: it.quantity,
          stock: m.batches.reduce((s, b) => s + (b.availableQty ?? 0), 0),
        });
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => b.qtySold - a.qtySold);
    res.json({ items: rows, date: startOfDay.toISOString().split('T')[0] });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /sales
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, customerId, startDate, endDate, paymentMode, status } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (customerId) where.customerId = customerId as string;
    if (paymentMode) where.paymentMode = paymentMode as string;
    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate as string);
      if (endDate) where.saleDate.lte = new Date(endDate as string);
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            include: {
              medicine: { select: { id: true, name: true } },
            },
          },
        },
        skip,
        take: +limit,
        orderBy: { saleDate: 'desc' },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({ sales, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /sales/walkin-names?q= → distinct past walk-in patient names (sales with
// no registered customer), so the biller can reuse a previously-typed name.
router.get('/walkin-names', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);
    const rows = await prisma.sale.findMany({
      where: { customerId: null, customerName: { contains: q, mode: 'insensitive' } },
      distinct: ['customerName'],
      select: { customerName: true },
      orderBy: { saleDate: 'desc' },
      take: 8,
    });
    const generic = new Set(['walk-in', 'walk-in customer', 'walkin']);
    const names = rows
      .map((r) => r.customerName)
      .filter((n): n is string => !!n && !generic.has(n.toLowerCase()));
    return res.json(names);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /sales/doctor-names?q= → distinct doctor names used on past bills
// (lets the biller reuse a previously-typed, unregistered doctor name).
router.get('/doctor-names', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);
    const rows = await prisma.sale.findMany({
      where: { doctorName: { contains: q, mode: 'insensitive' } },
      distinct: ['doctorName'],
      select: { doctorName: true },
      orderBy: { saleDate: 'desc' },
      take: 8,
    });
    const names = rows
      .map((r) => r.doctorName)
      .filter((n): n is string => !!n && n.trim() !== '');
    return res.json(names);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /sales/next-invoice-number → peek the next sequential invoice number
// (must be declared before "/:id" so it isn't captured as an id).
router.get('/next-invoice-number', async (_req: Request, res: Response) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    return res.json({ invoiceNumber });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /sales/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /sales
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerName,
      doctorName,
      items,
      paymentMode,
      discountAmount = 0,
      notes,
      paidAmount,
      changeAmount,
      roundOff,
      gstAmount,
    } = req.body;

    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }
    if (!paymentMode) {
      return res.status(400).json({ message: 'paymentMode is required' });
    }
    for (const item of items) {
      if (!item.medicineId) return res.status(400).json({ message: 'Each item must have a medicineId' });
      if (!item.quantity || item.quantity < 1) return res.status(400).json({ message: 'Each item must have a quantity >= 1' });
      if (item.salePrice === undefined || item.salePrice < 0) return res.status(400).json({ message: 'Each item must have a valid salePrice' });
    }

    // Map the UI payment value to the PaymentMethod enum.
    const PAYMENT_MAP: Record<string, string> = {
      cash: 'CASH', upi: 'UPI', card: 'CARD', credit: 'CREDIT',
      net_banking: 'NET_BANKING', cheque: 'CHEQUE', wallet: 'WALLET',
    };
    const paymentMethod = PAYMENT_MAP[String(paymentMode).toLowerCase()] || 'CASH';

    // Create the sale with a unique invoice number. Two tabs (or terminals)
    // saving at the same instant can compute the same number, so retry on a
    // unique-constraint collision (P2002) with a freshly generated number.
    let sale: any = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const invoiceNumber = await generateInvoiceNumber();
      try {
        sale = await prisma.$transaction(async (tx) => {
      // Resolve the store (from the user; fall back to the first store).
      const dbUser = await tx.user.findUnique({ where: { id: userId }, select: { storeId: true } });
      let storeId = dbUser?.storeId ?? null;
      if (!storeId) {
        const firstStore = await tx.store.findFirst({ select: { id: true } });
        storeId = firstStore?.id ?? null;
      }
      if (!storeId) throw new Error('No store configured for this sale');

      // Only attach a customer that actually exists (ignore "walk-in").
      let validCustomerId: string | null = null;
      if (customerId) {
        const c = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
        validCustomerId = c?.id ?? null;
      }

      let subtotal = 0;
      const processedItems: any[] = [];
      for (const item of items) {
        // Find available batches using FEFO (First Expiry First Out)
        const batches = await tx.medicineBatch.findMany({
          where: {
            medicineId: item.medicineId,
            availableQty: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
        });

        // Non-blocking stock: a bill must always be saveable even when tracked
        // batch stock is short (e.g. items not purchased yet). Any available
        // batch stock is still deducted (FEFO) further below.

        const lineAmount = item.quantity * Number(item.salePrice);
        subtotal += lineAmount;

        processedItems.push({
          medicineId: item.medicineId,
          quantity: item.quantity,
          mrp: Number(item.mrp ?? item.salePrice),
          saleRate: Number(item.salePrice),
          gstRate: Number(item.taxRate ?? item.gstPct ?? 12),
          discountPct: Number(item.discountPct ?? 0),
          amount: lineAmount,
          batchId: batches[0]?.id ?? null,
          batches, // carry along for stock deduction
        });
      }

      const totalAmount = subtotal - Number(discountAmount);
      const netAmount = totalAmount + Number(roundOff ?? 0);

      // Create sale (field names must match the Prisma Sale / SaleItem models)
      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: validCustomerId,
          customerName: customerName ? String(customerName).trim() : null,
          doctorName: doctorName ? String(doctorName).trim() : null,
          storeId,
          userId,
          paymentMethod: paymentMethod as any,
          discountAmount: Number(discountAmount),
          gstAmount: Number(gstAmount ?? 0),
          totalAmount,
          netAmount,
          paidAmount: Number(paidAmount ?? netAmount),
          changeAmount: Number(changeAmount ?? 0),
          roundOff: Number(roundOff ?? 0),
          loyaltyPointsEarned: Math.floor(netAmount / 100),
          notes: notes ?? null,
          saleDate: new Date(),
          items: {
            create: processedItems.map((item) => ({
              medicineId: item.medicineId,
              batchId: item.batchId,
              quantity: item.quantity,
              mrp: item.mrp,
              saleRate: item.saleRate,
              gstRate: item.gstRate,
              discountPct: item.discountPct,
              amount: item.amount,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Decrement stock using FEFO
      for (const item of processedItems) {
        let remaining = item.quantity;
        for (const batch of item.batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.availableQty);
          await tx.medicineBatch.update({
            where: { id: batch.id },
            data: { availableQty: { decrement: deduct } },
          });
          remaining -= deduct;
        }
      }

      // Update customer loyalty points (only for a real customer)
      if (validCustomerId) {
        await tx.customer.update({
          where: { id: validCustomerId },
          data: { loyaltyPoints: { increment: Math.floor(netAmount / 100) } },
        });
      }

      return newSale;
        }, { timeout: 20000, maxWait: 8000 });
        break; // success — invoice number was unique
      } catch (e: any) {
        // Invoice-number collision from a concurrent save → retry with a new one.
        if (e?.code === 'P2002' && attempt < 5) continue;
        throw e;
      }
    }

    res.status(201).json(sale);
  } catch (err: any) {
    if (err.message && err.message.startsWith('Insufficient stock')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('[sales/create]', err);
    res.status(500).json({ message: err?.message || 'Internal server error' });
  }
});

// PUT /sales/:id — edit an existing bill. Restores the old items' stock, then
// re-creates the items and recomputes totals (non-blocking on stock).
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      customerId, customerName, doctorName, items, paymentMode,
      discountAmount = 0, notes, paidAmount, changeAmount, roundOff, gstAmount,
    } = req.body;

    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }
    if (!paymentMode) return res.status(400).json({ message: 'paymentMode is required' });
    for (const item of items) {
      if (!item.medicineId) return res.status(400).json({ message: 'Each item must have a medicineId' });
      if (!item.quantity || item.quantity < 1) return res.status(400).json({ message: 'Each item must have a quantity >= 1' });
      if (item.salePrice === undefined || item.salePrice < 0) return res.status(400).json({ message: 'Each item must have a valid salePrice' });
    }

    const PAYMENT_MAP: Record<string, string> = {
      cash: 'CASH', upi: 'UPI', card: 'CARD', credit: 'CREDIT',
      net_banking: 'NET_BANKING', cheque: 'CHEQUE', wallet: 'WALLET',
    };
    const paymentMethod = PAYMENT_MAP[String(paymentMode).toLowerCase()] || 'CASH';

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new Error('NOT_FOUND');

      // Put the old items' stock back.
      for (const old of existing.items) {
        if (old.batchId) {
          await tx.medicineBatch.update({
            where: { id: old.batchId },
            data: { availableQty: { increment: old.quantity } },
          }).catch(() => {});
        }
      }
      await tx.saleItem.deleteMany({ where: { saleId: id } });

      let validCustomerId: string | null = null;
      if (customerId) {
        const c = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
        validCustomerId = c?.id ?? null;
      }

      let subtotal = 0;
      const processedItems: any[] = [];
      for (const item of items) {
        const batches = await tx.medicineBatch.findMany({
          where: { medicineId: item.medicineId, availableQty: { gt: 0 }, expiryDate: { gt: new Date() } },
          orderBy: { expiryDate: 'asc' },
        });
        const lineAmount = item.quantity * Number(item.salePrice);
        subtotal += lineAmount;
        processedItems.push({
          medicineId: item.medicineId,
          quantity: item.quantity,
          mrp: Number(item.mrp ?? item.salePrice),
          saleRate: Number(item.salePrice),
          gstRate: Number(item.taxRate ?? item.gstPct ?? 12),
          discountPct: Number(item.discountPct ?? 0),
          amount: lineAmount,
          batchId: batches[0]?.id ?? null,
          batches,
        });
      }

      const totalAmount = subtotal - Number(discountAmount);
      const netAmount = totalAmount + Number(roundOff ?? 0);

      const sale = await tx.sale.update({
        where: { id },
        data: {
          customerId: validCustomerId,
          customerName: customerName ? String(customerName).trim() : null,
          doctorName: doctorName ? String(doctorName).trim() : null,
          paymentMethod: paymentMethod as any,
          discountAmount: Number(discountAmount),
          gstAmount: Number(gstAmount ?? 0),
          totalAmount,
          netAmount,
          paidAmount: Number(paidAmount ?? netAmount),
          changeAmount: Number(changeAmount ?? 0),
          roundOff: Number(roundOff ?? 0),
          notes: notes ?? null,
          items: {
            create: processedItems.map((it) => ({
              medicineId: it.medicineId,
              batchId: it.batchId,
              quantity: it.quantity,
              mrp: it.mrp,
              saleRate: it.saleRate,
              gstRate: it.gstRate,
              discountPct: it.discountPct,
              amount: it.amount,
            })),
          },
        },
        include: { items: true },
      });

      for (const it of processedItems) {
        let remaining = it.quantity;
        for (const batch of it.batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.availableQty);
          await tx.medicineBatch.update({ where: { id: batch.id }, data: { availableQty: { decrement: deduct } } });
          remaining -= deduct;
        }
      }

      return sale;
    }, { timeout: 20000, maxWait: 8000 });

    res.json(updated);
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ message: 'Sale not found' });
    console.error('[sales/update]', err);
    res.status(500).json({ message: err?.message || 'Internal server error' });
  }
});

export default router;

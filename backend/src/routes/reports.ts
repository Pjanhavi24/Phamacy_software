import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /reports/sales
router.get('/sales', async (req: Request, res: Response) => {
  try {
    const { from, to, storeId } = req.query as Record<string, string>;
    const where: any = {};
    if (from || to) where.saleDate = {};
    if (from) where.saleDate.gte = new Date(from);
    if (to) where.saleDate.lte = new Date(to);
    if (storeId) where.storeId = storeId;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { medicine: { select: { name: true, genericName: true } } } },
      },
      orderBy: { saleDate: 'desc' },
      take: 500,
    });

    const total = sales.reduce((sum, s) => sum + Number(s.netAmount), 0);
    const totalGst = sales.reduce((sum, s) => sum + Number(s.gstAmount), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discountAmount), 0);

    return res.json({ sales, summary: { total, totalGst, totalDiscount, count: sales.length } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /reports/purchase
router.get('/purchase', async (req: Request, res: Response) => {
  try {
    const { from, to, supplierId } = req.query as Record<string, string>;
    const where: any = {};
    if (from || to) where.invoiceDate = {};
    if (from) where.invoiceDate.gte = new Date(from);
    if (to) where.invoiceDate.lte = new Date(to);
    if (supplierId) where.supplierId = supplierId;

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        items: { include: { medicine: { select: { name: true } } } },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 500,
    });

    const total = purchases.reduce((sum, p) => sum + Number(p.netAmount), 0);
    return res.json({ purchases, summary: { total, count: purchases.length } });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /reports/gst
router.get('/gst', async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query as Record<string, string>;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: from, lte: to } },
      include: { items: { include: { medicine: { select: { name: true, hsnCode: true, gstRate: true } } } } },
    });

    const gstr1 = sales.map(s => ({
      invoiceNumber: s.invoiceNumber,
      invoiceDate: s.saleDate,
      taxableValue: Number(s.totalAmount),
      cgst: Number(s.gstAmount) / 2,
      sgst: Number(s.gstAmount) / 2,
      igst: 0,
      total: Number(s.netAmount),
    }));

    const totals = gstr1.reduce((acc, r) => ({
      taxable: acc.taxable + r.taxableValue,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
      total: acc.total + r.total,
    }), { taxable: 0, cgst: 0, sgst: 0, total: 0 });

    return res.json({ gstr1, gstr3b: totals, month: m, year: y });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /reports/stock
router.get('/stock', async (_req: Request, res: Response) => {
  try {
    const batches = await prisma.medicineBatch.findMany({
      where: { availableQty: { gt: 0 } },
      include: { medicine: { select: { name: true, genericName: true, category: true, mrp: true } } },
      orderBy: { medicine: { name: 'asc' } },
    });
    const totalValue = batches.reduce((sum, b) => sum + (Number(b.mrp) * b.availableQty), 0);
    return res.json({ batches, totalValue, count: batches.length });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /reports/expiry
router.get('/expiry', async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days) || 90;
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const batches = await prisma.medicineBatch.findMany({
      where: { expiryDate: { lte: cutoff }, availableQty: { gt: 0 } },
      include: { medicine: { select: { name: true, genericName: true, manufacturer: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    return res.json(batches);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Item reports ─────────────────────────────────────────────────────────────

// medicineId -> most recent sale date (single grouped query).
async function lastSaleDates(): Promise<Map<string, Date>> {
  const rows = await prisma.$queryRaw<{ medicine_id: string; last: Date }[]>`
    SELECT si.medicine_id, MAX(s.sale_date) AS last
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    GROUP BY si.medicine_id`;
  return new Map(rows.map((r) => [r.medicine_id, r.last]));
}

// medicineId -> most recent purchase (invoice) date.
async function lastPurchaseDates(): Promise<Map<string, Date>> {
  const rows = await prisma.$queryRaw<{ medicine_id: string; last: Date }[]>`
    SELECT pi.medicine_id, MAX(p.invoice_date) AS last
    FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
    GROUP BY pi.medicine_id`;
  return new Map(rows.map((r) => [r.medicine_id, r.last]));
}

// GET /reports/items/zero-stock?from&to
// Items whose total available stock is 0. When a date range is given, restrict
// to items whose last sale (the depleting activity) falls inside that window.
router.get('/items/zero-stock', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to + 'T23:59:59') : null;

    const stock = await prisma.medicineBatch.groupBy({
      by: ['medicineId'],
      _sum: { availableQty: true },
    });
    const inStock = new Set(
      stock.filter((s) => (s._sum.availableQty ?? 0) > 0).map((s) => s.medicineId)
    );

    const [meds, lastSale, lastPurchase] = await Promise.all([
      prisma.medicine.findMany({
        where: { isActive: true },
        select: { id: true, name: true, packing: true, manufacturer: true, category: true, mrp: true, saleRate: true },
        orderBy: { name: 'asc' },
      }),
      lastSaleDates(),
      lastPurchaseDates(),
    ]);

    let items = meds
      .filter((m) => !inStock.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        packing: m.packing ?? '',
        company: m.manufacturer ?? '',
        category: m.category,
        mrp: Number(m.mrp),
        saleRate: Number(m.saleRate),
        lastSaleDate: lastSale.get(m.id) ?? null,
        lastPurchaseDate: lastPurchase.get(m.id) ?? null,
      }));

    if (fromD || toD) {
      items = items.filter((i) => {
        if (!i.lastSaleDate) return false;
        const d = new Date(i.lastSaleDate);
        if (fromD && d < fromD) return false;
        if (toD && d > toD) return false;
        return true;
      });
    }

    return res.json({ items: items.slice(0, 2000), count: items.length, truncated: items.length > 2000 });
  } catch (err) {
    console.error('[reports/zero-stock]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /reports/items/not-sold?from&to
// Non-moving items: active items with NO sale inside the [from, to] window.
router.get('/items/not-sold', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    if (!from || !to) return res.json({ items: [], count: 0 });
    const fromD = new Date(from);
    const toD = new Date(to + 'T23:59:59');

    const [sold, stock, meds, lastSale] = await Promise.all([
      prisma.saleItem.findMany({
        where: { sale: { saleDate: { gte: fromD, lte: toD } } },
        select: { medicineId: true },
        distinct: ['medicineId'],
      }),
      prisma.medicineBatch.groupBy({ by: ['medicineId'], _sum: { availableQty: true } }),
      prisma.medicine.findMany({
        where: { isActive: true },
        select: { id: true, name: true, packing: true, manufacturer: true, category: true, mrp: true, saleRate: true },
        orderBy: { name: 'asc' },
      }),
      lastSaleDates(),
    ]);

    const soldSet = new Set(sold.map((s) => s.medicineId));
    const stockMap = new Map(stock.map((s) => [s.medicineId, s._sum.availableQty ?? 0]));

    const items = meds
      .filter((m) => !soldSet.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        packing: m.packing ?? '',
        company: m.manufacturer ?? '',
        category: m.category,
        mrp: Number(m.mrp),
        saleRate: Number(m.saleRate),
        stock: stockMap.get(m.id) ?? 0,
        lastSaleDate: lastSale.get(m.id) ?? null,
      }));

    return res.json({ items: items.slice(0, 2000), count: items.length, truncated: items.length > 2000 });
  } catch (err) {
    console.error('[reports/not-sold]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /reports/items/:id/detail
// Full movement of one item: recent sales (to customers), recent purchases
// (from suppliers) and aggregate sales figures. Powers both the movement popup
// and the itemwise sales-detail report.
router.get('/items/:id/detail', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      select: {
        id: true, name: true, packing: true, manufacturer: true, category: true,
        mrp: true, saleRate: true, purchaseRate: true,
      },
    });
    if (!medicine) return res.status(404).json({ message: 'Item not found' });

    const [saleItems, purchaseItems, stockAgg] = await Promise.all([
      prisma.saleItem.findMany({
        where: { medicineId: id },
        include: {
          sale: {
            select: {
              saleDate: true, invoiceNumber: true, customerName: true,
              customer: { select: { name: true } },
            },
          },
        },
        orderBy: { sale: { saleDate: 'desc' } },
        take: 200,
      }),
      prisma.purchaseItem.findMany({
        where: { medicineId: id },
        include: {
          purchase: {
            select: { invoiceDate: true, invoiceNumber: true, supplier: { select: { name: true } } },
          },
        },
        orderBy: { purchase: { invoiceDate: 'desc' } },
        take: 200,
      }),
      prisma.medicineBatch.aggregate({ where: { medicineId: id }, _sum: { availableQty: true } }),
    ]);

    const sales = saleItems.map((it) => ({
      date: it.sale.saleDate,
      party: it.sale.customer?.name ?? it.sale.customerName ?? 'Walk-in',
      invoiceNumber: it.sale.invoiceNumber,
      qty: it.quantity,
      rate: Number(it.saleRate),
      amount: Number(it.amount),
    }));
    const purchases = purchaseItems.map((it) => ({
      date: it.purchase.invoiceDate,
      party: it.purchase.supplier?.name ?? '—',
      invoiceNumber: it.purchase.invoiceNumber,
      qty: it.quantity,
      rate: Number(it.purchaseRate),
      amount: Number(it.amount),
    }));

    const purchaseRate = Number(medicine.purchaseRate);
    const totalQtySold = sales.reduce((a, s) => a + s.qty, 0);
    const totalRevenue = sales.reduce((a, s) => a + s.amount, 0);
    const totalMargin = totalRevenue - sales.reduce((a, s) => a + s.qty * purchaseRate, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = saleItems.filter((it) => new Date(it.sale.saleDate) >= monthStart);
    const thisMonthQty = month.reduce((a, it) => a + it.quantity, 0);
    const thisMonthRevenue = month.reduce((a, it) => a + Number(it.amount), 0);

    return res.json({
      medicine: {
        id: medicine.id,
        name: medicine.name,
        packing: medicine.packing ?? '',
        company: medicine.manufacturer ?? '',
        category: medicine.category,
        mrp: Number(medicine.mrp),
        saleRate: Number(medicine.saleRate),
        purchaseRate,
        stock: stockAgg._sum.availableQty ?? 0,
      },
      summary: { totalQtySold, totalRevenue, totalMargin, thisMonthQty, thisMonthRevenue },
      sales,
      purchases,
    });
  } catch (err) {
    console.error('[reports/item-detail]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

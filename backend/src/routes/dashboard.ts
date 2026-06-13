import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /dashboard/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [todaySales, todayPurchases, monthSales, lastMonthSales, lowStock, expiring, outOfStock] = await Promise.all([
      prisma.sale.aggregate({ _sum: { netAmount: true }, _count: { id: true }, where: { saleDate: { gte: today, lte: todayEnd } } }),
      prisma.purchase.aggregate({ _sum: { netAmount: true }, _count: { id: true }, where: { invoiceDate: { gte: today, lte: todayEnd } } }),
      prisma.sale.aggregate({ _sum: { netAmount: true }, where: { saleDate: { gte: monthStart } } }),
      prisma.sale.aggregate({ _sum: { netAmount: true }, where: { saleDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.medicineBatch.count({ where: { availableQty: { lte: 10 }, expiryDate: { gte: new Date() } } }),
      prisma.medicineBatch.count({ where: { expiryDate: { gte: new Date(), lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } } }),
      prisma.medicineBatch.count({ where: { availableQty: 0 } }),
    ]);

    const monthRev = Number(monthSales._sum.netAmount || 0);
    const lastRev = Number(lastMonthSales._sum.netAmount || 0);
    const growth = lastRev > 0 ? ((monthRev - lastRev) / lastRev) * 100 : 0;

    return res.json({
      todaySales: Number(todaySales._sum.netAmount || 0),
      todaySalesCount: todaySales._count.id,
      todayPurchase: Number(todayPurchases._sum.netAmount || 0),
      todayPurchaseCount: todayPurchases._count.id,
      monthlyRevenue: monthRev,
      monthlyProfit: monthRev * 0.25, // estimated margin
      revenueGrowth: Math.round(growth * 10) / 10,
      lowStockCount: lowStock,
      expiringCount: expiring,
      outOfStockCount: outOfStock,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /dashboard/sales-chart?days=30
router.get('/sales-chart', async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({ where: { saleDate: { gte: from } }, select: { saleDate: true, netAmount: true } }),
      prisma.purchase.findMany({ where: { invoiceDate: { gte: from } }, select: { invoiceDate: true, netAmount: true } }),
    ]);

    // Group by date
    const map: Record<string, { date: string; sales: number; purchase: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key, sales: 0, purchase: 0 };
    }
    sales.forEach(s => { const k = s.saleDate.toISOString().slice(0, 10); if (map[k]) map[k].sales += Number(s.netAmount); });
    purchases.forEach(p => { const k = p.invoiceDate.toISOString().slice(0, 10); if (map[k]) map[k].purchase += Number(p.netAmount); });

    return res.json(Object.values(map));
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /dashboard/top-medicines
router.get('/top-medicines', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.saleItem.groupBy({
      by: ['medicineId'],
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });
    const ids = items.map(i => i.medicineId);
    const medicines = await prisma.medicine.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const nameMap = Object.fromEntries(medicines.map(m => [m.id, m.name]));

    return res.json(items.map(i => ({
      name: nameMap[i.medicineId] || 'Unknown',
      quantity: i._sum.quantity || 0,
      revenue: Number(i._sum.amount || 0),
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /dashboard/alerts
router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [lowStock, expiring, pendingPayments] = await Promise.all([
      prisma.medicineBatch.findMany({
        where: { availableQty: { lte: 10, gt: 0 }, expiryDate: { gte: new Date() } },
        include: { medicine: { select: { name: true } } },
        take: 10,
      }),
      prisma.medicineBatch.findMany({
        where: { expiryDate: { gte: new Date(), lte: soon }, availableQty: { gt: 0 } },
        include: { medicine: { select: { name: true } } },
        take: 10,
      }),
      prisma.supplier.findMany({
        where: { balance: { gt: 0 } },
        select: { id: true, name: true, balance: true },
        take: 5,
      }),
    ]);
    return res.json({ lowStock, expiring, pendingPayments });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

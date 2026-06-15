import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /medicines
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, category, manufacturer, scheduleType } = req.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { genericName: { contains: search, mode: 'insensitive' } },
      { saltComposition: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
    ];
    if (category) where.category = category;
    if (manufacturer) where.manufacturer = { contains: manufacturer, mode: 'insensitive' };
    if (scheduleType) where.scheduleType = scheduleType;

    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          batches: {
            where: { isActive: true },
            select: {
              batchNumber: true,
              expiryDate: true,
              manufacturingDate: true,
              availableQty: true,
              purchaseRate: true,
            },
          },
        },
      }),
      prisma.medicine.count({ where }),
    ]);

    return res.json({ medicines, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Short label for a medicine category (used to build a "packing" string)
const CATEGORY_SHORT: Record<string, string> = {
  TABLET: 'TAB', CAPSULE: 'CAP', SYRUP: 'SYP', INJECTION: 'INJ', CREAM: 'CRM',
  OINTMENT: 'OINT', GEL: 'GEL', DROPS: 'DROP', INHALER: 'INH', POWDER: 'PWD',
  SUSPENSION: 'SUSP', SOLUTION: 'SOL', LOTION: 'LOT', SPRAY: 'SPR',
};

function formatExpiry(d: Date | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

// GET /medicines/search
// Returns a flat, billing-ready row per medicine (with its earliest-expiry
// available batch) so the billing grid can show code, packing, batch, expiry,
// rate, stock, schedule, etc.
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q = '' } = req.query as Record<string, string>;
    const medicines = await prisma.medicine.findMany({
      where: { OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
        { saltComposition: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q } },
        ...(/^\d+$/.test(q) ? [{ productCode: Number(q) }] : []),
      ]},
      take: 20,
      include: { batches: { where: { availableQty: { gt: 0 }, expiryDate: { gte: new Date() } }, orderBy: { expiryDate: 'asc' } } },
    });

    const rows = medicines.map((m) => {
      const batch = m.batches[0];
      const stock = m.batches.reduce((s, b) => s + (b.availableQty ?? 0), 0);
      const catShort = CATEGORY_SHORT[m.category] ?? String(m.category).slice(0, 3);
      return {
        id: m.id,
        // Human-facing item code = incremental productCode (fallback to barcode/sku).
        code: m.productCode != null ? String(m.productCode) : (m.barcode || m.sku || m.id.slice(-6).toUpperCase()),
        name: m.name,
        brand: '',
        // Generic group carries the composition (salt) for seeded items.
        salt: m.genericName ?? m.saltComposition ?? '',
        packing: m.packing || `${m.unitsPerPack ?? 1} ${catShort}`,
        looseFactor: m.looseQtyFactor ?? 1,
        schedule: m.scheduleType ?? 'OTC',
        location: '',
        batch: batch?.batchNumber ?? '',
        expiry: formatExpiry(batch?.expiryDate),
        mrp: Number(batch?.mrp ?? m.mrp),
        rate: Number(batch?.saleRate ?? m.saleRate),
        gstPct: Number(m.gstRate),
        stock,
      };
    });

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /medicines/low-stock
router.get('/low-stock', async (_req: Request, res: Response) => {
  try {
    const batches = await prisma.medicineBatch.findMany({
      where: { availableQty: { lte: 10 }, expiryDate: { gte: new Date() } },
      include: { medicine: true },
      orderBy: { availableQty: 'asc' },
      take: 50,
    });
    return res.json(batches);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /medicines/:id/purchases — every batch received for this item, across all
// suppliers (supplier, batch, expiry, qty). Used by the Expiry-Alert popup.
router.get('/:id/purchases', async (req: Request, res: Response) => {
  try {
    const batches = await prisma.medicineBatch.findMany({
      where: { medicineId: req.params.id },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true,
        batchNumber: true,
        expiryDate: true,
        quantity: true,
        availableQty: true,
        supplier: { select: { name: true } },
      },
    });
    const med = await prisma.medicine.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, packing: true },
    });
    return res.json({
      medicine: med,
      rows: batches.map((b) => ({
        supplierName: b.supplier?.name ?? '—',
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
        availableQty: b.availableQty,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /medicines/:id/batches — sellable batches (qty > 0, not expired), FEFO
// order. Used by billing to let the cashier pick a specific batch.
router.get('/:id/batches', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const nearCutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    // Include expired/near-expiry batches too so billing can warn/block on them.
    const batches = await prisma.medicineBatch.findMany({
      where: { medicineId: req.params.id, availableQty: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true,
        batchNumber: true,
        expiryDate: true,
        availableQty: true,
        mrp: true,
        saleRate: true,
      },
    });
    return res.json(
      batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        expiry: formatExpiry(b.expiryDate),
        availableQty: b.availableQty,
        mrp: Number(b.mrp),
        rate: Number(b.saleRate),
        expired: b.expiryDate < now,
        nearExpiry: b.expiryDate >= now && b.expiryDate <= nearCutoff,
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /medicines/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id },
      include: { batches: { orderBy: { expiryDate: 'asc' } } },
    });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    return res.json(medicine);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /medicines
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    // Auto-assign an incremental item code (productCode) when not supplied.
    if (data.productCode == null) {
      const max = await prisma.medicine.aggregate({ _max: { productCode: true } });
      data.productCode = (max._max.productCode ?? 0) + 1;
    }
    const medicine = await prisma.medicine.create({ data });
    return res.status(201).json(medicine);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Barcode or item code already exists' });
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /medicines/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const medicine = await prisma.medicine.update({ where: { id }, data: req.body });
    return res.json(medicine);
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Medicine not found' });
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /medicines/:id — blocked if the item was ever billed.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const billed = await prisma.saleItem.count({ where: { medicineId: req.params.id } });
    if (billed > 0) {
      return res.status(409).json({
        message: 'Cannot delete — this item has been billed in one or more sales.',
      });
    }
    // Remove dependent batches/adjustments first so the delete doesn't FK-fail.
    await prisma.stockAdjustment.deleteMany({ where: { medicineId: req.params.id } });
    await prisma.medicineBatch.deleteMany({ where: { medicineId: req.params.id } });
    await prisma.medicine.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Medicine not found' });
    if (err.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete — this item is referenced by other records.' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

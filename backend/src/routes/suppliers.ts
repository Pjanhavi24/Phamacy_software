import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /suppliers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({ suppliers, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /suppliers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /suppliers/:id/ledger
router.get('/:id/ledger', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, balance: true },
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const [purchases, payments] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          supplierId: req.params.id,
          ...(hasDateFilter && { purchaseDate: dateFilter }),
        },
        orderBy: { purchaseDate: 'asc' },
      }),
      prisma.payment.findMany({
        where: {
          supplierId: req.params.id,
          ...(hasDateFilter && { paymentDate: dateFilter }),
        },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const allEntries = [
      ...purchases.map((p: any) => ({
        date: p.purchaseDate,
        type: 'purchase',
        amount: Number(p.totalAmount),
        ref: p.purchaseNumber,
        id: p.id,
      })),
      ...payments.map((p: any) => ({
        date: p.paymentDate,
        type: 'payment',
        amount: -Number(p.amount),
        ref: p.paymentNumber,
        id: p.id,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const ledger: any[] = [];
    let balance = 0;
    for (const entry of allEntries) {
      balance += entry.amount;
      ledger.push({ ...entry, balance });
    }

    res.json({ supplier, ledger, closingBalance: balance });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /suppliers
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone: req.body.phone || '',
        code: req.body.code || null,
        ourCode: req.body.ourCode || null,
        gstin: req.body.gstin || null,
        dlNumber: req.body.dlNumber || null,
        email: req.body.email || null,
        address: req.body.address || '',
        state: req.body.state || '',
        mobileNo: req.body.mobileNo || null,
        visitDay: req.body.visitDay || null,
        contactPerson: req.body.contactPerson || null,
        panNumber: req.body.panNumber || null,
        aadharNumber: req.body.aadharNumber || null,
        balance: req.body.balance ?? 0,
      },
    });

    res.status(201).json(supplier);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Supplier with this information already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /suppliers/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const fields = [
      'name', 'phone', 'code', 'ourCode', 'gstin', 'dlNumber', 'email', 'address',
      'state', 'mobileNo', 'visitDay', 'contactPerson', 'panNumber', 'aadharNumber', 'balance',
    ];
    const data: any = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) data[f] = f === 'gstin' ? (req.body[f] || null) : req.body[f];
    }

    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data,
    });

    res.json(supplier);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Duplicate supplier information' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /suppliers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.supplier.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Supplier deactivated' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /customers
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

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ data: customers, customers, total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate the next incremental customer code, e.g. CUST-00001, CUST-00002, ...
async function nextCustomerCode(): Promise<string> {
  const last = await prisma.customer.findFirst({
    where: { customerCode: { not: null } },
    orderBy: { customerCode: 'desc' },
    select: { customerCode: true },
  });
  let next = 1;
  if (last?.customerCode) {
    const n = parseInt(last.customerCode.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `CUST-${String(next).padStart(5, '0')}`;
}

// GET /customers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /customers/:id/history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (+page - 1) * +limit;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: { customerId: req.params.id },
        include: {
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
      prisma.sale.count({ where: { customerId: req.params.id } }),
    ]);

    res.json({ sales, total });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /customers
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, age, gender, bloodGroup, chronicDiseases, loyaltyPoints, allergies } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    // Retry a few times in case two customers are created concurrently and
    // collide on the generated customer code.
    let customer = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const customerCode = await nextCustomerCode();
      try {
        customer = await prisma.customer.create({
          data: {
            customerCode,
            name,
            phone,
            email,
            address,
            age,
            gender,
            bloodGroup,
            chronicDiseases,
            loyaltyPoints: loyaltyPoints ?? 0,
            allergies,
          },
        });
        break;
      } catch (e: any) {
        const target = e?.meta?.target;
        const onCode = Array.isArray(target)
          ? target.includes('customer_code') || target.includes('customerCode')
          : String(target ?? '').includes('customer_code');
        if (e.code === 'P2002' && onCode) continue; // code collision -> retry
        throw e;
      }
    }

    if (!customer) {
      return res.status(500).json({ message: 'Could not allocate a customer code, please retry' });
    }

    res.status(201).json(customer);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Customer with this phone already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /customers/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, address, age, gender, bloodGroup, chronicDiseases, loyaltyPoints, allergies } = req.body;

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(age !== undefined && { age }),
        ...(gender !== undefined && { gender }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(chronicDiseases !== undefined && { chronicDiseases }),
        ...(loyaltyPoints !== undefined && { loyaltyPoints }),
        ...(allergies !== undefined && { allergies }),
      },
    });

    res.json(customer);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Customer not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Phone number already in use' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /customers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.customer.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Customer deactivated' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

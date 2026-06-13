import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /doctors
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, specialization } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { registrationNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (specialization) {
      where.specialization = specialization as string;
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { name: 'asc' },
      }),
      prisma.doctor.count({ where }),
    ]);

    res.json({ doctors, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /doctors/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /doctors/:id/prescriptions
router.get('/:id/prescriptions', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (+page - 1) * +limit;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where: { doctorId: req.params.id },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.count({ where: { doctorId: req.params.id } }),
    ]);

    res.json({ prescriptions, total });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /doctors
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, registrationNumber, specialization, phone, clinicAddress } = req.body;

    if (!name || !registrationNumber) {
      return res.status(400).json({ message: 'Name and registration number are required' });
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        registrationNumber,
        specialization,
        phone,
        clinicAddress,
      },
    });

    res.status(201).json(doctor);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Doctor with this registration number already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /doctors/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, registrationNumber, specialization, phone, clinicAddress } = req.body;

    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(registrationNumber !== undefined && { registrationNumber }),
        ...(specialization !== undefined && { specialization }),
        ...(phone !== undefined && { phone }),
        ...(clinicAddress !== undefined && { clinicAddress }),
      },
    });

    res.json(doctor);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Registration number already in use' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /doctors/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.doctor.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Doctor deactivated' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

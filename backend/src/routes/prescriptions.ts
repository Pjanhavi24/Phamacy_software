import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';

const router = Router();

// Store prescription images on local disk (dev). Served back via /api/uploads.
const PRESCRIPTIONS_DIR = path.join(process.cwd(), 'uploads', 'prescriptions');
fs.mkdirSync(PRESCRIPTIONS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRESCRIPTIONS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    const ok =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP and PDF files are allowed'), ok);
  },
});

router.use(authenticate);

const doctorSelect = { id: true, name: true, specialization: true } as const;
const customerSelect = { id: true, name: true, phone: true } as const;

// POST /prescriptions  (multipart/form-data: file + customerId, doctorId?, notes?)
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { customerId, doctorId, notes, prescriptionDate } = req.body;
    if (!customerId) {
      return res.status(400).json({ message: 'customerId is required' });
    }

    const imageUrl = req.file ? `/api/uploads/prescriptions/${req.file.filename}` : null;
    const imagePath = req.file ? `uploads/prescriptions/${req.file.filename}` : null;

    const prescription = await prisma.prescription.create({
      data: {
        customerId,
        doctorId: doctorId || null,
        notes: notes || null,
        prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : new Date(),
        imageUrl,
        imagePath,
      },
      include: { doctor: { select: doctorSelect } },
    });

    res.status(201).json(prescription);
  } catch (err: any) {
    if (err.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid customer or doctor reference' });
    }
    console.error('[prescriptions] create failed:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /prescriptions?customerId=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerId, page = '1', limit = '50' } = req.query as Record<string, string>;
    const where: any = {};
    if (customerId) where.customerId = customerId;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: { doctor: { select: doctorSelect }, customer: { select: customerSelect } },
        orderBy: { prescriptionDate: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.prescription.count({ where }),
    ]);

    res.json({ data: prescriptions, prescriptions, total });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /prescriptions/customer/:id  (must be before /:id)
router.get('/customer/:id', async (req: Request, res: Response) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { customerId: req.params.id },
      include: { doctor: { select: doctorSelect } },
      orderBy: { prescriptionDate: 'desc' },
    });
    res.json({ data: prescriptions, prescriptions, total: prescriptions.length });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /prescriptions/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: { doctor: { select: doctorSelect }, customer: { select: customerSelect } },
    });
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

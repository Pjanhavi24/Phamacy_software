import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import QRCode from 'qrcode';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const generateBarcodeImage = async (value: string): Promise<string> => {
  return await QRCode.toDataURL(value, { width: 200, margin: 1 });
};

// POST /barcode/generate
router.post('/generate', [
  body('type').isIn(['barcode', 'qrcode']),
  body('value').notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { type, value, format } = req.body;
    let image: string;

    if (type === 'qrcode') {
      image = await QRCode.toDataURL(value);
    } else {
      image = generateBarcodeImage(value, format);
    }

    res.json({ image, value, type });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate barcode' });
  }
});

// POST /barcode/batch-generate
router.post('/batch-generate', [
  body('items').isArray({ min: 1 }),
  body('items.*.value').notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { items, type = 'barcode', format } = req.body;
    const results = await Promise.all(
      items.map(async (item: any) => {
        const image = type === 'qrcode'
          ? await QRCode.toDataURL(item.value)
          : generateBarcodeImage(item.value, format);
        return { ...item, image };
      })
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate barcodes' });
  }
});

// GET /barcode/print-labels
router.get('/print-labels', authorize('admin', 'pharmacist'), async (req: Request, res: Response) => {
  try {
    const { medicineIds, batchIds, copies = 1 } = req.query;

    const ids = (medicineIds as string)?.split(',') || [];
    const bIds = (batchIds as string)?.split(',') || [];

    const labels: any[] = [];

    if (ids.length) {
      const medicines = await prisma.medicine.findMany({ where: { id: { in: ids } } });
      for (const med of medicines) {
        for (let i = 0; i < +copies; i++) {
          const image = med.barcode ? await generateBarcodeImage(med.barcode) : null;
          labels.push({ type: 'medicine', id: med.id, name: med.name, barcode: med.barcode, mrp: Number(med.mrp), image });
        }
      }
    }

    if (bIds.length) {
      const batches = await prisma.medicineBatch.findMany({ where: { id: { in: bIds } }, include: { medicine: { select: { name: true, mrp: true, barcode: true } } } });
      for (const batch of batches) {
        for (let i = 0; i < +copies; i++) {
          const med = batch.medicine;
          const image = med?.barcode ? await generateBarcodeImage(med.barcode) : null;
          labels.push({
            type: 'batch',
            id: batch.id,
            name: med?.name,
            barcode: med?.barcode,
            batchNumber: (batch as any).batchNumber,
            expiryDate: (batch as any).expiryDate,
            mrp: med?.mrp,
            image
          });
        }
      }
    }

    res.json(labels);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

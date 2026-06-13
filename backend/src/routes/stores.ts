import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /stores
router.get('/', async (req: Request, res: Response) => {
  try {
    const stores = await Store.find({ isActive: true }).sort({ name: 1 });
    res.json(stores);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /stores/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /stores
router.post('/', authorize('admin'), [
  body('name').notEmpty().trim(),
  body('address').notEmpty(),
  body('phone').notEmpty(),
  body('licenseNumber').notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const store = await Store.create(req.body);
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /stores/:id
router.put('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /stores/:id
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const hasStock = await Batch.findOne({ store: req.params.id, quantity: { $gt: 0 } });
    if (hasStock) return res.status(400).json({ message: 'Cannot deactivate store with active stock. Transfer stock first.' });

    const store = await Store.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({ message: 'Store deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /stores/stock-transfer
router.post('/stock-transfer', authorize('admin', 'pharmacist'), [
  body('fromStore').notEmpty(),
  body('toStore').notEmpty(),
  body('items').isArray({ min: 1 }),
  body('items.*.medicineId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { fromStore, toStore, items, notes } = req.body;

    if (fromStore === toStore) return res.status(400).json({ message: 'Source and destination stores must differ' });

    const [sourceStore, destStore] = await Promise.all([
      Store.findById(fromStore),
      Store.findById(toStore)
    ]);
    if (!sourceStore || !destStore) return res.status(404).json({ message: 'Store not found' });

    const transferLog = [];
    for (const item of items) {
      const batches = await Batch.find({ medicine: item.medicineId, store: fromStore, quantity: { $gt: 0 } }).sort({ expiryDate: 1 });
      const totalAvail = batches.reduce((s: number, b: any) => s + b.quantity, 0);
      if (totalAvail < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for medicine ${item.medicineId}. Available: ${totalAvail}` });
      }

      let remaining = item.quantity;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, batch.quantity);
        await Batch.updateOne({ _id: batch._id }, { $inc: { quantity: -take } });

        await Batch.findOneAndUpdate(
          { medicine: item.medicineId, batchNumber: (batch as any).batchNumber, store: toStore },
          { $inc: { quantity: take }, $setOnInsert: { medicine: item.medicineId, batchNumber: (batch as any).batchNumber, expiryDate: (batch as any).expiryDate, costPrice: (batch as any).costPrice, mrp: (batch as any).mrp, store: toStore } },
          { upsert: true }
        );

        await StockMovement.create([
          { medicine: item.medicineId, store: fromStore, type: 'transfer_out', quantity: take, notes, performedBy: (req as any).user.userId },
          { medicine: item.medicineId, store: toStore, type: 'transfer_in', quantity: take, notes, performedBy: (req as any).user.userId }
        ]);

        remaining -= take;
      }

      transferLog.push({ medicineId: item.medicineId, transferred: item.quantity });
    }

    res.json({ message: 'Stock transferred successfully', transferLog });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /stores/:id/stock
router.get('/:id/stock', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [batches, total] = await Promise.all([
      Batch.find({ store: req.params.id, quantity: { $gt: 0 } })
        .populate('medicine', 'name genericName barcode mrp reorderLevel')
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .sort({ 'medicine.name': 1 }),
      Batch.countDocuments({ store: req.params.id, quantity: { $gt: 0 } })
    ]);
    res.json({ batches, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

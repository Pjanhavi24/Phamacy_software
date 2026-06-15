import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function paging(req: Request) {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const take = Math.min(Math.max(1, Number(limit) || 50), 200);
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;
  return { take, skip, page: Number(page) || 1 };
}
const q = (req: Request) => String((req.query as any).search || '').trim();

// Fuzzy/token search: every whitespace-separated word must appear somewhere in
// the name (order-independent), so "esomeprazole domperidone" still matches
// "Domperidone (30) + Esomeprazole (40)". The full string is also matched
// against the code. `numericCode` true ⇒ code is an Int (generic groups).
function searchWhere(search: string, numericCode = false): any {
  if (!search) return {};
  const tokens = search.split(/\s+/).filter(Boolean);
  const nameAnd = tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' } }));
  const or: any[] = [{ AND: nameAnd }];
  if (numericCode) {
    if (/^\d+$/.test(search)) or.push({ code: Number(search) });
  } else {
    or.push({ code: { contains: search, mode: 'insensitive' } });
  }
  return { OR: or };
}
const dup = (err: any, res: Response) =>
  err?.code === 'P2002'
    ? res.status(409).json({ message: 'A record with that code/name already exists' })
    : res.status(500).json({ message: 'Internal server error' });

/* ── Companies ─────────────────────────────────────────────────────────── */
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const search = q(req);
    const { take, skip, page } = paging(req);
    const where: any = searchWhere(search, false);
    const [items, total] = await Promise.all([
      prisma.company.findMany({ where, orderBy: { name: 'asc' }, take, skip, select: { id: true, code: true, name: true } }),
      prisma.company.count({ where }),
    ]);
    return res.json({ items, total, page, limit: take });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/companies', async (req: Request, res: Response) => {
  try {
    const code = String(req.body.code || '').trim();
    const name = String(req.body.name || '').trim();
    if (!code || !name) return res.status(400).json({ message: 'Code and name are required' });
    const created = await prisma.company.create({ data: { code, name } });
    return res.status(201).json(created);
  } catch (err) {
    return dup(err, res);
  }
});

router.put('/companies/:id', async (req: Request, res: Response) => {
  try {
    const data: any = {};
    if (req.body.code != null) data.code = String(req.body.code).trim();
    if (req.body.name != null) data.name = String(req.body.name).trim();
    const updated = await prisma.company.update({ where: { id: req.params.id }, data });
    return res.json(updated);
  } catch (err) {
    return dup(err, res);
  }
});

router.delete('/companies/:id', async (req: Request, res: Response) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(404).json({ message: 'Not found' });
  }
});

/* ── Generic groups ────────────────────────────────────────────────────── */
router.get('/generics', async (req: Request, res: Response) => {
  try {
    const search = q(req);
    const { take, skip, page } = paging(req);
    const where: any = searchWhere(search, true);
    const [items, total] = await Promise.all([
      prisma.genericGroup.findMany({
        where, orderBy: { code: 'asc' }, take, skip,
        select: { id: true, code: true, name: true, schedule: true, dosage: true, ndps: true },
      }),
      prisma.genericGroup.count({ where }),
    ]);
    return res.json({ items, total, page, limit: take });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/generics', async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const max = await prisma.genericGroup.aggregate({ _max: { code: true } });
    const code = (max._max.code ?? 0) + 1;
    const created = await prisma.genericGroup.create({
      data: { name, code, schedule: req.body.schedule || null, dosage: req.body.dosage || null, ndps: !!req.body.ndps },
    });
    return res.status(201).json(created);
  } catch (err) {
    return dup(err, res);
  }
});

router.put('/generics/:id', async (req: Request, res: Response) => {
  try {
    const data: any = {};
    if (req.body.name != null) data.name = String(req.body.name).trim();
    if (req.body.schedule !== undefined) data.schedule = req.body.schedule || null;
    if (req.body.dosage !== undefined) data.dosage = req.body.dosage || null;
    if (req.body.ndps !== undefined) data.ndps = !!req.body.ndps;
    const updated = await prisma.genericGroup.update({ where: { id: req.params.id }, data });
    return res.json(updated);
  } catch (err) {
    return dup(err, res);
  }
});

router.delete('/generics/:id', async (req: Request, res: Response) => {
  try {
    await prisma.genericGroup.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(404).json({ message: 'Not found' });
  }
});

/* ── Categories ────────────────────────────────────────────────────────── */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const search = q(req);
    const { take, skip, page } = paging(req);
    const where: any = searchWhere(search, false);
    const [items, total] = await Promise.all([
      prisma.category.findMany({ where, orderBy: { name: 'asc' }, take, skip, select: { id: true, code: true, name: true } }),
      prisma.category.count({ where }),
    ]);
    return res.json({ items, total, page, limit: take });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/categories', async (req: Request, res: Response) => {
  try {
    const code = String(req.body.code || '').trim();
    const name = String(req.body.name || '').trim();
    if (!code || !name) return res.status(400).json({ message: 'Code and name are required' });
    const created = await prisma.category.create({ data: { code, name } });
    return res.status(201).json(created);
  } catch (err) {
    return dup(err, res);
  }
});

router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const data: any = {};
    if (req.body.code != null) data.code = String(req.body.code).trim();
    if (req.body.name != null) data.name = String(req.body.name).trim();
    const updated = await prisma.category.update({ where: { id: req.params.id }, data });
    return res.json(updated);
  } catch (err) {
    return dup(err, res);
  }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(404).json({ message: 'Not found' });
  }
});

export default router;

import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Escape LIKE wildcards in user input so they are matched literally.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => '\\' + m);
}

type Suggestion = {
  id: number;
  name: string;
  price: string | null;
  manufacturer: string | null;
  packing: string | null;
  generic_name: string | null;
};

// GET /medicine-catalog?page=&limit=&search=
// Paginated browse of the master medicine catalog (medicine_dataset).
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const offset = (page - 1) * limit;
    const search = String((req.query.search ?? '') as string).trim();

    let where = '';
    const params: unknown[] = [];
    if (search) {
      const safe = escapeLike(search);
      where = `WHERE name ILIKE $1 ESCAPE '\\' OR generic_name ILIKE $1 ESCAPE '\\' OR manufacturer ILIKE $1 ESCAPE '\\'`;
      params.push(`%${safe}%`);
    }

    const countRow = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS c FROM medicine_dataset ${where}`,
      ...params
    )) as Array<{ c: number }>;
    const total = countRow[0]?.c ?? 0;

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, name, price, manufacturer, type, packing, generic_name
         FROM medicine_dataset ${where}
        ORDER BY name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params,
      limit,
      offset
    )) as Array<{
      id: number;
      name: string;
      price: string | null;
      manufacturer: string | null;
      type: string | null;
      packing: string | null;
      generic_name: string | null;
    }>;

    return res.json({
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: r.price !== null ? Number(r.price) : null,
        manufacturer: r.manufacturer,
        type: r.type,
        packing: r.packing,
        genericName: r.generic_name,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[medicine-catalog/list]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /medicine-catalog/suggest?q=...&limit=...
// Autocomplete suggestions from the imported `medicine_dataset` reference table.
// Matches are found three ways and ranked best-first:
//   1. Prefix match on the name ("augm" -> "Augmentin...")
//   2. Substring match on name or generic/salt name
//   3. Fuzzy / "similar name" match via pg_trgm trigram similarity, so typos
//      ("paracetmol") and close spellings still surface relevant medicines.
router.get('/suggest', async (req: Request, res: Response) => {
  try {
    const q = String((req.query.q ?? '') as string).trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 25);
    if (q.length < 2) return res.json([]);

    const safe = escapeLike(q);
    const like = `%${safe}%`;
    const prefix = `${safe}%`;

    // Both conditions below are served by the GIN trigram index on `name`
    // (medicine_dataset_name_trgm_idx), so this stays fast on 250k+ rows:
    //   - name ILIKE '%term%'  → substring / partial matches
    //   - name % $1            → trigram "similar name" (typo-tolerant) matches
    // $1 = raw query (trigram similarity / % operator)
    // $2 = %term% substring · $3 = term% prefix (ranking) · $4 = limit
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, name, price, manufacturer, packing, generic_name
         FROM medicine_dataset
        WHERE name ILIKE $2 ESCAPE '\\'
           OR name % $1
        ORDER BY
          (name ILIKE $3 ESCAPE '\\') DESC,   -- prefix matches first
          (name ILIKE $2 ESCAPE '\\') DESC,   -- then any substring
          similarity(name, $1) DESC,          -- then closest fuzzy match
          length(name) ASC,
          name ASC
        LIMIT $4`,
      q,
      like,
      prefix,
      limit
    )) as Suggestion[];

    return res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: r.price !== null ? Number(r.price) : null,
        manufacturer: r.manufacturer,
        packing: r.packing,
        genericName: r.generic_name,
      }))
    );
  } catch (err) {
    console.error('[medicine-catalog/suggest]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

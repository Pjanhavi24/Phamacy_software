import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';

/**
 * Workspace API — persists the desktop-style multi-tab session per user.
 *
 * The client holds the authoritative in-memory + localStorage session and syncs
 * it here (debounced) so tabs survive a refresh and follow the user across
 * devices. Tabs are soft-closed (closedAt) so they can be restored.
 *
 *   GET    /api/v1/workspace            -> { tabs, recentlyClosed }
 *   PUT    /api/v1/workspace            -> replace the open-tab set (bulk sync)
 *   DELETE /api/v1/workspace/:key       -> soft-close one tab
 *   POST   /api/v1/workspace/restore    -> restore a recently-closed tab
 */

const router = Router();
router.use(authenticate);

const MAX_TABS = 40;
const MAX_TITLE = 80;
const RECENT_CLOSED_LIMIT = 15;

function uid(req: Request): string {
  const u = (req as any).user || {};
  return u.userId || u.id || u.sub;
}

const str = (v: unknown, max = 255): string =>
  typeof v === 'string' ? v.slice(0, max) : '';

interface IncomingTab {
  instanceKey: string;
  module: string;
  title: string;
  href: string;
  pinned?: boolean;
  position?: number;
  isActive?: boolean;
  dirty?: boolean;
  state?: unknown;
}

/** Validate + normalize one incoming tab; returns null if invalid. */
function sanitizeTab(raw: any, index: number): IncomingTab | null {
  if (!raw || typeof raw !== 'object') return null;
  const instanceKey = str(raw.instanceKey, 64);
  const module = str(raw.module, 48);
  const title = str(raw.title, MAX_TITLE) || module || 'Untitled';
  const href = str(raw.href, 512);
  if (!instanceKey || !module || !href) return null;
  return {
    instanceKey,
    module,
    title,
    href,
    pinned: !!raw.pinned,
    position: Number.isFinite(raw.position) ? Number(raw.position) : index,
    isActive: !!raw.isActive,
    dirty: !!raw.dirty,
    state:
      raw.state && typeof raw.state === 'object' ? raw.state : undefined,
  };
}

function serialize(tab: any) {
  return {
    id: tab.id,
    instanceKey: tab.instanceKey,
    module: tab.module,
    title: tab.title,
    href: tab.href,
    pinned: tab.pinned,
    position: tab.position,
    isActive: tab.isActive,
    dirty: tab.dirty,
    state: tab.state ?? null,
    closedAt: tab.closedAt,
    updatedAt: tab.updatedAt,
  };
}

// GET /workspace — current open tabs + recently closed
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const [tabs, recentlyClosed] = await Promise.all([
      prisma.workspaceTab.findMany({
        where: { userId, closedAt: null },
        orderBy: [{ pinned: 'desc' }, { position: 'asc' }],
      }),
      prisma.workspaceTab.findMany({
        where: { userId, closedAt: { not: null } },
        orderBy: { closedAt: 'desc' },
        take: RECENT_CLOSED_LIMIT,
      }),
    ]);

    return res.json({
      success: true,
      tabs: tabs.map(serialize),
      recentlyClosed: recentlyClosed.map(serialize),
    });
  } catch (err) {
    console.error('[workspace] GET failed:', err);
    return res.status(500).json({ message: 'Failed to load workspace' });
  }
});

// PUT /workspace — replace the open-tab set (bulk, debounced sync from client)
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const rawTabs = Array.isArray(req.body?.tabs) ? req.body.tabs : null;
    if (!rawTabs) return res.status(400).json({ message: '`tabs` array is required' });
    if (rawTabs.length > MAX_TABS)
      return res.status(400).json({ message: `Too many tabs (max ${MAX_TABS})` });

    const clean = rawTabs
      .map((t: any, i: number) => sanitizeTab(t, i))
      .filter(Boolean) as IncomingTab[];

    const keepKeys = clean.map((t) => t.instanceKey);

    await prisma.$transaction(async (tx) => {
      // Upsert every provided tab as open.
      for (const t of clean) {
        await tx.workspaceTab.upsert({
          where: { userId_instanceKey: { userId, instanceKey: t.instanceKey } },
          create: {
            userId,
            instanceKey: t.instanceKey,
            module: t.module,
            title: t.title,
            href: t.href,
            pinned: t.pinned ?? false,
            position: t.position ?? 0,
            isActive: t.isActive ?? false,
            dirty: t.dirty ?? false,
            state: (t.state as any) ?? undefined,
            closedAt: null,
          },
          update: {
            module: t.module,
            title: t.title,
            href: t.href,
            pinned: t.pinned ?? false,
            position: t.position ?? 0,
            isActive: t.isActive ?? false,
            dirty: t.dirty ?? false,
            state: (t.state as any) ?? undefined,
            closedAt: null,
          },
        });
      }
      // Soft-close any currently-open tab the client no longer has.
      await tx.workspaceTab.updateMany({
        where: {
          userId,
          closedAt: null,
          instanceKey: keepKeys.length ? { notIn: keepKeys } : undefined,
        },
        data: { closedAt: new Date(), isActive: false },
      });
    });

    const tabs = await prisma.workspaceTab.findMany({
      where: { userId, closedAt: null },
      orderBy: [{ pinned: 'desc' }, { position: 'asc' }],
    });

    return res.json({ success: true, tabs: tabs.map(serialize) });
  } catch (err) {
    console.error('[workspace] PUT failed:', err);
    return res.status(500).json({ message: 'Failed to save workspace' });
  }
});

// DELETE /workspace/:instanceKey — soft-close a single tab (audited)
router.delete('/:instanceKey', async (req: Request, res: Response) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    const instanceKey = req.params.instanceKey;

    const existing = await prisma.workspaceTab.findUnique({
      where: { userId_instanceKey: { userId, instanceKey } },
    });
    if (!existing) return res.status(404).json({ message: 'Tab not found' });

    await prisma.workspaceTab.update({
      where: { userId_instanceKey: { userId, instanceKey } },
      data: { closedAt: new Date(), isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CLOSE',
        module: 'WORKSPACE',
        entityId: existing.id,
        entityType: 'WorkspaceTab',
        details: `Closed tab "${existing.title}" (${existing.module})`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[workspace] DELETE failed:', err);
    return res.status(500).json({ message: 'Failed to close tab' });
  }
});

// POST /workspace/restore — restore a recently-closed tab (audited)
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    const instanceKey = str(req.body?.instanceKey, 64);
    if (!instanceKey) return res.status(400).json({ message: '`instanceKey` is required' });

    const existing = await prisma.workspaceTab.findUnique({
      where: { userId_instanceKey: { userId, instanceKey } },
    });
    if (!existing) return res.status(404).json({ message: 'Tab not found' });

    const maxPos = await prisma.workspaceTab.aggregate({
      where: { userId, closedAt: null },
      _max: { position: true },
    });

    const restored = await prisma.workspaceTab.update({
      where: { userId_instanceKey: { userId, instanceKey } },
      data: { closedAt: null, position: (maxPos._max.position ?? 0) + 1, dirty: false },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESTORE',
        module: 'WORKSPACE',
        entityId: restored.id,
        entityType: 'WorkspaceTab',
        details: `Restored tab "${restored.title}" (${restored.module})`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    return res.json({ success: true, tab: serialize(restored) });
  } catch (err) {
    console.error('[workspace] restore failed:', err);
    return res.status(500).json({ message: 'Failed to restore tab' });
  }
});

export default router;

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Mailer setup
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

// ---------------------------------------------------------------------------
// Redis client
// ---------------------------------------------------------------------------
const redisClient = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('[Redis] Client error:', err));

async function getRedisClient() {
  if (!redisClient.isOpen) await redisClient.connect();
  return redisClient;
}

// ---------------------------------------------------------------------------
// Helper: format currency
// ---------------------------------------------------------------------------
const fmt = (n: number) => `â‚¹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// Job 1 â€” Daily 8:00 AM: Expiry Alerts
// Send email about medicines expiring within the next 30 days.
// ---------------------------------------------------------------------------
cron.schedule('0 8 * * *', async () => {
  console.log('[CronJob] Running: Expiry Alerts');
  try {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiringBatches = await prisma.batch.findMany({
      where: {
        expiryDate: {
          gte: today,
          lte: thirtyDaysLater,
        },
        currentStock: { gt: 0 },
      },
      include: {
        medicine: {
          include: { store: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    if (expiringBatches.length === 0) {
      console.log('[CronJob] No expiring medicines found.');
      return;
    }

    const tableRows = expiringBatches
      .map(
        (b: any) =>
          `<tr>
            <td style="padding:4px 8px;border:1px solid #ddd">${b.medicine.name}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${b.batchNumber}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${new Date(b.expiryDate).toLocaleDateString('en-IN')}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${b.currentStock}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${b.medicine.store.name}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <h2 style="color:#c0392b">Expiry Alert â€” Medicines Expiring Within 30 Days</h2>
      <p>The following medicines are expiring within the next 30 days. Please take appropriate action (return to supplier, apply discount, or dispose).</p>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">
        <thead style="background:#f2f2f2">
          <tr>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Medicine</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Batch No</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Expiry Date</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Qty in Stock</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Store</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="margin-top:16px;color:#555">Total items: <strong>${expiringBatches.length}</strong></p>
      <p style="color:#888;font-size:12px">This is an automated alert from Pharmacy ERP. Do not reply to this email.</p>
    `;

    await sendEmail(ADMIN_EMAIL, `[Pharmacy ERP] Expiry Alert â€” ${expiringBatches.length} items expiring soon`, html);
    console.log(`[CronJob] Expiry alert sent for ${expiringBatches.length} batches.`);
  } catch (err) {
    console.error('[CronJob] Expiry Alerts error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ---------------------------------------------------------------------------
// Job 2 â€” Daily 9:00 AM: Low Stock Alerts
// Send email about medicines whose current stock is at or below reorder level.
// ---------------------------------------------------------------------------
cron.schedule('0 9 * * *', async () => {
  console.log('[CronJob] Running: Low Stock Alerts');
  try {
    const lowStockMedicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        currentStock: {
          lte: prisma.medicine.fields.reorderLevel,
        },
      },
      include: { store: true, category: true },
      orderBy: { currentStock: 'asc' },
    });

    if (lowStockMedicines.length === 0) {
      console.log('[CronJob] No low stock medicines.');
      return;
    }

    const tableRows = lowStockMedicines
      .map(
        (m: any) =>
          `<tr>
            <td style="padding:4px 8px;border:1px solid #ddd">${m.name}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${m.category?.name ?? '-'}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;color:${m.currentStock === 0 ? '#c0392b' : '#e67e22'}">${m.currentStock}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${m.reorderLevel}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${m.store.name}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <h2 style="color:#e67e22">Low Stock Alert</h2>
      <p>The following medicines have reached or fallen below their reorder level. Please raise purchase orders.</p>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">
        <thead style="background:#f2f2f2">
          <tr>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Medicine</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Category</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Current Stock</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Reorder Level</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Store</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="margin-top:16px;color:#555">Total items below reorder level: <strong>${lowStockMedicines.length}</strong></p>
      <p style="color:#888;font-size:12px">This is an automated alert from Pharmacy ERP. Do not reply to this email.</p>
    `;

    await sendEmail(ADMIN_EMAIL, `[Pharmacy ERP] Low Stock Alert â€” ${lowStockMedicines.length} items need restocking`, html);
    console.log(`[CronJob] Low stock alert sent for ${lowStockMedicines.length} medicines.`);
  } catch (err) {
    console.error('[CronJob] Low Stock Alerts error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ---------------------------------------------------------------------------
// Job 3 â€” Weekly Monday 8:00 AM: Weekly Sales Report
// Generate a weekly sales summary and email to admin.
// ---------------------------------------------------------------------------
cron.schedule('0 8 * * 1', async () => {
  console.log('[CronJob] Running: Weekly Sales Report');
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startOfWeek, lte: now },
        status: 'COMPLETED',
      },
      include: {
        store: true,
        items: true,
      },
    });

    const totalRevenue = sales.reduce((s: number, sale: any) => s + (sale.totalAmount ?? 0), 0);
    const totalDiscount = sales.reduce((s: number, sale: any) => s + (sale.discountAmount ?? 0), 0);
    const totalGst = sales.reduce((s: number, sale: any) => s + (sale.taxAmount ?? 0), 0);
    const totalItems = sales.reduce((s: number, sale: any) => s + sale.items.length, 0);
    const avgSaleValue = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Daily breakdown
    const dailyMap: Record<string, { count: number; revenue: number }> = {};
    for (const sale of sales) {
      const day = new Date(sale.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
      if (!dailyMap[day]) dailyMap[day] = { count: 0, revenue: 0 };
      dailyMap[day].count += 1;
      dailyMap[day].revenue += sale.totalAmount ?? 0;
    }

    const dailyRows = Object.entries(dailyMap)
      .map(
        ([day, stats]) =>
          `<tr>
            <td style="padding:4px 8px;border:1px solid #ddd">${day}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${stats.count}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${fmt(stats.revenue)}</td>
          </tr>`,
      )
      .join('');

    const weekLabel = `${startOfWeek.toLocaleDateString('en-IN')} to ${now.toLocaleDateString('en-IN')}`;

    const html = `
      <h2 style="color:#2c3e50">Weekly Sales Report</h2>
      <p><strong>Period:</strong> ${weekLabel}</p>
      <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin-bottom:16px">
        <tr><td style="padding:4px 8px;font-weight:bold">Total Bills:</td><td style="padding:4px 8px">${sales.length}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold">Total Items Sold:</td><td style="padding:4px 8px">${totalItems}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold">Gross Revenue:</td><td style="padding:4px 8px">${fmt(totalRevenue)}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold">Total Discount:</td><td style="padding:4px 8px">${fmt(totalDiscount)}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold">Total GST Collected:</td><td style="padding:4px 8px">${fmt(totalGst)}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold">Avg Sale Value:</td><td style="padding:4px 8px">${fmt(avgSaleValue)}</td></tr>
      </table>
      <h3>Daily Breakdown</h3>
      <table style="border-collapse:collapse;width:60%;font-family:Arial,sans-serif;font-size:13px">
        <thead style="background:#f2f2f2">
          <tr>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Day</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Bills</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Revenue</th>
          </tr>
        </thead>
        <tbody>${dailyRows}</tbody>
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px">This is an automated report from Pharmacy ERP.</p>
    `;

    await sendEmail(ADMIN_EMAIL, `[Pharmacy ERP] Weekly Sales Report â€” ${weekLabel}`, html);
    console.log('[CronJob] Weekly sales report sent.');
  } catch (err) {
    console.error('[CronJob] Weekly Sales Report error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ---------------------------------------------------------------------------
// Job 4 â€” Monthly 1st, 7:00 AM: Monthly GST Summary
// Generate CGST/SGST/IGST summary grouped by GST rate for the previous month.
// ---------------------------------------------------------------------------
cron.schedule('0 7 1 * *', async () => {
  console.log('[CronJob] Running: Monthly GST Summary');
  try {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const monthLabel = startOfLastMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: 'COMPLETED',
        },
      },
      include: {
        medicine: true,
        sale: true,
      },
    });

    // Group by GST rate
    const gstGroups: Record<
      number,
      { taxableValue: number; cgst: number; sgst: number; igst: number; count: number }
    > = {};

    for (const item of saleItems) {
      const gstRate: number = item.medicine.gstRate ?? 12;
      const qty: number = item.quantity;
      const rate: number = item.sellingPrice;
      const discPct: number = item.discountPercent ?? 0;
      const taxable = qty * rate * (1 - discPct / 100);
      const totalGst = (taxable * gstRate) / 100;
      const cgst = totalGst / 2;
      const sgst = totalGst / 2;

      if (!gstGroups[gstRate]) {
        gstGroups[gstRate] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
      }
      gstGroups[gstRate].taxableValue += taxable;
      gstGroups[gstRate].cgst += cgst;
      gstGroups[gstRate].sgst += sgst;
      gstGroups[gstRate].count += 1;
    }

    const totalTaxable = Object.values(gstGroups).reduce((s, g) => s + g.taxableValue, 0);
    const totalCgst = Object.values(gstGroups).reduce((s, g) => s + g.cgst, 0);
    const totalSgst = Object.values(gstGroups).reduce((s, g) => s + g.sgst, 0);
    const totalTax = totalCgst + totalSgst;

    const tableRows = Object.entries(gstGroups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(
        ([rate, g]) =>
          `<tr>
            <td style="padding:4px 8px;border:1px solid #ddd">${rate}%</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${g.count}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${fmt(g.taxableValue)}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${fmt(g.cgst)}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${fmt(g.sgst)}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${fmt(g.igst)}</td>
            <td style="padding:4px 8px;border:1px solid #ddd">${fmt(g.cgst + g.sgst + g.igst)}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <h2 style="color:#2c3e50">Monthly GST Summary â€” ${monthLabel}</h2>
      <p>Below is the GST summary for all completed sales in <strong>${monthLabel}</strong>. Use this data to file your GSTR-3B return.</p>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">
        <thead style="background:#f2f2f2">
          <tr>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">GST Rate</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Line Items</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Taxable Value</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">CGST</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">SGST</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">IGST</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Total Tax</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot style="background:#f9f9f9;font-weight:bold">
          <tr>
            <td colspan="2" style="padding:6px 8px;border:1px solid #ddd">TOTAL</td>
            <td style="padding:6px 8px;border:1px solid #ddd">${fmt(totalTaxable)}</td>
            <td style="padding:6px 8px;border:1px solid #ddd">${fmt(totalCgst)}</td>
            <td style="padding:6px 8px;border:1px solid #ddd">${fmt(totalSgst)}</td>
            <td style="padding:6px 8px;border:1px solid #ddd">${fmt(0)}</td>
            <td style="padding:6px 8px;border:1px solid #ddd">${fmt(totalTax)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin-top:16px;color:#555">Please log in to the ERP portal to download GSTR-1 and GSTR-3B JSON files.</p>
      <p style="color:#888;font-size:12px">This is an automated report from Pharmacy ERP. Do not reply to this email.</p>
    `;

    await sendEmail(ADMIN_EMAIL, `[Pharmacy ERP] Monthly GST Summary â€” ${monthLabel}`, html);
    console.log('[CronJob] Monthly GST summary sent.');
  } catch (err) {
    console.error('[CronJob] Monthly GST Summary error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ---------------------------------------------------------------------------
// Job 5 â€” Every Hour: Clean Expired Redis Cache Keys
// Scans for keys with the app cache prefix that have already expired
// (Redis TTL = -1 means no expiry set â€” we clean those older than 1 hour).
// ---------------------------------------------------------------------------
cron.schedule('0 * * * *', async () => {
  console.log('[CronJob] Running: Redis Cache Cleanup');
  try {
    const redis = await getRedisClient();
    const SCAN_COUNT = 100;
    const KEY_PREFIX = 'pharma:cache:*';
    let cursor = 0;
    let deletedCount = 0;
    const now = Date.now();
    const MAX_IDLE_MS = 60 * 60 * 1000; // 1 hour

    do {
      const result = await redis.scan(cursor, { MATCH: KEY_PREFIX, COUNT: SCAN_COUNT });
      cursor = result.cursor;
      const keys = result.keys;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // Key has no TTL â€” check object idle time
          const idleSeconds = await redis.objectIdleTime(key);
          if (idleSeconds !== null && idleSeconds * 1000 > MAX_IDLE_MS) {
            await redis.del(key);
            deletedCount++;
          }
        }
        // TTL === -2 means key already expired/gone; ttl > 0 means key is still live â€” skip both
      }
    } while (cursor !== 0);

    console.log(`[CronJob] Redis cleanup complete. Deleted ${deletedCount} stale cache keys.`);
  } catch (err) {
    console.error('[CronJob] Redis Cache Cleanup error:', err);
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
process.on('SIGTERM', async () => {
  console.log('[CronJob] Shutting down...');
  await prisma.$disconnect();
  if (redisClient.isOpen) await redisClient.quit();
});

export {};

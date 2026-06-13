/**
 * One-off importer: loads data/medicine_dataset.csv into the `medicine_dataset` table.
 * Run from backend/:  npx tsx prisma/import-medicine-dataset.ts
 *
 * CSV columns: <unnamed index>, id, name, price(₹), manufacturer, type, packing, generic_name
 * Uses raw batched INSERTs (ON CONFLICT DO NOTHING) so it works without regenerating
 * the Prisma client and is safe to re-run.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, '../../data/medicine_dataset.csv');
const COLS = 7; // id, name, price, manufacturer, type, packing, generic_name
const BATCH_ROWS = 1000;

type Row = [number, string, string | null, string | null, string | null, string | null, string | null];

function clean(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' || s.toLowerCase() === 'nan' ? null : s;
}

function parsePrice(v: unknown): string | null {
  const s = clean(v);
  if (s === null) return null;
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

async function flush(batch: Row[]): Promise<number> {
  if (batch.length === 0) return 0;
  const placeholders: string[] = [];
  const values: unknown[] = [];
  batch.forEach((row, i) => {
    const b = i * COLS;
    placeholders.push(
      `($${b + 1}, $${b + 2}, $${b + 3}::decimal, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7})`
    );
    values.push(...row);
  });
  const sql =
    `INSERT INTO "medicine_dataset" ("id","name","price","manufacturer","type","packing","generic_name") ` +
    `VALUES ${placeholders.join(',')} ON CONFLICT ("id") DO NOTHING`;
  return prisma.$executeRawUnsafe(sql, ...values);
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) throw new Error(`CSV not found at ${CSV_PATH}`);
  console.log('Importing from', CSV_PATH);

  let batch: Row[] = [];
  let inserted = 0;
  let read = 0;
  let skipped = 0;

  const stream = fs.createReadStream(CSV_PATH).pipe(csv());

  for await (const rec of stream as AsyncIterable<Record<string, string>>) {
    read++;
    const idRaw = clean(rec['id']);
    const name = clean(rec['name']);
    const id = idRaw === null ? NaN : parseInt(idRaw, 10);
    if (!Number.isInteger(id) || name === null) {
      skipped++;
      continue;
    }
    batch.push([
      id,
      name,
      parsePrice(rec['price(₹)']),
      clean(rec['manufacturer']),
      clean(rec['type']),
      clean(rec['packing']),
      clean(rec['generic_name']),
    ]);

    if (batch.length >= BATCH_ROWS) {
      inserted += await flush(batch);
      batch = [];
      if (inserted % 20000 === 0) console.log(`  inserted ~${inserted} rows...`);
    }
  }
  inserted += await flush(batch);

  console.log(`Done. Read ${read} rows, skipped ${skipped}, inserted ${inserted}.`);
  const total: any = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM "medicine_dataset"`);
  console.log('Total rows now in medicine_dataset:', total[0].c);
}

main()
  .catch((e) => {
    console.error('IMPORT FAILED:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

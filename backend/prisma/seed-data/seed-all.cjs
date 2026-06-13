const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DIR = __dirname;
const PRODUCTS_CSV = 'C:/Users/admin/Downloads/medicine_dataset.csv';
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function withRetry(fn, label, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === tries - 1) throw e;
      process.stdout.write(`\n  retry ${label} #${i + 1}: ${String(e.message || e).slice(0, 70)}\n`);
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

async function batchInsert(label, records, model, size = 2000) {
  for (let i = 0; i < records.length; i += size) {
    const slice = records.slice(i, i + size);
    await withRetry(() => model.createMany({ data: slice, skipDuplicates: true }), `${label}@${i}`);
    process.stdout.write(`\r  ${label}: ${Math.min(i + size, records.length)}/${records.length}   `);
  }
  process.stdout.write('\n');
}

const del = (model) => withRetry(() => model.deleteMany({}), 'delete');

async function main() {
  const companies = JSON.parse(fs.readFileSync(path.join(DIR, 'companies.json'), 'utf8'));
  const generics = JSON.parse(fs.readFileSync(path.join(DIR, 'generics.json'), 'utf8'));
  const companyCode = new Map(companies.map((c) => [c.name.toLowerCase(), c.code]));
  const genericCode = new Map(generics.map((g) => [g.name.toLowerCase(), g.code]));
  const usedCodes = new Set(companies.map((c) => c.code));

  // ---- parse products & resolve missing companies ----
  console.log('Parsing products CSV...');
  const rows = parseCSV(fs.readFileSync(PRODUCTS_CSV, 'utf8'));
  rows.shift();
  const data = rows.filter((r) => r.length >= 6 && r[0].trim());
  console.log('  product rows:', data.length);

  const extraCompanies = [];
  for (const r of data) {
    const cn = norm(r[2]);
    if (cn && !companyCode.has(cn.toLowerCase())) {
      let base = cn.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'XX';
      let code = base; let n = 1;
      while (usedCodes.has(code)) code = (base.slice(0, 4) + (n++)).slice(0, 5);
      usedCodes.add(code); companyCode.set(cn.toLowerCase(), code);
      extraCompanies.push({ name: cn, code });
    }
  }
  if (extraCompanies.length) console.log('  auto-added companies:', extraCompanies.length, JSON.stringify(extraCompanies));

  // ---- 1. companies ----
  console.log('Seeding companies...');
  await del(prisma.company);
  await batchInsert('companies', [...companies, ...extraCompanies].map((c) => ({ name: c.name, code: c.code })), prisma.company);

  // ---- 2. generic groups ----
  console.log('Seeding generic groups...');
  await del(prisma.genericGroup);
  await batchInsert('generics', generics.map((g) => ({ name: g.name, code: g.code })), prisma.genericGroup);

  // ---- 3. wipe products + transaction history (keep customers/suppliers/doctors/users) ----
  console.log('Wiping products + transactions...');
  await del(prisma.payment);
  await withRetry(() => prisma.loyaltyTransaction.deleteMany({}), 'delete-loyalty').catch(() => {});
  await del(prisma.saleItem);
  await del(prisma.sale);
  await del(prisma.purchaseItem);
  await del(prisma.purchase);
  await del(prisma.stockAdjustment);
  await del(prisma.medicineBatch);
  await del(prisma.medicine);

  // ---- 4. products ----
  console.log('Building product records...');
  const records = data.map((r, i) => {
    const company = norm(r[2]);
    const generic = norm(r[5]);
    const price = parseFloat(r[1]) || 0;
    return {
      name: norm(r[0]),
      itemType: 'medicine',
      genericName: generic || null,
      genericCode: genericCode.get(generic.toLowerCase()) ?? null,
      manufacturer: company || null,
      companyCode: companyCode.get(company.toLowerCase()) ?? null,
      category: norm(r[3]).toLowerCase() || 'allopathy',
      packing: norm(r[4]) || null,
      hsnCode: '3004',
      mrp: price,
      saleRate: price,
      purchaseRate: 0,
      gstRate: 12,
      productCode: i + 1,
      scheduleType: 'OTC',
      isActive: true,
    };
  });
  console.log('Seeding products...');
  await batchInsert('products', records, prisma.medicine, 1500);

  // ---- summary ----
  const [c, g, m] = await Promise.all([prisma.company.count(), prisma.genericGroup.count(), prisma.medicine.count()]);
  console.log(`\nDONE → companies: ${c}, generics: ${g}, products: ${m}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error('SEED ERROR:', e); await prisma.$disconnect(); process.exit(1); });

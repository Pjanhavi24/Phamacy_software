import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Store
  const store = await prisma.store.upsert({
    where: { gstin: '27AABCU9603R1ZX' },
    update: {},
    create: {
      name: 'MedCare Pharmacy',
      gstin: '27AABCU9603R1ZX',
      licenseNumber: 'DL-20B-000123',
      address: '42, Wellness Street, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400058',
      phone: '+91-9876543210',
      email: 'info@medcarepharmacy.com',
    },
  });
  console.log(`Store: ${store.name}`);

  // Admin user
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pharmacy.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@pharmacy.com',
      password: adminHash,
      role: 'ADMIN',
      phone: '+91-9000000001',
      storeId: store.id,
      isActive: true,
    },
  });
  console.log(`Admin: ${admin.email}`);

  // Pharmacist user
  const pharmaHash = await bcrypt.hash('Pharma@123', 12);
  const pharmacist = await prisma.user.upsert({
    where: { email: 'pharmacist@pharmacy.com' },
    update: {},
    create: {
      name: 'Ravi Kumar',
      email: 'pharmacist@pharmacy.com',
      password: pharmaHash,
      role: 'PHARMACIST',
      phone: '+91-9000000002',
      storeId: store.id,
      isActive: true,
    },
  });
  console.log(`Pharmacist: ${pharmacist.email}`);

  // Suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { gstin: '27AAACA1234B1ZP' },
    update: {},
    create: {
      name: 'Apex Pharma Distributors',
      gstin: '27AAACA1234B1ZP',
      phone: '+91-9111222333',
      email: 'orders@apexpharma.in',
      address: '101, Trade Centre, BKC, Mumbai',
      contactPerson: 'Suresh Mehta',
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { gstin: '07AABCL5678D1ZQ' },
    update: {},
    create: {
      name: 'LifeLine Medical Supplies',
      gstin: '07AABCL5678D1ZQ',
      phone: '+91-9222333444',
      email: 'supply@lifeline.in',
      address: '45, Pharma Hub, Navi Mumbai',
      contactPerson: 'Anita Sharma',
    },
  });
  console.log(`Suppliers created: ${supplier1.name}, ${supplier2.name}`);

  // Doctors
  const doctor1 = await prisma.doctor.upsert({
    where: { registrationNumber: 'MH-12345' },
    update: {},
    create: {
      name: 'Dr. Priya Sharma',
      registrationNumber: 'MH-12345',
      specialization: 'General Physician',
      phone: '+91-9333444555',
      clinicAddress: '12, Health Tower, Bandra, Mumbai',
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { registrationNumber: 'MH-67890' },
    update: {},
    create: {
      name: 'Dr. Rajesh Patel',
      registrationNumber: 'MH-67890',
      specialization: 'Cardiologist',
      phone: '+91-9444555666',
      clinicAddress: 'Heart Care Clinic, Juhu, Mumbai',
    },
  });
  console.log(`Doctors: ${doctor1.name}, ${doctor2.name}`);

  // Customers
  const customers = [
    { name: 'Rahul Sharma', phone: '9876543210', age: 45, gender: 'MALE' as const, bloodGroup: 'O_POSITIVE', chronicDiseases: ['Diabetes', 'Hypertension'] },
    { name: 'Priya Mehta', phone: '9123456780', age: 32, gender: 'FEMALE' as const, bloodGroup: 'A_NEGATIVE', chronicDiseases: [] },
    { name: 'Anil Kumar', phone: '9001234567', age: 60, gender: 'MALE' as const, bloodGroup: 'B_POSITIVE', chronicDiseases: ['Asthma'] },
    { name: 'Sunita Rao', phone: '9876001234', age: 28, gender: 'FEMALE' as const, bloodGroup: 'AB_POSITIVE', chronicDiseases: [] },
    { name: 'Mohan Das', phone: '9700123456', age: 55, gender: 'MALE' as const, bloodGroup: 'O_NEGATIVE', chronicDiseases: ['Arthritis'] },
  ];

  let custIdx = 0;
  for (const c of customers) {
    custIdx++;
    await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: {
        ...c,
        customerCode: `CUST-${String(custIdx).padStart(5, '0')}`,
        address: 'Mumbai, Maharashtra',
        loyaltyPoints: Math.floor(Math.random() * 500),
      },
    });
  }
  console.log(`Created ${customers.length} customers`);

  // Sample medicines
  const medicines = [
    { name: 'Paracetamol 500mg', genericName: 'Paracetamol', saltComposition: 'Paracetamol 500mg', brandName: 'Calpol', manufacturer: 'GSK', category: 'TABLET', scheduleType: 'OTC' as const, hsnCode: '30049099', gstRate: 12, barcode: '8901234567890', mrp: 25.00, purchaseRate: 15.00, saleRate: 22.00, margin: 46.67, unitsPerPack: 15, minLevel: 50, reorderLevel: 100, maxLevel: 500 },
    { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', saltComposition: 'Amoxicillin trihydrate 500mg', brandName: 'Mox 500', manufacturer: 'Ranbaxy', category: 'TABLET', scheduleType: 'H' as const, hsnCode: '30041011', gstRate: 12, barcode: '8901234567891', mrp: 120.00, purchaseRate: 75.00, saleRate: 108.00, margin: 44.00, unitsPerPack: 10, minLevel: 20, reorderLevel: 50, maxLevel: 200 },
    { name: 'Metformin 500mg', genericName: 'Metformin', saltComposition: 'Metformin HCl 500mg', brandName: 'Glycomet', manufacturer: 'USV', category: 'TABLET', scheduleType: 'H' as const, hsnCode: '30049051', gstRate: 12, barcode: '8901234567892', mrp: 45.00, purchaseRate: 28.00, saleRate: 40.00, margin: 42.86, unitsPerPack: 20, minLevel: 30, reorderLevel: 60, maxLevel: 300 },
    { name: 'Atorvastatin 10mg', genericName: 'Atorvastatin', saltComposition: 'Atorvastatin Calcium 10mg', brandName: 'Lipitor', manufacturer: 'Pfizer', category: 'TABLET', scheduleType: 'H' as const, hsnCode: '30049062', gstRate: 12, barcode: '8901234567893', mrp: 180.00, purchaseRate: 110.00, saleRate: 162.00, margin: 47.27, unitsPerPack: 15, minLevel: 20, reorderLevel: 40, maxLevel: 150 },
    { name: 'Omeprazole 20mg', genericName: 'Omeprazole', saltComposition: 'Omeprazole 20mg', brandName: 'Prilosec', manufacturer: 'AstraZeneca', category: 'TABLET', scheduleType: 'OTC' as const, hsnCode: '30049099', gstRate: 12, barcode: '8901234567894', mrp: 95.00, purchaseRate: 58.00, saleRate: 85.00, margin: 46.55, unitsPerPack: 14, minLevel: 25, reorderLevel: 50, maxLevel: 200 },
    { name: 'Cetirizine 10mg', genericName: 'Cetirizine', saltComposition: 'Cetirizine HCl 10mg', brandName: 'Zyrtec', manufacturer: 'UCB', category: 'TABLET', scheduleType: 'OTC' as const, hsnCode: '30049099', gstRate: 12, barcode: '8901234567895', mrp: 35.00, purchaseRate: 20.00, saleRate: 31.50, margin: 57.50, unitsPerPack: 10, minLevel: 40, reorderLevel: 80, maxLevel: 400 },
    { name: 'Vitamin D3 60000 IU', genericName: 'Cholecalciferol', saltComposition: 'Vitamin D3 60000 IU', brandName: 'Calcirol', manufacturer: 'Cadila', category: 'TABLET', scheduleType: 'OTC' as const, hsnCode: '29362200', gstRate: 12, barcode: '8901234567896', mrp: 55.00, purchaseRate: 32.00, saleRate: 49.50, margin: 54.69, unitsPerPack: 4, minLevel: 30, reorderLevel: 60, maxLevel: 250 },
    { name: 'Azithromycin 500mg', genericName: 'Azithromycin', saltComposition: 'Azithromycin 500mg', brandName: 'Zithromax', manufacturer: 'Pfizer', category: 'TABLET', scheduleType: 'H' as const, hsnCode: '30041019', gstRate: 12, barcode: '8901234567897', mrp: 145.00, purchaseRate: 88.00, saleRate: 130.50, margin: 48.30, unitsPerPack: 3, minLevel: 15, reorderLevel: 30, maxLevel: 120 },
    { name: 'Losartan 50mg', genericName: 'Losartan', saltComposition: 'Losartan Potassium 50mg', brandName: 'Cozaar', manufacturer: 'MSD', category: 'TABLET', scheduleType: 'H' as const, hsnCode: '30049062', gstRate: 12, barcode: '8901234567898', mrp: 130.00, purchaseRate: 78.00, saleRate: 117.00, margin: 50.00, unitsPerPack: 14, minLevel: 20, reorderLevel: 40, maxLevel: 160 },
    { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', saltComposition: 'Pantoprazole Sodium 40mg', brandName: 'Pantop', manufacturer: 'Aristo', category: 'TABLET', scheduleType: 'OTC' as const, hsnCode: '30049099', gstRate: 12, barcode: '8901234567899', mrp: 85.00, purchaseRate: 50.00, saleRate: 76.50, margin: 53.00, unitsPerPack: 15, minLevel: 30, reorderLevel: 60, maxLevel: 240 },
  ];

  const addedMeds: string[] = [];
  for (const med of medicines) {
    const m = await prisma.medicine.upsert({
      where: { barcode: med.barcode },
      update: {},
      create: med,
    });
    addedMeds.push(m.id);
  }
  console.log(`Created ${medicines.length} medicines`);

  // Add stock batches
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);

  for (let i = 0; i < addedMeds.length; i++) {
    await prisma.medicineBatch.create({
      data: {
        medicineId: addedMeds[i]!,
        batchNumber: `B2024-${String(i + 1).padStart(4, '0')}`,
        expiryDate,
        purchaseRate: medicines[i]!.purchaseRate,
        mrp: medicines[i]!.mrp,
        quantity: 100 + i * 10,
        availableQty: 100 + i * 10,
        saleRate: medicines[i]!.saleRate,
        storeId: store.id,
      },
    });
  }
  console.log('Stock batches created');

  console.log('\n=== Seed Complete ===');
  console.log('Login: admin@pharmacy.com / Admin@123');
  console.log('Login: pharmacist@pharmacy.com / Pharma@123');
}

main()
  .catch((e) => { console.error('Seeding error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

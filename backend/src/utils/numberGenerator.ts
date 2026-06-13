import { prisma } from '../db/prisma';

export const generateInvoiceNumber = async (prefix: string = 'INV'): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { name: `invoice_${prefix}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `${prefix}-${year}${month}-${String(counter.value).padStart(6, '0')}`;
};

export const generatePurchaseNumber = async (prefix: string = 'PO'): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { name: `purchase_${prefix}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `${prefix}-${year}${month}-${String(counter.value).padStart(6, '0')}`;
};

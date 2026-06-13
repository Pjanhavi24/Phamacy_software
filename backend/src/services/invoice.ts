import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import { Writable } from 'stream';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SaleItem {
  sNo: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  qty: number;
  mrp: number;
  rate: number;
  discountPercent: number;
  gstPercent: number;
  amount: number;
}

interface InvoiceData {
  store: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    gstNumber: string;
    dlNumber: string;
  };
  customer: {
    name: string;
    phone: string;
    address: string;
  } | null;
  doctor: {
    name: string;
    specialization: string;
  } | null;
  invoice: {
    invoiceNumber: string;
    date: string;
    paymentMethod: string;
  };
  items: SaleItem[];
  summary: {
    subtotal: number;
    totalDiscount: number;
    cgst: number;
    sgst: number;
    igst: number;
    roundOff: number;
    total: number;
    amountPaid: number;
    changeReturned: number;
  };
}

// ---------------------------------------------------------------------------
// generateInvoiceNumber
// ---------------------------------------------------------------------------
/**
 * Generates a formatted, sequential invoice number for the given store.
 * Format: PHR-{YYYY}-{000000}
 * Example: PHR-2024-001234
 */
export async function generateInvoiceNumber(storeId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PHR-${year}-`;

  // Count existing invoices for this store in the current year to derive sequence
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const count = await prisma.sale.count({
    where: {
      storeId,
      createdAt: { gte: startOfYear },
    },
  });

  const sequence = String(count + 1).padStart(6, '0');
  return `${prefix}${sequence}`;
}

// ---------------------------------------------------------------------------
// fetchSaleData (internal helper)
// ---------------------------------------------------------------------------
async function fetchSaleData(saleId: string): Promise<InvoiceData> {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: {
      store: true,
      customer: true,
      doctor: true,
      items: {
        include: {
          medicine: true,
          batch: true,
        },
      },
    },
  });

  const items: SaleItem[] = sale.items.map((item: any, idx: number) => {
    const gstPercent = item.medicine.gstRate ?? 12;
    const baseAmount = item.quantity * item.sellingPrice;
    const discountAmount = (baseAmount * (item.discountPercent ?? 0)) / 100;
    const taxableAmount = baseAmount - discountAmount;
    const amount = taxableAmount;

    return {
      sNo: idx + 1,
      medicineName: `${item.medicine.name} (${item.medicine.strength})`,
      batchNumber: item.batch?.batchNumber ?? 'N/A',
      expiryDate: item.batch?.expiryDate
        ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })
        : 'N/A',
      qty: item.quantity,
      mrp: item.medicine.mrp,
      rate: item.sellingPrice,
      discountPercent: item.discountPercent ?? 0,
      gstPercent,
      amount,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const totalDiscount = items.reduce((s, i) => s + (i.qty * i.rate * i.discountPercent) / 100, 0);
  const taxableTotal = subtotal - totalDiscount;
  const totalGst = items.reduce((s, i) => {
    const taxable = i.qty * i.rate * (1 - i.discountPercent / 100);
    return s + (taxable * i.gstPercent) / 100;
  }, 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const rawTotal = taxableTotal + totalGst;
  const roundOff = Math.round(rawTotal) - rawTotal;
  const total = Math.round(rawTotal);

  return {
    store: {
      name: sale.store.name,
      address: sale.store.address,
      city: sale.store.city,
      state: sale.store.state,
      pincode: sale.store.pincode,
      phone: sale.store.phone,
      email: sale.store.email,
      gstNumber: sale.store.gstNumber,
      dlNumber: sale.store.dlNumber ?? '',
    },
    customer: sale.customer
      ? {
          name: sale.customer.name,
          phone: sale.customer.phone,
          address: sale.customer.address ?? '',
        }
      : null,
    doctor: sale.doctor
      ? {
          name: sale.doctor.name,
          specialization: sale.doctor.specialization,
        }
      : null,
    invoice: {
      invoiceNumber: sale.invoiceNumber,
      date: new Date(sale.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      paymentMethod: sale.paymentMethod ?? 'CASH',
    },
    items,
    summary: {
      subtotal,
      totalDiscount,
      cgst,
      sgst,
      igst: 0,
      roundOff,
      total,
      amountPaid: sale.amountPaid ?? total,
      changeReturned: (sale.amountPaid ?? total) - total,
    },
  };
}

// ---------------------------------------------------------------------------
// generateInvoicePDF  (A4 format)
// ---------------------------------------------------------------------------
/**
 * Generates a full A4 invoice PDF for a sale and returns it as a Buffer.
 */
export async function generateInvoicePDF(saleId: string): Promise<Buffer> {
  const data = await fetchSaleData(saleId);

  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 80; // account for margins
    const col = (x: number) => 40 + x;

    // ---- Store Header ----
    doc.font('Helvetica-Bold').fontSize(18).text(data.store.name, 40, 40, { align: 'center', width: pageWidth });
    doc.font('Helvetica').fontSize(9)
      .text(`${data.store.address}, ${data.store.city}, ${data.store.state} - ${data.store.pincode}`, { align: 'center', width: pageWidth })
      .text(`Ph: ${data.store.phone}  |  Email: ${data.store.email}`, { align: 'center', width: pageWidth })
      .text(`GSTIN: ${data.store.gstNumber}  |  Drug Licence: ${data.store.dlNumber}`, { align: 'center', width: pageWidth });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // ---- Invoice Title ----
    doc.font('Helvetica-Bold').fontSize(13).text('TAX INVOICE', { align: 'center', width: pageWidth });
    doc.moveDown(0.5);

    // ---- Invoice Meta + Customer Details ----
    const metaTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).text('Invoice Details:', col(0), metaTop);
    doc.font('Helvetica').fontSize(9)
      .text(`Invoice No : ${data.invoice.invoiceNumber}`, col(0))
      .text(`Date       : ${data.invoice.date}`, col(0))
      .text(`Payment    : ${data.invoice.paymentMethod}`, col(0));

    const rightCol = doc.page.width / 2;
    doc.font('Helvetica-Bold').fontSize(9).text('Billed To:', rightCol, metaTop);
    doc.font('Helvetica').fontSize(9);
    if (data.customer) {
      doc.text(data.customer.name, rightCol)
        .text(`Ph: ${data.customer.phone}`, rightCol);
      if (data.customer.address) doc.text(data.customer.address, rightCol);
    } else {
      doc.text('Walk-in Customer', rightCol);
    }
    if (data.doctor) {
      doc.text(`Dr: ${data.doctor.name} (${data.doctor.specialization})`, rightCol);
    }

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // ---- Items Table Header ----
    const tableTop = doc.y;
    const cols = {
      sno: 40, name: 60, batch: 220, expiry: 280, qty: 330, mrp: 370, rate: 410, disc: 445, gst: 480, amount: 520,
    };
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('#', cols.sno, tableTop);
    doc.text('Medicine', cols.name, tableTop);
    doc.text('Batch', cols.batch, tableTop);
    doc.text('Expiry', cols.expiry, tableTop);
    doc.text('Qty', cols.qty, tableTop);
    doc.text('MRP', cols.mrp, tableTop);
    doc.text('Rate', cols.rate, tableTop);
    doc.text('Disc%', cols.disc, tableTop);
    doc.text('GST%', cols.gst, tableTop);
    doc.text('Amount', cols.amount, tableTop);

    const headerBottomY = tableTop + 14;
    doc.moveTo(40, headerBottomY).lineTo(doc.page.width - 40, headerBottomY).stroke();

    // ---- Items Table Rows ----
    let rowY = headerBottomY + 4;
    doc.font('Helvetica').fontSize(8);

    for (const item of data.items) {
      const itemAmount = (item.qty * item.rate * (1 - item.discountPercent / 100)).toFixed(2);
      doc.text(String(item.sNo), cols.sno, rowY);
      doc.text(item.medicineName, cols.name, rowY, { width: 155, ellipsis: true });
      doc.text(item.batchNumber, cols.batch, rowY);
      doc.text(item.expiryDate, cols.expiry, rowY);
      doc.text(String(item.qty), cols.qty, rowY);
      doc.text(item.mrp.toFixed(2), cols.mrp, rowY);
      doc.text(item.rate.toFixed(2), cols.rate, rowY);
      doc.text(`${item.discountPercent}%`, cols.disc, rowY);
      doc.text(`${item.gstPercent}%`, cols.gst, rowY);
      doc.text(itemAmount, cols.amount, rowY);
      rowY += 16;

      // Page break if needed
      if (rowY > doc.page.height - 200) {
        doc.addPage();
        rowY = 40;
      }
    }

    doc.moveTo(40, rowY + 2).lineTo(doc.page.width - 40, rowY + 2).stroke();
    rowY += 12;

    // ---- Summary ----
    const summaryX = 380;
    doc.font('Helvetica').fontSize(9);
    const summaryLines: [string, string][] = [
      ['Subtotal:', `â‚¹ ${data.summary.subtotal.toFixed(2)}`],
      ['Discount:', `- â‚¹ ${data.summary.totalDiscount.toFixed(2)}`],
      ['CGST:', `â‚¹ ${data.summary.cgst.toFixed(2)}`],
      ['SGST:', `â‚¹ ${data.summary.sgst.toFixed(2)}`],
    ];
    if (data.summary.igst > 0) summaryLines.push(['IGST:', `â‚¹ ${data.summary.igst.toFixed(2)}`]);
    summaryLines.push(['Round Off:', `â‚¹ ${data.summary.roundOff.toFixed(2)}`]);

    for (const [label, value] of summaryLines) {
      doc.text(label, summaryX, rowY, { width: 90, align: 'right' });
      doc.text(value, summaryX + 95, rowY, { width: 80, align: 'right' });
      rowY += 14;
    }

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('TOTAL:', summaryX, rowY, { width: 90, align: 'right' });
    doc.text(`â‚¹ ${data.summary.total.toFixed(2)}`, summaryX + 95, rowY, { width: 80, align: 'right' });
    rowY += 16;

    doc.font('Helvetica').fontSize(9);
    doc.text('Amount Paid:', summaryX, rowY, { width: 90, align: 'right' });
    doc.text(`â‚¹ ${data.summary.amountPaid.toFixed(2)}`, summaryX + 95, rowY, { width: 80, align: 'right' });
    rowY += 14;
    if (data.summary.changeReturned > 0) {
      doc.text('Change Returned:', summaryX, rowY, { width: 90, align: 'right' });
      doc.text(`â‚¹ ${data.summary.changeReturned.toFixed(2)}`, summaryX + 95, rowY, { width: 80, align: 'right' });
      rowY += 14;
    }

    // ---- Footer ----
    const footerY = doc.page.height - 80;
    doc.moveTo(40, footerY).lineTo(doc.page.width - 40, footerY).stroke();
    doc.font('Helvetica').fontSize(8)
      .text('* Goods once sold will not be taken back. Prices are inclusive of applicable taxes.', 40, footerY + 6, { width: pageWidth, align: 'center' })
      .text('Thank you for your patronage. Get well soon!', { align: 'center', width: pageWidth });

    doc.font('Helvetica-Bold').fontSize(8)
      .text('Authorised Signatory / Pharmacist', doc.page.width - 200, footerY + 6, { width: 160, align: 'center' });
    doc.font('Helvetica').fontSize(8)
      .text('(Signature)', doc.page.width - 200, footerY + 32, { width: 160, align: 'center' });

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// generateThermalBill  (80mm thermal format)
// ---------------------------------------------------------------------------
/**
 * Generates a compact 80mm thermal receipt for a sale and returns it as a Buffer.
 * Character width at 9pt on 80mm paper is approximately 46 characters.
 */
export async function generateThermalBill(saleId: string): Promise<Buffer> {
  const data = await fetchSaleData(saleId);
  const THERMAL_WIDTH = 226; // ~80mm in points
  const CHAR_WIDTH = 46;

  const divider = '-'.repeat(CHAR_WIDTH);
  const center = (text: string): string => {
    const pad = Math.max(0, Math.floor((CHAR_WIDTH - text.length) / 2));
    return ' '.repeat(pad) + text;
  };
  const row = (left: string, right: string): string => {
    const gap = Math.max(1, CHAR_WIDTH - left.length - right.length);
    return left + ' '.repeat(gap) + right;
  };

  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      margin: 6,
      size: [THERMAL_WIDTH, 800], // height will be clipped by content
    });

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.font('Courier-Bold').fontSize(10).text(center(data.store.name), { align: 'center' });
    doc.font('Courier').fontSize(7)
      .text(center(data.store.address), { align: 'center' })
      .text(center(`${data.store.city} - ${data.store.pincode}`), { align: 'center' })
      .text(center(`Tel: ${data.store.phone}`), { align: 'center' })
      .text(center(`GSTIN: ${data.store.gstNumber}`), { align: 'center' })
      .text(center(`DL: ${data.store.dlNumber}`), { align: 'center' });

    doc.font('Courier').fontSize(7).text(divider);
    doc.font('Courier-Bold').fontSize(8).text(center('TAX INVOICE'), { align: 'center' });
    doc.font('Courier').fontSize(7).text(divider);

    doc.font('Courier').fontSize(7)
      .text(`Bill No : ${data.invoice.invoiceNumber}`)
      .text(`Date    : ${data.invoice.date}`)
      .text(`Payment : ${data.invoice.paymentMethod}`);

    if (data.customer) {
      doc.text(`Patient : ${data.customer.name}`);
      doc.text(`Mobile  : ${data.customer.phone}`);
    } else {
      doc.text('Patient : Walk-in Customer');
    }
    if (data.doctor) {
      doc.text(`Doctor  : ${data.doctor.name}`);
    }

    doc.font('Courier').fontSize(7).text(divider);
    doc.font('Courier-Bold').fontSize(7)
      .text(row('MEDICINE (QTY x RATE)', 'AMT'));
    doc.font('Courier').fontSize(7).text(divider);

    for (const item of data.items) {
      const discountedRate = item.rate * (1 - item.discountPercent / 100);
      const lineTotal = (item.qty * discountedRate).toFixed(2);
      const nameStr = item.medicineName.substring(0, 28);
      const qtyRate = `${item.qty}x${discountedRate.toFixed(2)}`;
      doc.font('Courier').fontSize(7).text(nameStr);
      doc.text(row(`  Batch:${item.batchNumber} Exp:${item.expiryDate}  ${qtyRate}`, lineTotal));
      if (item.discountPercent > 0) {
        doc.text(`  Disc: ${item.discountPercent}%  GST: ${item.gstPercent}%`);
      } else {
        doc.text(`  GST: ${item.gstPercent}%`);
      }
    }

    doc.font('Courier').fontSize(7).text(divider);
    doc.font('Courier').fontSize(7)
      .text(row('Subtotal:', `${data.summary.subtotal.toFixed(2)}`))
      .text(row('Discount:', `${data.summary.totalDiscount.toFixed(2)}`))
      .text(row('CGST:', `${data.summary.cgst.toFixed(2)}`))
      .text(row('SGST:', `${data.summary.sgst.toFixed(2)}`))
      .text(row('Round Off:', `${data.summary.roundOff.toFixed(2)}`));

    doc.font('Courier').fontSize(7).text(divider);
    doc.font('Courier-Bold').fontSize(9).text(row('TOTAL:', `Rs.${data.summary.total.toFixed(2)}`));
    doc.font('Courier').fontSize(7).text(divider);

    doc.font('Courier').fontSize(7)
      .text(row('Amount Paid:', `${data.summary.amountPaid.toFixed(2)}`));
    if (data.summary.changeReturned > 0) {
      doc.text(row('Change Returned:', `${data.summary.changeReturned.toFixed(2)}`));
    }

    doc.font('Courier').fontSize(7).text(divider);
    doc.font('Courier').fontSize(7)
      .text(center('Thank you! Get well soon.'), { align: 'center' })
      .text(center('Goods once sold will not be taken back.'), { align: 'center' })
      .text(center('Prices inclusive of applicable taxes.'), { align: 'center' });
    doc.font('Courier').fontSize(7).text(divider);
    doc.font('Courier').fontSize(7)
      .text('Pharmacist Signature: ___________')
      .moveDown(1);

    doc.end();
  });
}

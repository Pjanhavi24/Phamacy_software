import PDFDocument from 'pdfkit';

export const generateInvoicePDF = async (sale: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice No: ${sale.invoiceNumber}`);
    doc.text(`Date: ${new Date(sale.saleDate).toLocaleDateString()}`);
    if (sale.customer) doc.text(`Customer: ${sale.customer.name} | ${sale.customer.phone}`);
    doc.moveDown();

    // Table header
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, doc.y, { width: 200, continued: true });
    doc.text('Qty', 250, doc.y, { width: 50, continued: true });
    doc.text('Price', 300, doc.y, { width: 80, continued: true });
    doc.text('Total', 380, doc.y);
    doc.font('Helvetica');
    doc.moveDown();

    for (const item of sale.items || []) {
      const y = doc.y;
      doc.text(item.medicine?.name || '', 50, y, { width: 200, continued: true });
      doc.text(item.quantity.toString(), 250, y, { width: 50, continued: true });
      doc.text(`Rs.${item.salePrice.toFixed(2)}`, 300, y, { width: 80, continued: true });
      doc.text(`Rs.${(item.quantity * item.salePrice).toFixed(2)}`, 380, y);
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    if (sale.discountAmount) doc.text(`Discount: Rs.${sale.discountAmount.toFixed(2)}`, { align: 'right' });
    if (sale.taxAmount) doc.text(`Tax: Rs.${sale.taxAmount.toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica-Bold').text(`Total: Rs.${sale.totalAmount.toFixed(2)}`, { align: 'right' });
    doc.text(`Payment Mode: ${sale.paymentMode}`, { align: 'right' });

    doc.end();
  });
};

export const generateReportPDF = async (title: string, data: any[], summary?: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    if (summary) {
      doc.fontSize(12).font('Helvetica-Bold').text('Summary');
      doc.font('Helvetica');
      Object.entries(summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });
      doc.moveDown();
    }

    doc.fontSize(10).text(`Total Records: ${data.length}`);
    doc.end();
  });
};

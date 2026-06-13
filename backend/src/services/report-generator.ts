import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { Writable } from "stream";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface SalesReportFilters {
  customerId?: string;
  medicineId?: string;
  storeId?: string;
  category?: string;
}

export interface SalesReportRow {
  invoiceNo: string;
  date: Date;
  customerName: string;
  medicineName: string;
  qty: number;
  mrp: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  store: string;
}

export interface GSTR1Invoice {
  invoiceNo: string;
  invoiceDate: string;
  customerGSTIN?: string;
  customerName: string;
  placeOfSupply: string;
  invoiceValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstRate: number;
  type: "B2B" | "B2C";
}

export interface GSTR3BData {
  gstin: string;
  period: string;
  outwardSupplies: {
    taxableValue: number;
    integratedTax: number;
    centralTax: number;
    stateTax: number;
    cess: number;
  };
  itcAvailed: {
    integratedTax: number;
    centralTax: number;
    stateTax: number;
    cess: number;
  };
  taxPayable: {
    integratedTax: number;
    centralTax: number;
    stateTax: number;
  };
  taxPaidThroughCash: {
    integratedTax: number;
    centralTax: number;
    stateTax: number;
  };
}

// Stub: Replace with actual DB queries
async function fetchSalesFromDB(_dateRange: DateRange, _filters: SalesReportFilters): Promise<SalesReportRow[]> {
  return [];
}

async function fetchPurchaseInvoicesFromDB(_month: number, _year: number): Promise<GSTR1Invoice[]> {
  return [];
}

export async function generateSalesReport(
  dateRange: DateRange,
  filters: SalesReportFilters
): Promise<{
  rows: SalesReportRow[];
  summary: {
    totalSales: number;
    totalGST: number;
    totalDiscount: number;
    invoiceCount: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
}> {
  const rows = await fetchSalesFromDB(dateRange, filters);

  const summary = rows.reduce(
    (acc, r) => ({
      totalSales: acc.totalSales + r.total,
      totalGST: acc.totalGST + r.cgst + r.sgst + r.igst,
      totalDiscount: acc.totalDiscount + (r.mrp * r.qty * r.discount) / 100,
      invoiceCount: acc.invoiceCount + 1,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
      igst: acc.igst + r.igst,
    }),
    { totalSales: 0, totalGST: 0, totalDiscount: 0, invoiceCount: 0, cgst: 0, sgst: 0, igst: 0 }
  );

  return { rows, summary };
}

export async function generateGSTR1(
  month: number,
  year: number,
  gstin: string
): Promise<object> {
  const invoices = await fetchPurchaseInvoicesFromDB(month, year);
  const fp = `${String(month).padStart(2, "0")}${year}`;

  const b2b = invoices
    .filter((inv) => inv.type === "B2B" && inv.customerGSTIN)
    .reduce((acc: Record<string, unknown[]>, inv) => {
      const key = inv.customerGSTIN!;
      if (!acc[key]) acc[key] = [];
      (acc[key] as unknown[]).push({
        inum: inv.invoiceNo,
        idt: inv.invoiceDate,
        val: inv.invoiceValue,
        pos: inv.placeOfSupply.substring(0, 2),
        rchrg: "N",
        inv_typ: "R",
        itms: [
          {
            num: 1,
            itm_det: {
              txval: inv.taxableValue,
              rt: inv.gstRate,
              camt: inv.cgst,
              samt: inv.sgst,
              iamt: inv.igst,
            },
          },
        ],
      });
      return acc;
    }, {});

  const b2bArray = Object.entries(b2b).map(([ctin, inv]) => ({ ctin, inv }));

  const b2cs = invoices
    .filter((inv) => inv.type === "B2C")
    .map((inv) => ({
      typ: "OE",
      pos: "29",
      rt: inv.gstRate,
      txval: inv.taxableValue,
      camt: inv.cgst,
      samt: inv.sgst,
      iamt: inv.igst,
    }));

  return { gstin, fp, b2b: b2bArray, b2cs };
}

export async function generateGSTR3B(
  month: number,
  year: number,
  gstin: string
): Promise<GSTR3BData> {
  const fp = `${String(month).padStart(2, "0")}${year}`;
  // Stub: compute from DB
  return {
    gstin,
    period: fp,
    outwardSupplies: {
      taxableValue: 0,
      integratedTax: 0,
      centralTax: 0,
      stateTax: 0,
      cess: 0,
    },
    itcAvailed: {
      integratedTax: 0,
      centralTax: 0,
      stateTax: 0,
      cess: 0,
    },
    taxPayable: {
      integratedTax: 0,
      centralTax: 0,
      stateTax: 0,
    },
    taxPaidThroughCash: {
      integratedTax: 0,
      centralTax: 0,
      stateTax: 0,
    },
  };
}

export async function exportToPDF(
  reportData: { title: string; headers: string[]; rows: (string | number)[][] },
  outputStream: Writable
): Promise<void> {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(outputStream);

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text(reportData.title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(9).font("Helvetica").text(`Generated: ${new Date().toLocaleString("en-IN")}`, { align: "right" });
  doc.moveDown();

  // Table header
  const colWidth = (doc.page.width - 80) / reportData.headers.length;
  let x = 40;
  let y = doc.y;

  doc.rect(40, y, doc.page.width - 80, 18).fill("#3b82f6");
  reportData.headers.forEach((h) => {
    doc.fontSize(8).font("Helvetica-Bold").fillColor("white").text(h, x + 3, y + 4, { width: colWidth - 6 });
    x += colWidth;
  });
  doc.fillColor("black");
  y += 20;

  // Table rows
  reportData.rows.forEach((row, idx) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    if (idx % 2 === 0) doc.rect(40, y - 1, doc.page.width - 80, 16).fill("#f8fafc");
    x = 40;
    row.forEach((cell) => {
      doc.fontSize(7).font("Helvetica").fillColor("#111").text(String(cell), x + 3, y + 2, { width: colWidth - 6 });
      x += colWidth;
    });
    y += 16;
  });

  doc.end();
}

export async function exportToExcel(
  reportData: { title: string; headers: string[]; rows: (string | number)[][] }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PharmERP";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(reportData.title.substring(0, 31));

  // Title row
  sheet.mergeCells(1, 1, 1, reportData.headers.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = reportData.title;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
  titleCell.alignment = { horizontal: "center" };

  // Generated date
  sheet.mergeCells(2, 1, 2, reportData.headers.length);
  const dateCell = sheet.getCell(2, 1);
  dateCell.value = `Generated: ${new Date().toLocaleString("en-IN")}`;
  dateCell.font = { size: 9, color: { argb: "FF6B7280" } };
  dateCell.alignment = { horizontal: "right" };

  // Header row
  const headerRow = sheet.getRow(4);
  reportData.headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
  });
  headerRow.height = 22;

  // Auto-fit columns
  sheet.columns = reportData.headers.map((h, i) => ({
    key: String(i),
    width: Math.max(h.length + 4, 12),
  }));

  // Data rows
  reportData.rows.forEach((row, rowIdx) => {
    const sheetRow = sheet.getRow(5 + rowIdx);
    row.forEach((cell, colIdx) => {
      const sheetCell = sheetRow.getCell(colIdx + 1);
      sheetCell.value = cell;
      if (rowIdx % 2 === 0) {
        sheetCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
      if (typeof cell === "number") {
        sheetCell.numFmt = "#,##0.00";
        sheetCell.alignment = { horizontal: "right" };
      }
    });
    sheetRow.commit();
  });

  // Total row
  const totalRow = sheet.getRow(5 + reportData.rows.length);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.font = { bold: true };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
  totalRow.commit();

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

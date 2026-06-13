import Decimal from 'decimal.js';

export type GSTSlab = 0 | 3 | 5 | 12 | 18 | 28;

export type GSTType = 'INTRASTATE' | 'INTERSTATE' | 'EXPORT';

export interface GSTBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  totalAmount: number;
  gstRate: number;
  gstType: GSTType;
  cessRate: number;
}

export interface LineItemGST {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  gstRate: GSTSlab;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
}

export interface GSTSummary {
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
  totalTax: number;
  grandTotal: number;
  gstType: GSTType;
  lineItems: LineItemGST[];
}

// GST slab rates for medicines (India)
export const MEDICINE_GST_SLABS: Record<string, GSTSlab> = {
  EXEMPT: 0,
  ESSENTIAL_MEDICINES: 5,
  GENERIC: 12,
  BRANDED: 12,
  AYURVEDIC: 12,
  MEDICAL_DEVICES: 12,
  SURGICAL: 18,
  COSMETIC: 18,
  LUXURY: 28,
};

// Cess rates for certain items
export const CESS_RATES: Record<string, number> = {
  DEFAULT: 0,
  TOBACCO: 160,
  AERATED_DRINKS: 12,
};

export const calculateGST = (
  taxableAmount: number,
  gstRate: GSTSlab,
  gstType: GSTType = 'INTRASTATE',
  cessRate: number = 0
): GSTBreakdown => {
  const amount = new Decimal(taxableAmount);
  const rate = new Decimal(gstRate);
  const cessRateDecimal = new Decimal(cessRate);

  const totalTaxAmount = amount.mul(rate).div(100);
  const cessAmount = amount.mul(cessRateDecimal).div(100);

  let cgst = new Decimal(0);
  let sgst = new Decimal(0);
  let igst = new Decimal(0);

  if (gstType === 'INTRASTATE') {
    const halfTax = totalTaxAmount.div(2);
    cgst = halfTax;
    sgst = halfTax;
  } else if (gstType === 'INTERSTATE' || gstType === 'EXPORT') {
    igst = totalTaxAmount;
  }

  const totalTax = totalTaxAmount.plus(cessAmount);
  const totalAmount = amount.plus(totalTax);

  return {
    taxableAmount: round2(amount.toNumber()),
    cgst: round2(cgst.toNumber()),
    sgst: round2(sgst.toNumber()),
    igst: round2(igst.toNumber()),
    cess: round2(cessAmount.toNumber()),
    totalTax: round2(totalTax.toNumber()),
    totalAmount: round2(totalAmount.toNumber()),
    gstRate,
    gstType,
    cessRate,
  };
};

export const calculateLineItemGST = (
  item: {
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    gstRate: GSTSlab;
    cessRate?: number;
  },
  gstType: GSTType = 'INTRASTATE'
): LineItemGST => {
  const grossAmount = new Decimal(item.quantity).mul(item.unitPrice);
  const discountAmount = grossAmount.mul(item.discount || 0).div(100);
  const taxableAmount = grossAmount.minus(discountAmount);

  const gstBreakdown = calculateGST(
    taxableAmount.toNumber(),
    item.gstRate,
    gstType,
    item.cessRate || 0
  );

  return {
    itemId: item.itemId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
    taxableAmount: gstBreakdown.taxableAmount,
    gstRate: item.gstRate,
    cgst: gstBreakdown.cgst,
    sgst: gstBreakdown.sgst,
    igst: gstBreakdown.igst,
    cess: gstBreakdown.cess,
    totalAmount: gstBreakdown.totalAmount,
  };
};

export const calculateGSTSummary = (
  items: Array<{
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    gstRate: GSTSlab;
    cessRate?: number;
  }>,
  gstType: GSTType = 'INTRASTATE'
): GSTSummary => {
  const lineItems = items.map((item) => calculateLineItemGST(item, gstType));

  const subTotal = round2(lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  const totalDiscount = round2(lineItems.reduce((sum, i) => {
    const gross = i.quantity * i.unitPrice;
    return sum + gross * (i.discount / 100);
  }, 0));
  const totalTaxableAmount = round2(lineItems.reduce((sum, i) => sum + i.taxableAmount, 0));
  const totalCGST = round2(lineItems.reduce((sum, i) => sum + i.cgst, 0));
  const totalSGST = round2(lineItems.reduce((sum, i) => sum + i.sgst, 0));
  const totalIGST = round2(lineItems.reduce((sum, i) => sum + i.igst, 0));
  const totalCess = round2(lineItems.reduce((sum, i) => sum + i.cess, 0));
  const totalTax = round2(totalCGST + totalSGST + totalIGST + totalCess);
  const grandTotal = round2(totalTaxableAmount + totalTax);

  return {
    subTotal,
    totalDiscount,
    totalTaxableAmount,
    totalCGST,
    totalSGST,
    totalIGST,
    totalCess,
    totalTax,
    grandTotal,
    gstType,
    lineItems,
  };
};

export const calculateCess = (
  taxableAmount: number,
  cessRate: number
): number => {
  return round2(new Decimal(taxableAmount).mul(cessRate).div(100).toNumber());
};

export const reverseCalculateGST = (
  totalAmount: number,
  gstRate: GSTSlab,
  gstType: GSTType = 'INTRASTATE',
  cessRate: number = 0
): GSTBreakdown => {
  const total = new Decimal(totalAmount);
  const rate = new Decimal(gstRate);
  const cessRateDecimal = new Decimal(cessRate);

  // taxable = total / (1 + rate/100 + cessRate/100)
  const divisor = new Decimal(1)
    .plus(rate.div(100))
    .plus(cessRateDecimal.div(100));

  const taxableAmount = total.div(divisor);
  return calculateGST(taxableAmount.toNumber(), gstRate, gstType, cessRate);
};

// Validate GST number (India GSTIN format)
export const validateGSTNumber = (gstin: string): boolean => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.toUpperCase());
};

// Format GSTIN for display
export const formatGSTNumber = (gstin: string): string => {
  const upper = gstin.toUpperCase().replace(/\s/g, '');
  if (!validateGSTNumber(upper)) {
    throw new Error(`Invalid GSTIN format: ${gstin}`);
  }
  // Format: XX-AAAAA9999A-9-A-Z-9
  return `${upper.slice(0, 2)}-${upper.slice(2, 12)}-${upper.slice(12, 13)}-${upper.slice(13, 14)}-${upper.slice(14, 15)}-${upper.slice(15)}`;
};

// Extract state code from GSTIN
export const getStateCodeFromGSTIN = (gstin: string): string => {
  return gstin.slice(0, 2);
};

// Determine GST type based on supplier and buyer state codes
export const determineGSTType = (
  supplierStateCode: string,
  buyerStateCode: string,
  isExport: boolean = false
): GSTType => {
  if (isExport) return 'EXPORT';
  return supplierStateCode === buyerStateCode ? 'INTRASTATE' : 'INTERSTATE';
};

// Indian state codes map
export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

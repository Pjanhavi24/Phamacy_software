import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { createCanvas } from 'canvas';

export interface BarcodeOptions {
  width?: number;
  height?: number;
  includeText?: boolean;
  textSize?: number;
  backgroundColor?: string;
  barColor?: string;
}

export interface GeneratedBarcode {
  dataUrl: string;
  buffer: Buffer;
  format: string;
}

// Generate EAN-13 barcode
export const generateEAN13Barcode = async (
  value: string,
  options: BarcodeOptions = {}
): Promise<GeneratedBarcode> => {
  const sanitized = sanitizeEAN13(value);

  if (!validateEAN13(sanitized)) {
    throw new Error(`Invalid EAN-13 barcode value: ${value}`);
  }

  const buffer = await bwipjs.toBuffer({
    bcid: 'ean13',
    text: sanitized,
    scale: 3,
    height: options.height || 20,
    width: options.width || 50,
    includetext: options.includeText !== false,
    textxalign: 'center',
    textyoffset: 2,
    backgroundcolor: (options.backgroundColor || 'ffffff').replace('#', ''),
    barcolor: (options.barColor || '000000').replace('#', ''),
  });

  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

  return {
    dataUrl,
    buffer,
    format: 'EAN-13',
  };
};

// Generate QR Code
export const generateQRCode = async (
  data: string | Record<string, unknown>,
  options: BarcodeOptions = {}
): Promise<GeneratedBarcode> => {
  const text = typeof data === 'string' ? data : JSON.stringify(data);

  const qrOptions: QRCode.QRCodeToBufferOptions = {
    type: 'png',
    width: options.width || 200,
    margin: 2,
    color: {
      dark: options.barColor || '#000000',
      light: options.backgroundColor || '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  };

  const buffer = await QRCode.toBuffer(text, qrOptions);
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

  return {
    dataUrl,
    buffer,
    format: 'QR',
  };
};

// Generate Code128 barcode (for internal use)
export const generateCode128Barcode = async (
  value: string,
  options: BarcodeOptions = {}
): Promise<GeneratedBarcode> => {
  const buffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text: value,
    scale: 3,
    height: options.height || 15,
    includetext: options.includeText !== false,
    textxalign: 'center',
    backgroundcolor: (options.backgroundColor || 'ffffff').replace('#', ''),
    barcolor: (options.barColor || '000000').replace('#', ''),
  });

  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

  return {
    dataUrl,
    buffer,
    format: 'Code128',
  };
};

// Validate EAN-13 barcode
export const validateEAN13 = (barcode: string): boolean => {
  const sanitized = sanitizeEAN13(barcode);

  if (!/^\d{13}$/.test(sanitized)) return false;

  const digits = sanitized.split('').map(Number);
  const checkDigit = digits[12];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
};

// Calculate EAN-13 check digit
export const calculateEAN13CheckDigit = (first12Digits: string): number => {
  if (!/^\d{12}$/.test(first12Digits)) {
    throw new Error('EAN-13 prefix must be exactly 12 digits.');
  }

  const digits = first12Digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  return (10 - (sum % 10)) % 10;
};

// Generate a valid EAN-13 from 12-digit prefix
export const generateEAN13FromPrefix = (prefix12: string): string => {
  const check = calculateEAN13CheckDigit(prefix12);
  return `${prefix12}${check}`;
};

// Generate unique medicine barcode
export const generateMedicineBarcode = (pharmacyCode: string, medicineId: number): string => {
  // Format: 890 (India) + 4-digit pharmacy + 5-digit medicine + check
  const pharmacyPart = pharmacyCode.slice(0, 4).padStart(4, '0');
  const medicinePart = String(medicineId).slice(0, 5).padStart(5, '0');
  const prefix12 = `890${pharmacyPart}${medicinePart}`;
  return generateEAN13FromPrefix(prefix12);
};

const sanitizeEAN13 = (barcode: string): string => {
  return barcode.replace(/[^\d]/g, '').trim();
};

// Validate Code128
export const validateCode128 = (value: string): boolean => {
  return value.length > 0 && value.length <= 80 && /^[\x20-\x7E]+$/.test(value);
};

// Parse QR code data for medicine
export const parseMedicineQR = (qrData: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(qrData);
  } catch {
    return null;
  }
};
